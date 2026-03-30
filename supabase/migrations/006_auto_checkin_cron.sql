-- Enable pg_net for HTTP calls from pg_cron
create extension if not exists "pg_net" with schema extensions;

-- Schedule auto-checkin to run every 5 minutes
-- It calls the auto-checkin edge function which fetches trophies
-- for any player who hasn't checked in within 10 min of deadline
select cron.schedule(
  'auto-checkin',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-checkin',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
