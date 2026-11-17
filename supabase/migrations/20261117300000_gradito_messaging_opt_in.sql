-- Gradito messaging opt-in (SMS + email) and prospect city

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS gradito_messaging_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS gradito_messaging_opt_out_at timestamptz;

ALTER TABLE public.chef_invite_prospects
  ADD COLUMN IF NOT EXISTS gradito_messaging_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS gradito_messaging_opt_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS city text;