ALTER TABLE public.match_runs
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS match_source text,
  ADD COLUMN IF NOT EXISTS staffing_context jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_match_runs_event_id_created
  ON public.match_runs(event_id, created_at DESC)
  WHERE event_id IS NOT NULL;