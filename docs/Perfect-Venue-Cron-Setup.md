# Perfect Venue — daily incremental sync (cron)

Gradito syncs Perfect Venue events with an edge function action `sync_events_scheduled`. Schedule it once per day in Supabase.

## Prerequisites

1. Migrations applied (`integration_perfect_venue_*`, `perfect_venue_sync_runs`).
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

## Verify

- **Admin → Events → Sync history** (admins only): runs with `trigger: cron`.
- **Admin → Integrations → Perfect Venue**: `last_sync_at` and error fields update.

## Manual runs

Use **Sync Perfect Venue** on the Events page (admins, incremental — same sync logic as cron, logged as `manual` in Sync history), **Sync now (incremental)** or **Full sync** on the Perfect Venue integration page (`trigger: manual` in sync history).
