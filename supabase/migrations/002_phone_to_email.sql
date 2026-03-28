-- Migrate profiles from phone to email

-- Add email column
alter table profiles add column if not exists email text;

-- Copy phone data to email (if any exists) — skip if fresh
update profiles set email = phone where email is null and phone is not null;

-- Drop the phone unique constraint and column
alter table profiles drop constraint if exists profiles_phone_key;
alter table profiles drop column if exists phone;

-- Make email unique and not null
alter table profiles alter column email set not null;
alter table profiles add constraint profiles_email_key unique (email);

-- Update the auto-create profile trigger to use email
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Update verify_passcode to use email instead of phone
create or replace function verify_passcode(p_email text, p_passcode text)
returns json
language plpgsql security definer
as $$
declare
  v_profile profiles%rowtype;
begin
  select * into v_profile
  from profiles
  where email = p_email;

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
