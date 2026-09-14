-- Onboarding guide email deliveries (sent / opened / clicked)

CREATE TABLE public.onboarding_guide_deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  guide_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX onboarding_guide_deliveries_sent_at_idx
  ON public.onboarding_guide_deliveries (sent_at DESC);
CREATE INDEX onboarding_guide_deliveries_email_idx
  ON public.onboarding_guide_deliveries (recipient_email);

CREATE TRIGGER set_onboarding_guide_deliveries_updated_at
  BEFORE UPDATE ON public.onboarding_guide_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.onboarding_guide_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_guide_deliveries_select ON public.onboarding_guide_deliveries
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.onboarding_guide_deliveries TO authenticated;
