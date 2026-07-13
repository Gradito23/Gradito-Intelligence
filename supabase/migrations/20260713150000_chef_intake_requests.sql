-- Chef intake requests: public form submissions pending ops approve/reject

CREATE TABLE public.chef_intake_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  mobile text,
  photo_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  chef_id uuid REFERENCES public.chefs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_intake_requests_status ON public.chef_intake_requests(status);
CREATE INDEX idx_chef_intake_requests_created_at ON public.chef_intake_requests(created_at DESC);

CREATE TRIGGER set_chef_intake_requests_updated_at
  BEFORE UPDATE ON public.chef_intake_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chef_intake_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_intake_requests_auth_all ON public.chef_intake_requests
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY chef_intake_requests_anon_insert ON public.chef_intake_requests
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- Seed intake permissions for system roles
INSERT INTO public.role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM public.app_roles r
CROSS JOIN (
  VALUES
    ('intake', 'read'),
    ('intake', 'write')
) AS p(resource, action)
WHERE r.name IN ('admin', 'user')
ON CONFLICT (role_id, resource, action) DO NOTHING;
