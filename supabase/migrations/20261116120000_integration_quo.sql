-- Quo integration: admin API key storage + chef-centric communication ledger

CREATE TABLE public.integration_quo_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key text NOT NULL DEFAULT '',
  encrypted_api_key text,
  api_key_iv text,
  dek_version int,
  enabled boolean NOT NULL DEFAULT false,
  last_test_at timestamptz,
  last_test_summary text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_integration_quo_settings_updated_at
  BEFORE UPDATE ON public.integration_quo_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.integration_quo_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.integration_quo_settings ENABLE ROW LEVEL SECURITY;
-- No authenticated policies: service role / edge functions only.

CREATE TABLE public.quo_communication_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chef_id uuid REFERENCES public.chefs(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'call_transcript')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  quo_conversation_id text,
  quo_message_id text,
  quo_call_id text,
  counterparty_phone_e164 text,
  body_text text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_delivery_id text UNIQUE,
  sent_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quo_communication_events_chef_occurred
  ON public.quo_communication_events (chef_id, occurred_at DESC);

CREATE INDEX idx_quo_communication_events_conversation
  ON public.quo_communication_events (quo_conversation_id, occurred_at DESC)
  WHERE quo_conversation_id IS NOT NULL;

CREATE INDEX idx_quo_communication_events_counterparty
  ON public.quo_communication_events (counterparty_phone_e164)
  WHERE counterparty_phone_e164 IS NOT NULL;

CREATE INDEX idx_quo_communication_events_unmatched_chef
  ON public.quo_communication_events (created_at DESC)
  WHERE chef_id IS NULL;

ALTER TABLE public.quo_communication_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY quo_communication_events_auth_select ON public.quo_communication_events
  FOR SELECT TO authenticated
  USING (true);