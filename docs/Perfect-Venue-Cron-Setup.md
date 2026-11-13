# Perfect Venue — automated sync (pg_cron + pg_net)

Perfect Venue sync runs in **one ~20s chunk per edge invocation**. A **pg_cron** job calls the edge function every minute while a checkpoint exists; a **daily** job starts incremental sync when idle.

## Prerequisites

1. Migrations through `20261113150000_perfect_venue_pgcron_driver.sql` (`pg_cron`, `pg_net`, scheduled jobs).
2. Edge function deployed: `integration-perfect-venue`.
3. Edge secret: `PERFECT_VENUE_CRON_SECRET` (same value stored in Vault; see below).
4. Perfect Venue OAuth connected.

## One-time: Vault secrets for cron HTTP calls

After applying the migration, run in the **SQL editor** (replace values):

```sql
SELECT vault.create_secret(
  'https://enftlfmjakfcgaapzesx.supabase.co/functions/v1/integration-perfect-venue',
  'pv_edge_url',
  'Perfect Venue integration edge function URL'
);

SELECT vault.create_secret(
  '<PERFECT_VENUE_CRON_SECRET>',
  'pv_cron_secret',
  'Bearer token for integration-perfect-venue cron actions'
);
```

`PERFECT_VENUE_CRON_SECRET` must match the edge function env var used for `sync_events_tick` / `sync_events_scheduled` auth.

To rotate: `vault.update_secret` on the existing row (Dashboard → Integrations → Vault or SQL).

## What the migration schedules

| Job name        | Schedule   | Behavior |
|-----------------|------------|----------|
| `pv-sync-tick`  | `* * * * *` | POST `{ "action": "sync_events_tick" }` **only** when `sync_checkpoint` is set |
| `pv-sync-daily` | `0 6 * * *` | POST `{ "action": "sync_events_scheduled" }` when connected and no tick needed at start |

Tick is a no-op (no HTTP) when there is no in-flight checkpoint, so idle cost is minimal.

## Manual runs (admin UI)

- **Events → Sync Perfect Venue** starts a run, processes one chunk, and returns immediately.
- **Events → Sync history** shows live progress (venue X/Y, fetched counts) while `sync_in_progress` is true.
- pg_cron drains the checkpoint until `success` or `failed`.

## Reset stuck runs (incidents only)

```sql
UPDATE public.perfect_venue_sync_runs
SET status = 'failed',
    finished_at = now(),
    error_message = 'Manual reset'
WHERE status = 'running';

UPDATE public.integration_perfect_venue_connections
SET sync_checkpoint = NULL
WHERE id = 1;
```

Stale runs with no heartbeat for **3 minutes** are also failed automatically on the next sync or tick.

## Verify

- Manual sync returns in seconds with toast “Sync started”.
- **Sync history**: `running` with rising In/Up, then `success`.
- **Database → Cron** (or `select * from cron.job where jobname like 'pv-%'`): jobs present and active.
- Edge logs: `sync_events_tick` **200** responses about once per minute **while** a job is running; no **546**.

## Deploy

```bash
npx supabase db push
npx supabase functions deploy integration-perfect-venue --project-ref enftlfmjakfcgaapzesx --yes
```

Then run the Vault `create_secret` statements if this is a new environment.
