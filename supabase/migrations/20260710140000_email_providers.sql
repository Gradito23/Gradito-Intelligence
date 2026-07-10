-- Dual email providers: Resend API + Custom SMTP + email logs

CREATE TABLE public.email_provider_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_provider text NOT NULL DEFAULT 'resend' CHECK (active_provider IN ('resend', 'custom_smtp')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.integration_resend_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key text NOT NULL DEFAULT '',
  from_email text,
  from_name text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.custom_smtp_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  smtp_host text NOT NULL,
  smtp_port int NOT NULL DEFAULT 587,
  encryption text NOT NULL DEFAULT 'tls' CHECK (encryption IN ('tls', 'ssl')),
  username text NOT NULL,
  password text NOT NULL DEFAULT '',
  from_name text,
  from_email text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_test_status text CHECK (last_test_status IS NULL OR last_test_status IN ('success', 'failed')),
  last_test_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type text NOT NULL DEFAULT 'test',
  recipient text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('resend', 'custom_smtp')),
  custom_smtp_config_id uuid REFERENCES public.custom_smtp_configs(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_logs_created_at_idx ON public.email_logs (created_at DESC);
CREATE INDEX email_logs_provider_idx ON public.email_logs (provider);

CREATE TRIGGER set_email_provider_settings_updated_at
  BEFORE UPDATE ON public.email_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_integration_resend_settings_updated_at
  BEFORE UPDATE ON public.integration_resend_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_custom_smtp_configs_updated_at
  BEFORE UPDATE ON public.custom_smtp_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.email_provider_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.integration_resend_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Migrate existing Resend data from integration_smtp_settings if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'integration_smtp_settings'
  ) THEN
    UPDATE public.integration_resend_settings r
    SET
      api_key = s.api_key,
      from_email = s.from_email,
      from_name = s.from_name,
      enabled = s.enabled,
      updated_at = s.updated_at,
      updated_by = s.updated_by
    FROM public.integration_smtp_settings s
    WHERE r.id = 1 AND s.id = 1;

    DROP TABLE public.integration_smtp_settings;
  END IF;
END $$;

ALTER TABLE public.email_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_resend_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_smtp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
