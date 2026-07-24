
-- 1) Master data access request table
CREATE TABLE public.master_data_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_data_access_requests TO authenticated;
GRANT ALL ON public.master_data_access_requests TO service_role;

ALTER TABLE public.master_data_access_requests ENABLE ROW LEVEL SECURITY;

-- Guru: view & insert their own request
CREATE POLICY "Users view own requests"
  ON public.master_data_access_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own request"
  ON public.master_data_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin update requests"
  ON public.master_data_access_requests
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete requests"
  ON public.master_data_access_requests
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mdar_updated_at
  BEFORE UPDATE ON public.master_data_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Helper: has_master_data_access
CREATE OR REPLACE FUNCTION public.has_master_data_access(_user_id uuid)
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

-- 3) Update RLS on master data tables: admin OR approved guru can manage
DROP POLICY IF EXISTS "Guru can manage siswa" ON public.siswa;
CREATE POLICY "Master data managers can manage siswa"
  ON public.siswa FOR ALL TO authenticated
  USING (public.has_master_data_access(auth.uid()))
  WITH CHECK (public.has_master_data_access(auth.uid()));

DROP POLICY IF EXISTS "Guru can manage nilai" ON public.nilai;
CREATE POLICY "Master data managers can manage nilai"
  ON public.nilai FOR ALL TO authenticated
  USING (public.has_master_data_access(auth.uid()))
  WITH CHECK (public.has_master_data_access(auth.uid()));

DROP POLICY IF EXISTS "Guru can manage mata_pelajaran" ON public.mata_pelajaran;
CREATE POLICY "Master data managers can manage mata_pelajaran"
  ON public.mata_pelajaran FOR ALL TO authenticated
  USING (public.has_master_data_access(auth.uid()))
  WITH CHECK (public.has_master_data_access(auth.uid()));

DROP POLICY IF EXISTS "Guru can manage jurusan" ON public.jurusan;
CREATE POLICY "Master data managers can manage jurusan"
  ON public.jurusan FOR ALL TO authenticated
  USING (public.has_master_data_access(auth.uid()))
  WITH CHECK (public.has_master_data_access(auth.uid()));

-- hasil_klaster: guru role can still manage (clustering is separate feature)
-- (leave existing policy)

-- 4) Admin can view all profiles (for admin pages)
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all user_roles (for admin pages)
CREATE POLICY "Admin can view all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 5) Promote marchellino940@gmail.com to admin (if account exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'marchellino940@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
