-- Integration SMTP settings (Resend) — singleton row, admin-managed via edge function only

CREATE TABLE public.integration_smtp_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider text NOT NULL DEFAULT 'resend',
  smtp_host text NOT NULL DEFAULT 'smtp.resend.com',
  smtp_port int NOT NULL DEFAULT 465,
  smtp_username text NOT NULL DEFAULT 'resend',
  api_key text NOT NULL DEFAULT '',
  from_email text,
  from_name text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_integration_smtp_settings_updated_at
  BEFORE UPDATE ON public.integration_smtp_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.integration_smtp_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.integration_smtp_settings ENABLE ROW LEVEL SECURITY;

-- No policies: direct client access denied. Edge function uses service role.
