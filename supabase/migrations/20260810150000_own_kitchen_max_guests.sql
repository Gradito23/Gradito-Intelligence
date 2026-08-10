-- Optional: guest count threshold for cooking from own/home kitchen vs commercial rental

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS own_kitchen_max_guests numeric;

-- ROLLBACK
-- ALTER TABLE public.chefs DROP COLUMN IF EXISTS own_kitchen_max_guests;
