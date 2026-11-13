# Perfect Venue — sync (cron + tick)

Perfect Venue sync runs in **one chunk per edge invocation**. Manual sync starts the job; **`sync_events_tick`** (every 1–2 minutes) drains the checkpoint until complete.

## Prerequisites

1. Migrations through `20261113140000_perfect_venue_chunked_sync.sql` (`sync_checkpoint`, `heartbeat_at`).
2. Edge function deployed: `integration-perfect-venue`.
3. Supabase secret: `PERFECT_VENUE_CRON_SECRET` (random string).
4. Perfect Venue OAuth connected.

## Reset stuck runs (run once before cutover or after incidents)

```sql
UPDATE public.perfect_venue_sync_runs
SET status = 'failed',
    finished_at = now(),
    error_message = 'Reset before cron-tick architecture'
WHERE status = 'running';

UPDATE public.integration_perfect_venue_connections
SET sync_checkpoint = NULL
WHERE id = 1;
```

## Schedule A — daily start (incremental)

Starts a sync **only when no checkpoint is in progress** (one chunk).

1. **Project → Edge Functions → `integration-perfect-venue` → Schedules** (or Cron).
2. Cron: `0 6 * * *` (example: 06:00 UTC daily).
3. `POST` `https://<project-ref>.supabase.co/functions/v1/integration-perfect-venue`
4. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer <PERFECT_VENUE_CRON_SECRET>`
5. Body:

```json
{ "action": "sync_events_scheduled" }
```

## Schedule B — tick every 2 minutes (required)

Processes **one chunk** of any in-flight checkpoint; no-op if idle.

1. Cron: `*/2 * * * *`
2. Same URL and `Authorization` header.
3. Body:

```json
{ "action": "sync_events_tick" }
```

Without Schedule B, manual sync may stay `running` until you run another sync or clear SQL.

## Manual runs (admin UI)

- **Events → Sync Perfect Venue** or **Integrations → Perfect Venue** — starts sync + up to 3 immediate chunks; remaining work is completed by **Schedule B**.
- Admins can also invoke `{ "action": "sync_events_tick" }` via the edge function (admin JWT) to nudge once.

## Verify

- **Events → Sync history**: `running` with rising In/Up, then `success` with Finished (after ticks).
- Edge logs: short **POST 200** for `sync_events_tick` every ~2 min while a job runs; no **546**.
- **Events** filter **Source = Perfect Venue**.

## Stale runs (automatic + SQL)

Sync start expires runs with **no heartbeat for 5 minutes** and clears `sync_checkpoint`.

Optional **pg_cron** (if enabled) every 10 minutes:

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

## Deploy

```bash
npx supabase functions deploy integration-perfect-venue --project-ref <project-ref> --yes
```
