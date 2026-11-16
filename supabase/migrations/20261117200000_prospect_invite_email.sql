-- Prospect intake invite via email + email_logs linkage

ALTER TABLE public.chef_invite_prospects
  ADD COLUMN IF NOT EXISTS intake_invite_email_last_sent_at timestamptz;

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.chef_invite_prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_prospect_created
  ON public.email_logs (prospect_id, created_at DESC)
  WHERE prospect_id IS NOT NULL;