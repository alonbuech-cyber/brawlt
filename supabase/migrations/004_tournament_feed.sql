-- Tournament feed: per-tournament posts (text + images)
create table if not exists feed_posts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  content text,
  image_url text,
  post_type text not null default 'user' check (post_type in ('user', 'checkin')),
  created_at timestamptz default now()
);

create index idx_feed_posts_tournament on feed_posts(tournament_id);
create index idx_feed_posts_created on feed_posts(tournament_id, created_at desc);

alter table feed_posts enable row level security;

-- Only tournament participants can read feed
create policy "Participants can read feed"
  on feed_posts for select
  using (
    exists (
      select 1 from participants p
      where p.tournament_id = feed_posts.tournament_id
      and p.profile_id = auth.uid()
    )
  );

-- Only active tournament participants can post
create policy "Participants can post to feed"
  on feed_posts for insert
  with check (
    auth.uid() = profile_id and
    exists (
      select 1 from participants p
      where p.tournament_id = feed_posts.tournament_id
      and p.profile_id = auth.uid()
      and not p.is_eliminated
      and not p.disqualified
    )
  );

-- Enable realtime for feed_posts
alter publication supabase_realtime add table feed_posts;
