-- Per-field user overrides: Perfect Venue sync skips locked CRM columns

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS pv_field_locks jsonb NOT NULL DEFAULT '{}'::jsonb;