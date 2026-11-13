-- Perfect Venue enhancements: event source, OAuth credentials, sync run history

ALTER TABLE public.integration_perfect_venue_connections
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS encrypted_client_secret text,
  ADD COLUMN IF NOT EXISTS client_secret_iv text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_source text NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS public.perfect_venue_sync_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  sync_trigger text NOT NULL CHECK (sync_trigger IN ('manual', 'cron')),
  mode text NOT NULL CHECK (mode IN ('full', 'incremental')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  inserted int NOT NULL DEFAULT 0,
  updated int NOT NULL DEFAULT 0,
  error_message text,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_perfect_venue_sync_runs_started_at
  ON public.perfect_venue_sync_runs (started_at DESC);

ALTER TABLE public.perfect_venue_sync_runs ENABLE ROW LEVEL SECURITY;
-- No policies: read via edge function (service role) only.
