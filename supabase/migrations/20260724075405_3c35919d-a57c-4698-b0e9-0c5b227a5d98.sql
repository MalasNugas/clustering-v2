
-- Move has_master_data_access to private schema (like private.has_role)
CREATE OR REPLACE FUNCTION private.has_master_data_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    private.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.master_data_access_requests
      WHERE user_id = _user_id AND status = 'approved'
    );
$$;

REVOKE EXECUTE ON FUNCTION private.has_master_data_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_master_data_access(uuid) TO authenticated, service_role;

-- Update policies to use private version
DROP POLICY IF EXISTS "Master data managers can manage siswa" ON public.siswa;
CREATE POLICY "Master data managers can manage siswa"
  ON public.siswa FOR ALL TO authenticated
  USING (private.has_master_data_access(auth.uid()))
  WITH CHECK (private.has_master_data_access(auth.uid()));

DROP POLICY IF EXISTS "Master data managers can manage nilai" ON public.nilai;
CREATE POLICY "Master data managers can manage nilai"
  ON public.nilai FOR ALL TO authenticated
  USING (private.has_master_data_access(auth.uid()))
  WITH CHECK (private.has_master_data_access(auth.uid()));

DROP POLICY IF EXISTS "Master data managers can manage mata_pelajaran" ON public.mata_pelajaran;
CREATE POLICY "Master data managers can manage mata_pelajaran"
  ON public.mata_pelajaran FOR ALL TO authenticated
  USING (private.has_master_data_access(auth.uid()))
  WITH CHECK (private.has_master_data_access(auth.uid()));

DROP POLICY IF EXISTS "Master data managers can manage jurusan" ON public.jurusan;
CREATE POLICY "Master data managers can manage jurusan"
  ON public.jurusan FOR ALL TO authenticated
  USING (private.has_master_data_access(auth.uid()))
  WITH CHECK (private.has_master_data_access(auth.uid()));

-- Drop the public version
DROP FUNCTION IF EXISTS public.has_master_data_access(uuid);
