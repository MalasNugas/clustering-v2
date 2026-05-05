CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
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

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

ALTER POLICY "Guru can manage jurusan"
ON public.jurusan
USING (private.has_role(auth.uid(), 'guru'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'guru'::public.app_role));

ALTER POLICY "Guru can manage mata_pelajaran"
ON public.mata_pelajaran
USING (private.has_role(auth.uid(), 'guru'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'guru'::public.app_role));

ALTER POLICY "Guru can manage nilai"
ON public.nilai
USING (private.has_role(auth.uid(), 'guru'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'guru'::public.app_role));

ALTER POLICY "Guru can manage siswa"
ON public.siswa
USING (private.has_role(auth.uid(), 'guru'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'guru'::public.app_role));

ALTER POLICY "Guru can manage hasil_klaster"
ON public.hasil_klaster
USING (private.has_role(auth.uid(), 'guru'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'guru'::public.app_role));

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_user();

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);