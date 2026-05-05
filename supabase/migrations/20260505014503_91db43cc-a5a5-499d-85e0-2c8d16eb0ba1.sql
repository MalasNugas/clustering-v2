DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, nama_lengkap)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1), NEW.email)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    nama_lengkap = EXCLUDED.nama_lengkap,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guru'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (user_id, nama_lengkap)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'nama_lengkap', split_part(u.email, '@', 1), u.email)
FROM auth.users u
ON CONFLICT (user_id)
DO UPDATE SET
  nama_lengkap = EXCLUDED.nama_lengkap,
  updated_at = now();

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'guru'::public.app_role
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;