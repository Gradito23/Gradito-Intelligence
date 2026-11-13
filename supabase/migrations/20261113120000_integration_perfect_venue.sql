-- Perfect Venue OAuth connection (singleton) + event link columns

CREATE TABLE public.integration_perfect_venue_connections (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  connected boolean NOT NULL DEFAULT false,
  connected_at timestamptz,
  scopes text,
  venue_ids text[] NOT NULL DEFAULT '{}',
  venues jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_full_sync_at timestamptz,
  last_synced_updated_at timestamptz,
  last_sync_at timestamptz,
  last_sync_error text,
  last_sync_stats jsonb,
  oauth_state text,
  oauth_state_expires_at timestamptz,
  encrypted_access_token text,
  access_token_iv text,
  encrypted_refresh_token text,
  refresh_token_iv text,
  dek_version int,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_integration_perfect_venue_connections_updated_at
  BEFORE UPDATE ON public.integration_perfect_venue_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.integration_perfect_venue_connections (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.integration_perfect_venue_connections ENABLE ROW LEVEL SECURITY;
-- Tokens and secrets: edge functions only (service role).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS pv_venue_id text,
  ADD COLUMN IF NOT EXISTS pv_metadata jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS events_perfect_venue_id_key
  ON public.events (perfect_venue_id)
  WHERE perfect_venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_pv_venue_id
  ON public.events (pv_venue_id)
  WHERE pv_venue_id IS NOT NULL;
