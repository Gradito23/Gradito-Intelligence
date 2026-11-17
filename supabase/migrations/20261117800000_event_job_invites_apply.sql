-- Job invitations to matched chefs + public job applications

ALTER TABLE public.chef_invite_message_settings
  ADD COLUMN IF NOT EXISTS job_sms_template text,
  ADD COLUMN IF NOT EXISTS job_email_subject text,
  ADD COLUMN IF NOT EXISTS job_email_html text;

UPDATE public.chef_invite_message_settings
SET
  job_sms_template = COALESCE(
    job_sms_template,
    $sms$Gradito: Hi {{first_name}}, new opportunity in {{city}} on {{event_date}}! View details & let us know if you're available: {{job_url}} Reply STOP to opt out.$sms$
  ),
  job_email_subject = COALESCE(
    job_email_subject,
    $sub$Gradito chef opportunity in {{city}}$sub$
  ),
  job_email_html = COALESCE(
    job_email_html,
    $html$<p>Hi {{first_name}},</p>
<p>We have a new private dining opportunity in <strong>{{city}}</strong> on <strong>{{event_date}}</strong>.</p>
<p><a href="{{job_url}}" style="display:inline-block;background:#c9a227;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">View opportunity</a></p>
<p>Let us know if you are available.</p>
<p>— Gradito Team</p>$html$
  )
WHERE id = 1;

ALTER TABLE public.chef_invite_message_settings
  ALTER COLUMN job_sms_template SET NOT NULL,
  ALTER COLUMN job_email_subject SET NOT NULL,
  ALTER COLUMN job_email_html SET NOT NULL;

CREATE TABLE public.event_job_chef_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_job_page_id uuid NOT NULL REFERENCES public.event_job_pages(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  sms_status text NOT NULL DEFAULT 'skipped'
  CHECK (sms_status IN ('skipped', 'sent', 'failed')),
  email_status text NOT NULL DEFAULT 'skipped'
    CHECK (email_status IN ('skipped', 'sent', 'failed')),
  sms_sent_at timestamptz,
  email_sent_at timestamptz,
  sms_error text,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_job_page_id, chef_id)
);

CREATE INDEX idx_event_job_chef_invitations_job_page
  ON public.event_job_chef_invitations(event_job_page_id);
CREATE INDEX idx_event_job_chef_invitations_event
  ON public.event_job_chef_invitations(event_id);
CREATE INDEX idx_event_job_chef_invitations_chef
  ON public.event_job_chef_invitations(chef_id);

CREATE TRIGGER set_event_job_chef_invitations_updated_at
  BEFORE UPDATE ON public.event_job_chef_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_job_chef_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_job_chef_invitations_auth_select ON public.event_job_chef_invitations
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.event_job_chef_invitations TO authenticated;

CREATE TABLE public.event_job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_job_page_id uuid NOT NULL REFERENCES public.event_job_pages(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  intake_attestation boolean NOT NULL DEFAULT false,
  intake_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ignored', 'reviewed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_job_applications_job_page
  ON public.event_job_applications(event_job_page_id);
CREATE INDEX idx_event_job_applications_status
  ON public.event_job_applications(status);
CREATE INDEX idx_event_job_applications_created
  ON public.event_job_applications(created_at DESC);

ALTER TABLE public.event_job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_job_applications_auth_select ON public.event_job_applications
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.event_job_applications TO authenticated;