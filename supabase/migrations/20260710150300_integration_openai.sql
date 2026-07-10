-- OpenAI integration settings (singleton)

CREATE TABLE public.integration_openai_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  default_model_id text,
  synced_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at timestamptz,
  last_sync_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_integration_openai_settings_updated_at
  BEFORE UPDATE ON public.integration_openai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.integration_openai_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.integration_openai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_openai_settings_admin_all ON public.integration_openai_settings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
