-- Seed default admin user (local / dev / first deploy)
-- Email:    admin@gradito.com
-- Password: admin1234
--
-- Idempotent: skips insert if email already exists; always ensures admin role on profile.
-- Requires: 20260710150000_user_management.sql (profiles.role_id)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_user_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_email text := 'admin@gradito.com';
  v_password text := 'admin1234';
  v_admin_role_id uuid;
  v_encrypted_pw text;
BEGIN
  SELECT id INTO v_admin_role_id
  FROM public.app_roles
  WHERE name = 'admin'
  LIMIT 1;

  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'app_roles row "admin" not found — run profiles migration first';
  END IF;

  v_encrypted_pw := extensions.crypt(v_password, extensions.gen_salt('bf'));

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    UPDATE public.profiles p
    SET
      role_id = v_admin_role_id,
      role = 'admin',
      status = 'active',
      display_name = COALESCE(p.display_name, 'Admin')
    FROM auth.users u
    WHERE u.email = v_email AND p.id = u.id;

    RETURN;
  END IF;

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'display_name', 'Admin',
      'role_id', v_admin_role_id::text
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- handle_new_user trigger creates profile; ensure admin role if trigger used default
  UPDATE public.profiles
  SET
    role_id = v_admin_role_id,
    role = 'admin',
    status = 'active',
    display_name = 'Admin'
  WHERE id = v_user_id;

  -- If trigger did not fire (edge case), insert profile directly
  INSERT INTO public.profiles (id, role_id, role, display_name, status)
  VALUES (v_user_id, v_admin_role_id, 'admin', 'Admin', 'active')
  ON CONFLICT (id) DO UPDATE
  SET
    role_id = EXCLUDED.role_id,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    display_name = EXCLUDED.display_name;
END $$;
