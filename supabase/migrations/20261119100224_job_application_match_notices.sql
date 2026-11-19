-- Link job applications to an existing chef or intake, and record receipt/acceptance notices.

ALTER TABLE public.event_job_applications
  ADD COLUMN IF NOT EXISTS matched_chef_id uuid,
  ADD COLUMN IF NOT EXISTS matched_intake_request_id uuid,
  ADD COLUMN IF NOT EXISTS receipt_email_status text NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS receipt_sms_status text NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS receipt_email_error text,
  ADD COLUMN IF NOT EXISTS receipt_sms_error text,
  ADD COLUMN IF NOT EXISTS acceptance_email_status text NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS acceptance_sms_status text NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS acceptance_email_error text,
  ADD COLUMN IF NOT EXISTS acceptance_sms_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_job_applications_matched_chef_id_fkey'
  ) THEN
    ALTER TABLE public.event_job_applications
      ADD CONSTRAINT event_job_applications_matched_chef_id_fkey
      FOREIGN KEY (matched_chef_id) REFERENCES public.chefs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_job_applications_matched_intake_request_id_fkey'
  ) THEN
    ALTER TABLE public.event_job_applications
      ADD CONSTRAINT event_job_applications_matched_intake_request_id_fkey
      FOREIGN KEY (matched_intake_request_id) REFERENCES public.chef_intake_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.event_job_applications
  DROP CONSTRAINT IF EXISTS event_job_applications_status_check;

ALTER TABLE public.event_job_applications
  ADD CONSTRAINT event_job_applications_status_check
  CHECK (status IN ('pending', 'ignored', 'reviewed', 'accepted'));

ALTER TABLE public.event_job_applications
  DROP CONSTRAINT IF EXISTS event_job_applications_receipt_email_status_check,
  DROP CONSTRAINT IF EXISTS event_job_applications_receipt_sms_status_check,
  DROP CONSTRAINT IF EXISTS event_job_applications_acceptance_email_status_check,
  DROP CONSTRAINT IF EXISTS event_job_applications_acceptance_sms_status_check;

ALTER TABLE public.event_job_applications
  ADD CONSTRAINT event_job_applications_receipt_email_status_check
    CHECK (receipt_email_status IN ('skipped', 'sent', 'failed')),
  ADD CONSTRAINT event_job_applications_receipt_sms_status_check
    CHECK (receipt_sms_status IN ('skipped', 'sent', 'failed')),
  ADD CONSTRAINT event_job_applications_acceptance_email_status_check
    CHECK (acceptance_email_status IN ('skipped', 'sent', 'failed')),
  ADD CONSTRAINT event_job_applications_acceptance_sms_status_check
    CHECK (acceptance_sms_status IN ('skipped', 'sent', 'failed'));

CREATE INDEX IF NOT EXISTS idx_event_job_applications_matched_chef
  ON public.event_job_applications(matched_chef_id)
  WHERE matched_chef_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_job_applications_matched_intake
  ON public.event_job_applications(matched_intake_request_id)
  WHERE matched_intake_request_id IS NOT NULL;
