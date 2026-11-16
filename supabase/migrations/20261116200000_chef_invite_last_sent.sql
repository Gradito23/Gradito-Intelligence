-- Track mass intake invite SMS (Quo) per chef

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS intake_invite_last_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_chefs_intake_invite_last_sent_at
  ON public.chefs (intake_invite_last_sent_at DESC NULLS LAST)
  WHERE archived = false;