-- Chef Match geo: area centroids, event/chef pins, match run version

ALTER TABLE public.service_areas
  ADD COLUMN IF NOT EXISTS centroid_lat double precision,
  ADD COLUMN IF NOT EXISTS centroid_lng double precision;

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS geo_lat double precision,
  ADD COLUMN IF NOT EXISTS geo_lng double precision,
  ADD COLUMN IF NOT EXISTS geo_source text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS geo_lat double precision,
  ADD COLUMN IF NOT EXISTS geo_lng double precision,
  ADD COLUMN IF NOT EXISTS geo_source text,
  ADD COLUMN IF NOT EXISTS geo_confidence text;

ALTER TABLE public.match_runs
  ADD COLUMN IF NOT EXISTS scoring_version text;

-- Approximate market centroids (ops can refine)
UPDATE public.service_areas SET centroid_lat = 40.7831, centroid_lng = -73.9712 WHERE name = 'Manhattan';
UPDATE public.service_areas SET centroid_lat = 40.6782, centroid_lng = -73.9442 WHERE name = 'Brooklyn';
UPDATE public.service_areas SET centroid_lat = 41.1220, centroid_lng = -73.7949 WHERE name = 'Westchester';
UPDATE public.service_areas SET centroid_lat = 40.9635, centroid_lng = -72.1848 WHERE name = 'The Hamptons';
UPDATE public.service_areas SET centroid_lat = 40.0583, centroid_lng = -74.4057 WHERE name = 'New Jersey';
UPDATE public.service_areas SET centroid_lat = 25.7617, centroid_lng = -80.1918 WHERE name = 'Miami';
UPDATE public.service_areas SET centroid_lat = 34.0522, centroid_lng = -118.2437 WHERE name = 'Los Angeles';
UPDATE public.service_areas SET centroid_lat = 39.9526, centroid_lng = -75.1652 WHERE name = 'Philadelphia';
UPDATE public.service_areas SET centroid_lat = 38.9072, centroid_lng = -77.0369 WHERE name = 'Washington DC';
UPDATE public.service_areas SET centroid_lat = 37.7749, centroid_lng = -122.4194 WHERE name = 'San Francisco';
UPDATE public.service_areas SET centroid_lat = 36.1627, centroid_lng = -86.7816 WHERE name = 'Nashville';
UPDATE public.service_areas SET centroid_lat = 47.6062, centroid_lng = -122.3321 WHERE name = 'Seattle';
UPDATE public.service_areas SET centroid_lat = 36.1699, centroid_lng = -115.1398 WHERE name = 'Las Vegas';
UPDATE public.service_areas SET centroid_lat = 32.7767, centroid_lng = -96.7970 WHERE name = 'Dallas';
UPDATE public.service_areas SET centroid_lat = 41.8781, centroid_lng = -87.6298 WHERE name = 'Chicago';
UPDATE public.service_areas SET centroid_lat = 42.3601, centroid_lng = -71.0589 WHERE name = 'Boston';
UPDATE public.service_areas SET centroid_lat = 30.2672, centroid_lng = -97.7431 WHERE name = 'Austin';
UPDATE public.service_areas SET centroid_lat = 29.7604, centroid_lng = -95.3698 WHERE name = 'Houston';
UPDATE public.service_areas SET centroid_lat = 39.7392, centroid_lng = -104.9903 WHERE name = 'Denver';
UPDATE public.service_areas SET centroid_lat = 33.7490, centroid_lng = -84.3880 WHERE name = 'Atlanta';
UPDATE public.service_areas SET centroid_lat = 29.9511, centroid_lng = -90.0715 WHERE name = 'New Orleans';
UPDATE public.service_areas SET centroid_lat = 45.5152, centroid_lng = -122.6784 WHERE name = 'Portland';
UPDATE public.service_areas SET centroid_lat = 32.7157, centroid_lng = -117.1611 WHERE name = 'San Diego';
UPDATE public.service_areas SET centroid_lat = 26.7056, centroid_lng = -80.0364 WHERE name = 'Palm Beach';
UPDATE public.service_areas SET centroid_lat = 39.1911, centroid_lng = -106.8175 WHERE name = 'Aspen';
UPDATE public.service_areas SET centroid_lat = 25.2048, centroid_lng = 55.2708 WHERE name = 'Dubai';
UPDATE public.service_areas SET centroid_lat = 48.8566, centroid_lng = 2.3522 WHERE name = 'Paris';
UPDATE public.service_areas SET centroid_lat = 41.8719, centroid_lng = 12.5674 WHERE name = 'Italy';
UPDATE public.service_areas SET centroid_lat = 41.1220, centroid_lng = -73.7949 WHERE name = 'Westchester, Putnam & Fairfield';
UPDATE public.service_areas SET centroid_lat = 40.7895, centroid_lng = -73.1350 WHERE name = 'Long Island';
UPDATE public.service_areas SET centroid_lat = 42.4501, centroid_lng = -73.2454 WHERE name = 'The Berkshires';