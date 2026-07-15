-- DEK/KEK support for integration secrets (single-tenant).
-- Additive: keeps plaintext api_key/password columns for dual-read during migration.

CREATE TABLE public.app_encryption_keys (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  kek_mode text NOT NULL DEFAULT 'platform' CHECK (kek_mode IN ('platform')),
  encrypted_dek text NOT NULL,
  dek_iv text NOT NULL,
  dek_version int NOT NULL DEFAULT 1,
  algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

ALTER TABLE public.app_encryption_keys ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: service role only.

ALTER TABLE public.integration_openai_settings
  ADD COLUMN IF NOT EXISTS encrypted_api_key text,
  ADD COLUMN IF NOT EXISTS api_key_iv text,
  ADD COLUMN IF NOT EXISTS dek_version int;

ALTER TABLE public.integration_resend_settings
  ADD COLUMN IF NOT EXISTS encrypted_api_key text,
  ADD COLUMN IF NOT EXISTS api_key_iv text,
  ADD COLUMN IF NOT EXISTS dek_version int;

ALTER TABLE public.custom_smtp_configs
  ADD COLUMN IF NOT EXISTS encrypted_password text,
  ADD COLUMN IF NOT EXISTS password_iv text,
  ADD COLUMN IF NOT EXISTS dek_version int;

-- OpenAI settings must not expose plaintext secrets via PostgREST for admins.
-- Admin UI uses edge functions (service role) only.
DROP POLICY IF EXISTS integration_openai_settings_admin_all ON public.integration_openai_settings;
