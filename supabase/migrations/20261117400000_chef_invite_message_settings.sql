-- Singleton chef intake invite message templates (shared across browsers/environments)

CREATE TABLE public.chef_invite_message_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sms_template text NOT NULL,
  email_subject text NOT NULL,
  email_body text NOT NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_chef_invite_message_settings_updated_at
  BEFORE UPDATE ON public.chef_invite_message_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chef_invite_message_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_invite_message_settings_select ON public.chef_invite_message_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY chef_invite_message_settings_admin_update ON public.chef_invite_message_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.chef_invite_message_settings TO authenticated;
GRANT UPDATE ON public.chef_invite_message_settings TO authenticated;

INSERT INTO public.chef_invite_message_settings (id, sms_template, email_subject, email_body)
VALUES (
  1,
  $sms$Gradito: Hi {{first_name}}, it's Sean! We'd love to have you on our private chef roster for paid events in {{city}}: {{intake_link}} Reply STOP to opt out.$sms$,
  $sub$You're invited to join Gradito$sub$,
  $body$Gradito: Hi {{first_name}}, it's Sean! We'd love to have you on our private chef roster for paid events in {{city}}: {{intake_link}}$body$
);