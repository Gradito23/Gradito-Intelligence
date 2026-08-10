-- Google SSO integration settings (singleton acknowledgment flag)
-- Client ID/Secret live in Supabase Auth; Gradito only stores enabled.

CREATE TABLE IF NOT EXISTS public.integration_google_sso_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_integration_google_sso_settings_updated_at
  BEFORE UPDATE ON public.integration_google_sso_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.integration_google_sso_settings (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.integration_google_sso_settings ENABLE ROW LEVEL SECURITY;

-- Public read: login/register must know if Google SSO is marked enabled (no secrets).
DROP POLICY IF EXISTS integration_google_sso_settings_select_public ON public.integration_google_sso_settings;
CREATE POLICY integration_google_sso_settings_select_public ON public.integration_google_sso_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS integration_google_sso_settings_admin_all ON public.integration_google_sso_settings;
CREATE POLICY integration_google_sso_settings_admin_all ON public.integration_google_sso_settings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Rollback:
-- DROP POLICY IF EXISTS integration_google_sso_settings_admin_all ON public.integration_google_sso_settings;
-- DROP POLICY IF EXISTS integration_google_sso_settings_select_public ON public.integration_google_sso_settings;
-- DROP TRIGGER IF EXISTS set_integration_google_sso_settings_updated_at ON public.integration_google_sso_settings;
-- DROP TABLE IF EXISTS public.integration_google_sso_settings;
