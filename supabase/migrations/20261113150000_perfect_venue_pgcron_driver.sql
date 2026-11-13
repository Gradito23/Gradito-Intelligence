-- Perfect Venue sync: self-driving pg_cron + pg_net tick driver
-- One-time after migrate: vault.create_secret for pv_edge_url and pv_cron_secret (see docs/Perfect-Venue-Cron-Setup.md)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('pv-sync-tick');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('pv-sync-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'pv-sync-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pv_edge_url' LIMIT 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pv_cron_secret' LIMIT 1
      )
    ),
    body := jsonb_build_object('action', 'sync_events_tick'),
    timeout_milliseconds := 28000
  )
  WHERE EXISTS (
    SELECT 1
    FROM public.integration_perfect_venue_connections
    WHERE id = 1 AND sync_checkpoint IS NOT NULL
  );
  $$
);

SELECT cron.schedule(
  'pv-sync-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pv_edge_url' LIMIT 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pv_cron_secret' LIMIT 1
      )
    ),
    body := jsonb_build_object('action', 'sync_events_scheduled'),
    timeout_milliseconds := 28000
  )
  WHERE EXISTS (
    SELECT 1
    FROM public.integration_perfect_venue_connections
    WHERE id = 1
      AND connected = true
  );
  $$
);
