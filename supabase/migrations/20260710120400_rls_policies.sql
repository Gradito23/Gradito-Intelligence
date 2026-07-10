-- Migration 5: Row Level Security policies

-- Config tables: public read (active), admin write
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'service_areas', 'holidays', 'cuisines', 'experience_types',
    'dietary_specialties', 'languages', 'event_types',
    'package_types', 'menu_tiers', 'lead_types'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (active = true)',
      t || '_select_anon', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (active = true)',
      t || '_select_auth', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t || '_admin_all', t
    );
  END LOOP;
END $$;

-- Business tables: authenticated full access
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_members_auth_all ON public.team_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY clients_auth_all ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY events_auth_all ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY event_chefs_auth_all ON public.event_chefs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY event_vendors_auth_all ON public.event_vendors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY commission_lines_auth_all ON public.commission_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY match_runs_auth_all ON public.match_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY activity_logs_auth_all ON public.activity_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Chefs: authenticated full access; anon insert for intake only
ALTER TABLE public.chefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY chefs_auth_all ON public.chefs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY chefs_anon_insert_intake ON public.chefs
  FOR INSERT TO anon
  WITH CHECK (profile_status = 'In Progress');

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_admin_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- App roles & permissions: admin manage; authenticated read own role perms via join in app
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_roles_select_auth ON public.app_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY app_roles_admin_all ON public.app_roles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY role_permissions_select_auth ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY role_permissions_admin_all ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
