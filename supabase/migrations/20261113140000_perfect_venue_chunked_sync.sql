-- Chunked / resumable Perfect Venue sync: checkpoint + run heartbeats

ALTER TABLE public.integration_perfect_venue_connections
  ADD COLUMN IF NOT EXISTS sync_checkpoint jsonb;

ALTER TABLE public.perfect_venue_sync_runs
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_perfect_venue_sync_runs_heartbeat
  ON public.perfect_venue_sync_runs (heartbeat_at DESC)
  WHERE status = 'running';
