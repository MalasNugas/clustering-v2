
-- Enum untuk role
CREATE TYPE public.app_role AS ENUM ('admin', 'guru', 'siswa');

-- Tabel profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tabel user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger: auto-create profile + assign role guru on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nama_lengkap)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guru');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies untuk tabel data: hanya guru yang bisa CUD, hasil_klaster public read
DROP POLICY IF EXISTS "Allow all access on jurusan" ON public.jurusan;
DROP POLICY IF EXISTS "Allow all access on mata_pelajaran" ON public.mata_pelajaran;
DROP POLICY IF EXISTS "Allow all access on siswa" ON public.siswa;
DROP POLICY IF EXISTS "Allow all access on nilai" ON public.nilai;
DROP POLICY IF EXISTS "Allow all access on hasil_klaster" ON public.hasil_klaster;

-- jurusan: public read, guru write
CREATE POLICY "Public can view jurusan" ON public.jurusan FOR SELECT USING (true);
CREATE POLICY "Guru can manage jurusan" ON public.jurusan FOR ALL
  USING (public.has_role(auth.uid(), 'guru'))
  WITH CHECK (public.has_role(auth.uid(), 'guru'));

-- mata_pelajaran
CREATE POLICY "Public can view mata_pelajaran" ON public.mata_pelajaran FOR SELECT USING (true);
CREATE POLICY "Guru can manage mata_pelajaran" ON public.mata_pelajaran FOR ALL
  USING (public.has_role(auth.uid(), 'guru'))
  WITH CHECK (public.has_role(auth.uid(), 'guru'));

-- siswa
CREATE POLICY "Public can view siswa" ON public.siswa FOR SELECT USING (true);
CREATE POLICY "Guru can manage siswa" ON public.siswa FOR ALL
  USING (public.has_role(auth.uid(), 'guru'))
  WITH CHECK (public.has_role(auth.uid(), 'guru'));

-- nilai
CREATE POLICY "Public can view nilai" ON public.nilai FOR SELECT USING (true);
CREATE POLICY "Guru can manage nilai" ON public.nilai FOR ALL
  USING (public.has_role(auth.uid(), 'guru'))
  WITH CHECK (public.has_role(auth.uid(), 'guru'));

-- hasil_klaster: public read (untuk landing page), guru write
CREATE POLICY "Public can view hasil_klaster" ON public.hasil_klaster FOR SELECT USING (true);
CREATE POLICY "Guru can manage hasil_klaster" ON public.hasil_klaster FOR ALL
  USING (public.has_role(auth.uid(), 'guru'))
  WITH CHECK (public.has_role(auth.uid(), 'guru'));
