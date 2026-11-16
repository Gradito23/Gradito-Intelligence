-- Chef SMS invite pipeline (separate from live chefs roster)

CREATE TABLE public.chef_invite_prospects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  mobile text,
  phone text,
  status text NOT NULL DEFAULT 'not_invited'
    CHECK (status IN ('not_invited', 'invited', 'joined')),
  intake_invite_last_sent_at timestamptz,
  intake_submitted_at timestamptz,
  chef_id uuid REFERENCES public.chefs(id) ON DELETE SET NULL,
  intake_request_id uuid,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_invite_prospects_status ON public.chef_invite_prospects(status);
CREATE INDEX idx_chef_invite_prospects_created_at ON public.chef_invite_prospects(created_at DESC);
CREATE INDEX idx_chef_invite_prospects_chef_id ON public.chef_invite_prospects(chef_id) WHERE chef_id IS NOT NULL;
CREATE INDEX idx_chef_invite_prospects_email_lower ON public.chef_invite_prospects(lower(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX idx_chef_invite_prospects_open_email
  ON public.chef_invite_prospects (lower(email))
  WHERE archived = false AND status <> 'joined' AND email IS NOT NULL;

CREATE TRIGGER set_chef_invite_prospects_updated_at
  BEFORE UPDATE ON public.chef_invite_prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chef_invite_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_invite_prospects_auth_all ON public.chef_invite_prospects
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.chef_intake_requests
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.chef_invite_prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chef_intake_requests_prospect_id
  ON public.chef_intake_requests(prospect_id) WHERE prospect_id IS NOT NULL;

ALTER TABLE public.quo_communication_events
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.chef_invite_prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quo_communication_events_prospect
  ON public.quo_communication_events(prospect_id, occurred_at DESC)
  WHERE prospect_id IS NOT NULL;

ALTER TABLE public.chef_invite_prospects
  ADD CONSTRAINT chef_invite_prospects_intake_request_id_fkey
  FOREIGN KEY (intake_request_id) REFERENCES public.chef_intake_requests(id) ON DELETE SET NULL;