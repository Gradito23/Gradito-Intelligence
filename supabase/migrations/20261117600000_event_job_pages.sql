-- Public chef job pages generated from Confirmed events

CREATE TABLE public.event_job_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'unpublished')),
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generation_error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_job_pages_status ON public.event_job_pages(status);
CREATE INDEX idx_event_job_pages_published_at ON public.event_job_pages(published_at DESC)
  WHERE status = 'published';

CREATE TRIGGER set_event_job_pages_updated_at
  BEFORE UPDATE ON public.event_job_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_job_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_job_pages_anon_select_published ON public.event_job_pages
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY event_job_pages_auth_select ON public.event_job_pages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY event_job_pages_admin_write ON public.event_job_pages
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());