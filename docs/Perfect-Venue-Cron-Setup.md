# Perfect Venue — daily incremental sync (cron)

Gradito syncs Perfect Venue events with an edge function action `sync_events_scheduled`. Schedule it once per day in Supabase.

## Prerequisites

1. Migrations applied through `20261113140000_perfect_venue_chunked_sync.sql` (`sync_checkpoint`, `heartbeat_at` on sync runs).
2. Edge function deployed: `integration-perfect-venue`.
3. Supabase secret: `PERFECT_VENUE_CRON_SECRET` (random string).
4. Perfect Venue OAuth connected; client credentials saved in Admin → Integrations → Perfect Venue.

## Schedule (Supabase Dashboard)

1. **Project → Edge Functions → `integration-perfect-venue` → Schedules** (or Cron).
2. Create a daily job (e.g. `0 6 * * *` UTC).
3. HTTP `POST` to:
   `https://<project-ref>.supabase.co/functions/v1/integration-perfect-venue`
4. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer <PERFECT_VENUE_CRON_SECRET>`
5. Body:

```json
{ "action": "sync_events_scheduled" }
```

The scheduled handler runs **chunked sync until complete** in one cron invocation (multiple internal edge chunks, each under ~45s).

## Verify

- **Admin → Events → Sync history** (admins only): runs with `trigger: cron`; **In/Up** update while `running` via heartbeats; **Finished** when complete.
- **Admin → Integrations → Perfect Venue**: `last_sync_at` and error fields update.

## Manual runs

Use **Sync Perfect Venue** on the Events page (admins, incremental — same sync logic as cron, logged as `manual` in Sync history), **Sync now (incremental)** or **Full sync** on the Perfect Venue integration page (`trigger: manual` in sync history).

The client automatically calls `continue: true` until the run finishes, so one click may trigger several short edge requests.

**Full sync** may take multiple chunks; watch Sync history for rising In/Up counts.

## Stale sync runs (cleanup)

If a row stays `running` with no recent heartbeat (e.g. after HTTP 546), mark it failed in the SQL editor:

```sql
-- Fail runs with no heartbeat in the last 5 minutes (or never heartbeated / old start)
UPDATE public.perfect_venue_sync_runs
SET status = 'failed',
    finished_at = COALESCE(finished_at, now()),
    error_message = COALESCE(
      NULLIF(trim(error_message), ''),
      'Marked failed: stale running (no heartbeat)'
    )
WHERE status = 'running'
  AND COALESCE(heartbeat_at, started_at) < now() - interval '5 minutes';

UPDATE public.integration_perfect_venue_connections
SET sync_checkpoint = NULL
WHERE id = 1;
```

Then run **Incremental** or **Full sync** once from Integrations → Perfect Venue.

New syncs auto-expire stale `running` rows (no heartbeat for **5 minutes**) when the next sync starts. Overlapping syncs are blocked only when another run has a **fresh heartbeat** (last **3 minutes**).

### Optional: pg_cron (Dashboard → Database → Cron)

If `pg_cron` is enabled, schedule the same SQL every 10 minutes to fail abandoned runs without waiting for a manual sync:

```sql
SELECT cron.schedule(
  'perfect-venue-fail-stale-sync-runs',
  '*/10 * * * *',
  $$
  UPDATE public.perfect_venue_sync_runs
  SET status = 'failed',
      finished_at = now(),
      error_message = 'Timed out (scheduled stale cleanup)'
  WHERE status = 'running'
    AND COALESCE(heartbeat_at, started_at) < now() - interval '5 minutes';
  UPDATE public.integration_perfect_venue_connections SET sync_checkpoint = NULL WHERE id = 1;
  $$
);
```

## Deploy edge function

```bash
npx supabase functions deploy integration-perfect-venue --project-ref <project-ref> --yes
```

Apply the chunked-sync migration in **SQL Editor** if `supabase db push` is not used for this project.
