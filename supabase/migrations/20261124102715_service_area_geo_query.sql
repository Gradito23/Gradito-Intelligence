ALTER TABLE public.service_areas
  ADD COLUMN IF NOT EXISTS geo_ai_called boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geo_query text;
