-- Migration 3: core business tables

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text,
  email text,
  roles text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chefs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  photo_url text,
  phone text,
  mobile text,
  email text,
  menu_url text,
  bio_url text,
  bio_page numeric,
  quality_rating int,
  roles_available text,
  home_areas text[] NOT NULL DEFAULT '{}',
  travel_policy text,
  travel_fees jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_travel_fee numeric,
  cuisines text[] NOT NULL DEFAULT '{}',
  experience_types text[] NOT NULL DEFAULT '{}',
  signature_experiences text,
  dietary_specialties text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  max_solo_guests numeric,
  equipment_notes text,
  profile_status text,
  status text,
  price_tier text,
  notes text,
  blackout_holidays text[] NOT NULL DEFAULT '{}',
  blackout_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability_notes text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfect_venue_id text,
  date date,
  service_area text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  event_type text,
  experience_type text,
  cuisines_served text[] NOT NULL DEFAULT '{}',
  guest_count numeric,
  client_revenue numeric NOT NULL DEFAULT 0,
  status text,
  notes text,
  package_type text,
  menu_tier text,
  experience_fee numeric NOT NULL DEFAULT 0,
  food_revenue numeric NOT NULL DEFAULT 0,
  beverage_revenue numeric NOT NULL DEFAULT 0,
  staffing_revenue numeric NOT NULL DEFAULT 0,
  rental_revenue numeric NOT NULL DEFAULT 0,
  travel_revenue numeric NOT NULL DEFAULT 0,
  florals_revenue numeric NOT NULL DEFAULT 0,
  printed_menus_revenue numeric NOT NULL DEFAULT 0,
  other_revenue numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  admin_fee numeric NOT NULL DEFAULT 0,
  gratuity numeric NOT NULL DEFAULT 0,
  cc_processing numeric NOT NULL DEFAULT 0,
  sales_tax numeric NOT NULL DEFAULT 0,
  chef_food_budget numeric NOT NULL DEFAULT 0,
  food_cost_actual numeric NOT NULL DEFAULT 0,
  staffing_cost numeric NOT NULL DEFAULT 0,
  beverage_cost numeric NOT NULL DEFAULT 0,
  rental_cost numeric NOT NULL DEFAULT 0,
  other_travel_cost numeric NOT NULL DEFAULT 0,
  florals_cost numeric NOT NULL DEFAULT 0,
  printed_menus_cost numeric NOT NULL DEFAULT 0,
  delivery_cost numeric NOT NULL DEFAULT 0,
  other_expenses numeric NOT NULL DEFAULT 0,
  lead_type text,
  closer_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  facilitators jsonb NOT NULL DEFAULT '[]'::jsonb,
  facilitator_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  source_rep_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  source_split_pct numeric DEFAULT 40,
  repeat_client_bonus boolean,
  apply_min_floor boolean,
  commission_status text NOT NULL DEFAULT 'Pending',
  invoice_number text,
  invoice_grand_total numeric,
  admin_fee_pct numeric,
  admin_fee_applies_to text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_chefs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES public.chefs(id) ON DELETE RESTRICT,
  chef_name text,
  role text NOT NULL,
  fee numeric,
  travel_fee_applied numeric,
  payment_status text NOT NULL DEFAULT 'Unpaid',
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_vendors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  vendor_type text,
  amount_owed numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'Unpaid',
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.commission_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_label text,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  team_member_name text,
  role text NOT NULL,
  rate_pct numeric,
  split_pct numeric NOT NULL DEFAULT 100,
  basis numeric,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  payment_status text NOT NULL DEFAULT 'Unpaid',
  paid_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.match_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name text,
  transcript_excerpt text,
  extracted_criteria jsonb,
  suggested_chefs jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_label text,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_date ON public.events(date DESC);
CREATE INDEX idx_events_client_id ON public.events(client_id);
CREATE INDEX idx_event_chefs_event_id ON public.event_chefs(event_id);
CREATE INDEX idx_event_vendors_event_id ON public.event_vendors(event_id);
CREATE INDEX idx_commission_lines_event_id ON public.commission_lines(event_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_chefs_archived ON public.chefs(archived);

CREATE TRIGGER set_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_chefs_updated_at BEFORE UPDATE ON public.chefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_event_chefs_updated_at BEFORE UPDATE ON public.event_chefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_event_vendors_updated_at BEFORE UPDATE ON public.event_vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_commission_lines_updated_at BEFORE UPDATE ON public.commission_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_match_runs_updated_at BEFORE UPDATE ON public.match_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_activity_logs_updated_at BEFORE UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
