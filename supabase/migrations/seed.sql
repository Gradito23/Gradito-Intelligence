-- Seed reference data — exact strings from gradito-chef-flow constants

-- Service areas (31)
INSERT INTO public.service_areas (name, region, sort_order) VALUES
  ('Manhattan', 'Manhattan', 1),
  ('Brooklyn', 'Brooklyn', 2),
  ('Westchester', 'Westchester', 3),
  ('The Hamptons', 'The Hamptons', 4),
  ('New Jersey', 'New Jersey', 5),
  ('Miami', 'Miami', 6),
  ('Los Angeles', 'Los Angeles', 7),
  ('Philadelphia', 'Philadelphia', 8),
  ('Washington DC', 'Washington DC', 9),
  ('San Francisco', 'San Francisco', 10),
  ('Nashville', 'Nashville', 11),
  ('Seattle', 'Seattle', 12),
  ('Las Vegas', 'Las Vegas', 13),
  ('Dallas', 'Dallas', 14),
  ('Chicago', 'Chicago', 15),
  ('Boston', 'Boston', 16),
  ('Austin', 'Austin', 17),
  ('Houston', 'Houston', 18),
  ('Denver', 'Denver', 19),
  ('Atlanta', 'Atlanta', 20),
  ('New Orleans', 'New Orleans', 21),
  ('Portland', 'Portland', 22),
  ('San Diego', 'San Diego', 23),
  ('Palm Beach', 'Palm Beach', 24),
  ('Aspen', 'Aspen', 25),
  ('Dubai', 'Dubai', 26),
  ('Paris', 'Paris', 27),
  ('Italy', 'Italy', 28),
  ('Westchester, Putnam & Fairfield', 'Westchester, Putnam & Fairfield', 29),
  ('Long Island', 'Long Island', 30),
  ('The Berkshires', 'The Berkshires', 31);

-- Holidays (14) — exact ChefIntake strings
INSERT INTO public.holidays (name, recurring, month, day, sort_order) VALUES
  ('New Year''s Day', true, 1, 1, 1),
  ('Martin Luther King Jr. Day', true, 1, 15, 2),
  ('Presidents'' Day', true, 2, 15, 3),
  ('Memorial Day', true, 5, 25, 4),
  ('Juneteenth', true, 6, 19, 5),
  ('Independence Day (July 4)', true, 7, 4, 6),
  ('Labor Day', true, 9, 1, 7),
  ('Indigenous Peoples'' / Columbus Day', true, 10, 12, 8),
  ('Veterans Day', true, 11, 11, 9),
  ('Thanksgiving', true, 11, 25, 10),
  ('Day after Thanksgiving', true, 11, 26, 11),
  ('Christmas Eve', true, 12, 24, 12),
  ('Christmas Day', true, 12, 25, 13),
  ('New Year''s Eve', true, 12, 31, 14);

-- Cuisines (12)
INSERT INTO public.cuisines (name, sort_order) VALUES
  ('Cantonese', 1),
  ('French', 2),
  ('Italian', 3),
  ('Japanese', 4),
  ('Mediterranean', 5),
  ('New American', 6),
  ('Kosher', 7),
  ('Omakase', 8),
  ('Plant-Based', 9),
  ('Spanish', 10),
  ('Thai', 11),
  ('Vietnamese', 12);

-- Experience types (11)
INSERT INTO public.experience_types (name, sort_order) VALUES
  ('Plated Multi-Course', 1),
  ('Tasting Menu / Omakase', 2),
  ('Family-Style', 3),
  ('Cocktail Reception / Canapés', 4),
  ('Interactive Cooking Class', 5),
  ('Farm-to-Table / Foraging', 6),
  ('Live-Fire / Outdoor', 7),
  ('Brunch / Daytime', 8),
  ('Wine-Pairing Dinner', 9),
  ('Themed', 10),
  ('Corporate / Large-Format', 11);

-- Dietary specialties (5)
INSERT INTO public.dietary_specialties (name, sort_order) VALUES
  ('Kosher', 1),
  ('Vegan/Plant-Based', 2),
  ('Gluten-Free', 3),
  ('Allergy-Trained', 4),
  ('Halal', 5);

-- Languages (9)
INSERT INTO public.languages (name, sort_order) VALUES
  ('English', 1),
  ('Spanish', 2),
  ('French', 3),
  ('Italian', 4),
  ('Japanese', 5),
  ('Mandarin', 6),
  ('Cantonese', 7),
  ('Korean', 8),
  ('Portuguese', 9);

-- Event types (3)
INSERT INTO public.event_types (name, sort_order) VALUES
  ('Private', 1),
  ('Corporate', 2),
  ('Wedding', 3);

-- Package types (4) — pricing_formula drives calcExperienceFee
INSERT INTO public.package_types (name, pricing_formula, sort_order) VALUES
  ('Signature Experience', '{"base": 1700, "per_guest_after": 10, "rate": 80}'::jsonb, 1),
  ('Seven-Course Tasting', '{"base": 2250, "per_guest_after": 2, "rate": 275}'::jsonb, 2),
  ('14-Course Omakase', '{"base": 2250, "per_guest_after": 2, "rate": 315}'::jsonb, 3),
  ('Other / Custom', '{"manual": true}'::jsonb, 4);

-- Menu tiers (4)
INSERT INTO public.menu_tiers (name, price_per_guest, sort_order) VALUES
  ('Classic ($68)', 68, 1),
  ('Elevated ($88)', 88, 2),
  ('Luxury ($108)', 108, 3),
  ('None / Manual', NULL, 4);

-- Lead types (3) — commission-critical exact strings
INSERT INTO public.lead_types (name, closer_pct, facilitator_pct, sort_order) VALUES
  ('Direct-Sourced', 10, 5, 1),
  ('Inbound', 7, 3, 2),
  ('House Account / Referral', 3, 2, 3);
