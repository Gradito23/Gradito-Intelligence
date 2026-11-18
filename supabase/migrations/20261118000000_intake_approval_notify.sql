-- Track welcome email/SMS after intake approval (idempotent notify)

ALTER TABLE public.chef_intake_requests
  ADD COLUMN IF NOT EXISTS approval_welcome_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_welcome_sms_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notify_error text;