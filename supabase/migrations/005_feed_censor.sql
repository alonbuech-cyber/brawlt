-- Add censored flag to feed posts
alter table feed_posts add column censored boolean not null default false;

-- Admins can update (censor) feed posts
create policy "Admins can censor feed posts"
  on feed_posts for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
