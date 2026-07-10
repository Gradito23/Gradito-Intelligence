-- Gate: only admin-provisioned emails may receive profiles / sign up

CREATE TABLE public.provisioned_emails (
  email text PRIMARY KEY,
  role_id uuid REFERENCES public.app_roles(id),
  provisioned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provisioned_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY provisioned_emails_admin_all ON public.provisioned_emails
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_provisioned boolean NOT NULL DEFAULT false;

-- Backfill legitimate existing users
UPDATE public.profiles SET is_provisioned = true WHERE is_provisioned = false;

INSERT INTO public.provisioned_emails (email, role_id)
SELECT lower(u.email), p.role_id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.provisioned_emails (email, role_id)
SELECT 'admin@gradito.com', id FROM public.app_roles WHERE name = 'admin'
ON CONFLICT (email) DO NOTHING;

-- Only create profiles for invited / provisioned / seed users
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
  user_email text;
  is_allowed boolean := false;
BEGIN
  user_email := lower(trim(NEW.email));

  IF NEW.invited_at IS NOT NULL THEN
    is_allowed := true;
  ELSIF COALESCE(NEW.raw_user_meta_data->>'provisioned', '') = 'true' THEN
    is_allowed := true;
  ELSIF user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.provisioned_emails pe WHERE pe.email = user_email
  ) THEN
    is_allowed := true;
  END IF;

  IF NOT is_allowed THEN
    RETURN NEW;
  END IF;

  SELECT id INTO default_role_id FROM public.app_roles WHERE name = 'user' LIMIT 1;
  meta_role_id := NEW.raw_user_meta_data->>'role_id';

  IF meta_role_id IS NOT NULL THEN
    SELECT id INTO assigned_role_id FROM public.app_roles WHERE id = meta_role_id::uuid;
  END IF;

  IF assigned_role_id IS NULL AND user_email IS NOT NULL THEN
    SELECT role_id INTO assigned_role_id
    FROM public.provisioned_emails
    WHERE email = user_email;
  END IF;

  IF assigned_role_id IS NULL THEN
    assigned_role_id := default_role_id;
  END IF;

  INSERT INTO public.profiles (id, role_id, role, display_name, status, is_provisioned)
  VALUES (
    NEW.id,
    assigned_role_id,
    (SELECT name FROM public.app_roles WHERE id = assigned_role_id),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    CASE WHEN NEW.invited_at IS NOT NULL THEN 'invited' ELSE 'active' END,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    status = EXCLUDED.status,
    is_provisioned = true;

  RETURN NEW;
END;
$$;

-- Remove auth users whose email is not on the allowlist (orphans / re-OAuth after delete)
DELETE FROM auth.users u
WHERE u.email IS NOT NULL
  AND lower(u.email) NOT IN (SELECT email FROM public.provisioned_emails);

-- Ensure seed admin metadata includes provisioned flag for trigger path
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"provisioned": "true"}'::jsonb
WHERE email = 'admin@gradito.com';
