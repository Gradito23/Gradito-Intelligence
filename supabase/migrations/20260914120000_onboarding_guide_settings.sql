-- Singleton Chef & FOH Onboarding Guide settings (admin-managed, public read)

CREATE TABLE public.onboarding_guide_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
    CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid),
  title text NOT NULL DEFAULT 'Chef & FOH Onboarding Guide',
  url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_onboarding_guide_settings_updated_at
  BEFORE UPDATE ON public.onboarding_guide_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.onboarding_guide_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_guide_settings_select ON public.onboarding_guide_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY onboarding_guide_settings_update ON public.onboarding_guide_settings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.onboarding_guide_settings TO anon, authenticated;
GRANT UPDATE ON public.onboarding_guide_settings TO authenticated;

INSERT INTO public.onboarding_guide_settings (id, title, url, enabled)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Chef & FOH Onboarding Guide',
  'https://drive.google.com/file/d/1iauCFRdElr54nlzOPmnoOWR1DO7SPoOD/view?usp=sharing',
  true
);
