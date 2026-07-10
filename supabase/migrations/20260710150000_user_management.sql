-- Migration: User Management — profiles.role_id, status, password_setup_required, permission seed

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.app_roles(id),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'deactivated')),
  ADD COLUMN IF NOT EXISTS password_setup_required boolean NOT NULL DEFAULT false;

-- Backfill role_id from legacy role text
UPDATE public.profiles p
SET role_id = r.id
FROM public.app_roles r
WHERE p.role_id IS NULL AND r.name = p.role;

-- Default any orphan profiles to 'user' role
UPDATE public.profiles p
SET role_id = r.id
FROM public.app_roles r
WHERE p.role_id IS NULL AND r.name = 'user';

ALTER TABLE public.profiles
  ALTER COLUMN role_id SET NOT NULL;

-- Sync profiles.role text when role_id changes
CREATE OR REPLACE FUNCTION public.sync_profile_role_from_role_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name text;
BEGIN
  IF NEW.role_id IS NOT NULL THEN
    SELECT name INTO role_name FROM public.app_roles WHERE id = NEW.role_id;
    IF role_name IS NOT NULL THEN
      NEW.role := role_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_role_on_role_id ON public.profiles;
CREATE TRIGGER sync_profile_role_on_role_id
  BEFORE INSERT OR UPDATE OF role_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_role_id();

-- Keep is_admin() working via synced role text (also checks role_id join as fallback)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.app_roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR r.name = 'admin')
  );
$$;

-- New users: assign role_id from metadata or default 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
  assigned_role_id uuid;
  meta_role_id text;
BEGIN
  SELECT id INTO default_role_id FROM public.app_roles WHERE name = 'user' LIMIT 1;
  meta_role_id := NEW.raw_user_meta_data->>'role_id';

  IF meta_role_id IS NOT NULL THEN
    SELECT id INTO assigned_role_id FROM public.app_roles WHERE id = meta_role_id::uuid;
  END IF;

  IF assigned_role_id IS NULL THEN
    assigned_role_id := default_role_id;
  END IF;

  INSERT INTO public.profiles (id, role_id, role, display_name, status)
  VALUES (
    NEW.id,
    assigned_role_id,
    (SELECT name FROM public.app_roles WHERE id = assigned_role_id),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    CASE
      WHEN NEW.invited_at IS NOT NULL THEN 'invited'
      ELSE 'active'
    END
  );
  RETURN NEW;
END;
$$;

-- Expand permission seed (idempotent)
INSERT INTO public.role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM public.app_roles r
CROSS JOIN (
  VALUES
    ('team', 'read'),
    ('team', 'write'),
    ('reports', 'read'),
    ('integrations', 'read'),
    ('integrations', 'write')
) AS p(resource, action)
WHERE r.name = 'admin'
ON CONFLICT (role_id, resource, action) DO NOTHING;

INSERT INTO public.role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM public.app_roles r
CROSS JOIN (
  VALUES
    ('reports', 'read')
) AS p(resource, action)
WHERE r.name = 'user'
ON CONFLICT (role_id, resource, action) DO NOTHING;
