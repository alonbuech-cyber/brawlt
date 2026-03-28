-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique not null,
  display_name text,
  passcode_hash text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Tournaments
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bracket_name text not null check (bracket_name in ('Wood','Bronze','Silver','Gold','Prestige1','Prestige2')),
  trophy_min integer not null,
  trophy_max integer,
  brawler_lock text,
  starts_at timestamptz not null,
  daily_deadline_hour integer not null check (daily_deadline_hour between 0 and 23),
  max_participants integer,
  duration_days integer default 7,
  invite_code text unique not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Participants
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  brawler_name text not null,
  baseline_trophies integer,
  is_eliminated boolean default false,
  disqualified boolean default false,
  joined_at timestamptz default now(),
  unique(tournament_id, profile_id)
);

-- Submissions
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  day_number integer not null,
  image_url text not null,
  trophy_count integer,
  brawler_detected text,
  ocr_status text default 'pending' check (ocr_status in ('pending','approved','rejected','ocr_failed')),
  ocr_confidence text check (ocr_confidence in ('high','low')),
  rejection_reason text,
  resubmit_allowed_until timestamptz,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  unique(participant_id, day_number)
);

-- Indexes
create index if not exists idx_participants_tournament on participants(tournament_id);
create index if not exists idx_participants_profile on participants(profile_id);
create index if not exists idx_submissions_tournament on submissions(tournament_id);
create index if not exists idx_submissions_participant on submissions(participant_id);
create index if not exists idx_submissions_status on submissions(ocr_status);
create index if not exists idx_tournaments_invite on tournaments(invite_code);

-- RLS
alter table profiles enable row level security;
alter table tournaments enable row level security;
alter table participants enable row level security;
alter table submissions enable row level security;

-- Profiles RLS
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Anyone can read profiles display name"
  on profiles for select
  using (true);

-- Tournaments RLS
create policy "Anyone can read tournaments"
  on tournaments for select
  using (true);

create policy "Admins can create tournaments"
  on tournaments for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update their tournaments"
  on tournaments for update
  using (created_by = auth.uid());

-- Participants RLS
create policy "Anyone can read participants"
  on participants for select
  using (true);

create policy "Authenticated users can join tournaments"
  on participants for insert
  with check (auth.uid() = profile_id);

create policy "Admins can update participants"
  on participants for update
  using (
    exists (
      select 1 from tournaments t
      join profiles p on p.id = auth.uid()
      where t.id = tournament_id and (t.created_by = auth.uid() or p.is_admin = true)
    )
  );

-- Submissions RLS
create policy "Anyone can read submissions"
  on submissions for select
  using (true);

create policy "Participants can insert submissions"
  on submissions for insert
  with check (
    exists (
      select 1 from participants p
      where p.id = participant_id and p.profile_id = auth.uid()
    )
  );

create policy "Admins and service role can update submissions"
  on submissions for update
  using (
    exists (
      select 1 from profiles where id = auth.uid() and is_admin = true
    )
  );

-- Allow service role to update submissions (for edge function)
create policy "Service role can update submissions"
  on submissions for update
  using (auth.role() = 'service_role');

-- RPC: Set passcode (hashes with bcrypt)
create or replace function set_passcode(new_passcode text)
returns void
language plpgsql security definer
as $$
begin
  update profiles
  set passcode_hash = crypt(new_passcode, gen_salt('bf'))
  where id = auth.uid();
end;
$$;

-- RPC: Verify passcode
create or replace function verify_passcode(p_phone text, p_passcode text)
returns json
language plpgsql security definer
as $$
declare
  v_profile profiles%rowtype;
begin
  select * into v_profile
  from profiles
  where phone = p_phone;

  if not found then
    return json_build_object('valid', false);
  end if;

  if v_profile.passcode_hash is null then
    return json_build_object('valid', false);
  end if;

  if v_profile.passcode_hash = crypt(p_passcode, v_profile.passcode_hash) then
    return json_build_object('valid', true, 'user_id', v_profile.id, 'profile', row_to_json(v_profile));
  else
    return json_build_object('valid', false);
  end if;
end;
$$;

-- Auto-create profile on auth.users insert
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- Storage RLS: users can upload to their own participant path
create policy "Participants can upload screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots' and
    auth.role() = 'authenticated'
  );

create policy "Authenticated users can read screenshots"
  on storage.objects for select
  using (
    bucket_id = 'screenshots' and
    auth.role() = 'authenticated'
  );

-- pg_cron job: Deadline fallback — runs every hour at :05
-- Admin should set this to match their tournament deadline hours
-- This checks all tournaments whose deadline just passed

create or replace function process_deadline_fallback()
returns void
language plpgsql security definer
as $$
declare
  v_tournament tournaments%rowtype;
  v_current_day integer;
  v_deadline timestamptz;
  v_next_deadline timestamptz;
begin
  for v_tournament in
    select * from tournaments
    where starts_at <= now()
    and starts_at + (duration_days * interval '1 day') >= now()
  loop
    -- Calculate current day
    v_current_day := least(
      floor(extract(epoch from (now() - v_tournament.starts_at)) / 86400) + 1,
      v_tournament.duration_days
    )::integer;

    -- Calculate today's deadline
    v_deadline := date_trunc('day', now() at time zone 'UTC') + (v_tournament.daily_deadline_hour * interval '1 hour');

    -- Only process if we're within 10 minutes after deadline
    if now() > v_deadline and now() < v_deadline + interval '10 minutes' then
      v_next_deadline := v_deadline + interval '1 day';

      -- 1. ELIMINATION: Eliminate players with NO submission for this day
      update participants p
      set is_eliminated = true
      where p.tournament_id = v_tournament.id
        and p.is_eliminated = false
        and p.disqualified = false
        and not exists (
          select 1 from submissions s
          where s.participant_id = p.id
            and s.day_number = v_current_day
        );

      -- 2. PENDING FALLBACK: Auto-approve pending submissions with trophy_count
      update submissions s
      set ocr_status = 'approved',
          reviewed_at = now()
      where s.tournament_id = v_tournament.id
        and s.day_number = v_current_day
        and s.ocr_status = 'pending'
        and s.trophy_count is not null
        and s.submitted_at < v_deadline;

      -- 3. Set resubmit window for pending submissions without trophy_count
      update submissions s
      set resubmit_allowed_until = v_next_deadline
      where s.tournament_id = v_tournament.id
        and s.day_number = v_current_day
        and s.ocr_status = 'pending'
        and s.trophy_count is null
        and s.submitted_at < v_deadline;

      -- 4. Set baseline for Day 1 auto-approved submissions
      update participants p
      set baseline_trophies = s.trophy_count
      from submissions s
      where s.participant_id = p.id
        and s.tournament_id = v_tournament.id
        and s.day_number = 1
        and s.ocr_status = 'approved'
        and p.baseline_trophies is null
        and s.trophy_count is not null;
    end if;
  end loop;
end;
$$;

-- Schedule cron job to run every 5 minutes
select cron.schedule(
  'deadline-fallback',
  '*/5 * * * *',
  $$select process_deadline_fallback()$$
);

-- Enable realtime for submissions
alter publication supabase_realtime add table submissions;
