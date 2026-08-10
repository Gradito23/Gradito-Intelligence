-- Revised chef talent profile fields + anon intake uploads

-- ── chefs: structured talent profile columns ───────────────────────────────
ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS home_airport text,
  ADD COLUMN IF NOT EXISTS has_vehicle boolean,
  ADD COLUMN IF NOT EXISTS current_position text,
  ADD COLUMN IF NOT EXISTS current_company text,
  ADD COLUMN IF NOT EXISTS years_cooking numeric,
  ADD COLUMN IF NOT EXISTS awards text,
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS max_guest_count numeric,
  ADD COLUMN IF NOT EXISTS commercial_kitchen_access text
    CHECK (commercial_kitchen_access IS NULL OR commercial_kitchen_access IN ('Yes', 'No', 'Depends on the project')),
  ADD COLUMN IF NOT EXISTS starting_event_fee_usd numeric,
  ADD COLUMN IF NOT EXISTS starting_fee_flexible text
    CHECK (starting_fee_flexible IS NULL OR starting_fee_flexible IN ('Yes', 'Sometimes', 'No')),
  ADD COLUMN IF NOT EXISTS expected_compensation_usd numeric,
  ADD COLUMN IF NOT EXISTS travel_distance text,
  ADD COLUMN IF NOT EXISTS has_passport boolean,
  ADD COLUMN IF NOT EXISTS ideal_events_per_period numeric,
  ADD COLUMN IF NOT EXISTS preferred_event_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_time text,
  ADD COLUMN IF NOT EXISTS opportunity_preferences text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS newsletter_url text,
  ADD COLUMN IF NOT EXISTS social_follower_band text,
  ADD COLUMN IF NOT EXISTS media_history text,
  ADD COLUMN IF NOT EXISTS talent_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── uploads bucket: allow Word resumes; anon intake path ───────────────────
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]
WHERE id = 'uploads';

DROP POLICY IF EXISTS uploads_anon_intake_insert ON storage.objects;
CREATE POLICY uploads_anon_intake_insert ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = 'intake'
  );

-- Rollback:
-- DROP POLICY IF EXISTS uploads_anon_intake_insert ON storage.objects;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS preferred_name;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS city;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS state;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS home_airport;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS has_vehicle;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS current_position;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS current_company;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS years_cooking;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS awards;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS resume_url;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS max_guest_count;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS commercial_kitchen_access;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS starting_event_fee_usd;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS starting_fee_flexible;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS expected_compensation_usd;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS travel_distance;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS has_passport;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS ideal_events_per_period;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS preferred_event_days;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS lead_time;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS opportunity_preferences;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS instagram_url;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS tiktok_url;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS linkedin_url;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS youtube_url;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS website_url;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS newsletter_url;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS social_follower_band;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS media_history;
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS talent_profile;
