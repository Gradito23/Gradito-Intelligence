-- Migration 4: profiles, app roles, permissions, auth helpers

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  display_name text,
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  resource text NOT NULL,
  action text NOT NULL,
  UNIQUE(role_id, resource, action)
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'user',
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed system roles
INSERT INTO public.app_roles (name, description, is_system) VALUES
  ('admin', 'Full system administrator', true),
  ('user', 'Standard authenticated user', true);

-- Default admin permissions (matrix expanded in Phase 5)
INSERT INTO public.role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM public.app_roles r
CROSS JOIN (
  VALUES
    ('config', 'read'),
    ('config', 'write'),
    ('users', 'read'),
    ('users', 'write'),
    ('chefs', 'read'),
    ('chefs', 'write'),
    ('events', 'read'),
    ('events', 'write'),
    ('admin_panel', 'access')
) AS p(resource, action)
WHERE r.name = 'admin';

INSERT INTO public.role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM public.app_roles r
CROSS JOIN (
  VALUES
    ('config', 'read'),
    ('chefs', 'read'),
    ('chefs', 'write'),
    ('events', 'read'),
    ('events', 'write')
) AS p(resource, action)
WHERE r.name = 'user';
