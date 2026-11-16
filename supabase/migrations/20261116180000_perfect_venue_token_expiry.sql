-- Perfect Venue OAuth: track access token expiry for proactive refresh

ALTER TABLE public.integration_perfect_venue_connections
  ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamptz;