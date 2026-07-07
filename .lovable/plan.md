# Migrasi Backend ke Supabase Milik Sendiri

Menyediakan SQL lengkap yang bisa langsung di-copy-paste ke SQL Editor Supabase Anda, plus langkah update konfigurasi frontend.

## Langkah 1 — Jalankan SQL berikut di SQL Editor Supabase Anda

```sql
-- =========================================================
-- 1. SCHEMA PRIVATE (untuk fungsi security definer)
-- =========================================================
CREATE SCHEMA IF NOT EXISTS private;

-- =========================================================
-- 2. ENUM ROLE
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'guru', 'siswa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 3. FUNGSI updated_at
-- =========================================================
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

-- =========================================================
-- 4. TABEL: profiles
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nama_lengkap text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. TABEL: user_roles + fungsi has_role
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================================
-- 6. TRIGGER auto-buat profile + role 'guru' saat signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nama_lengkap)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.email)
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guru');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 7. TABEL: jurusan
-- =========================================================
CREATE TABLE public.jurusan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jurusan TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurusan TO authenticated;
GRANT ALL ON public.jurusan TO service_role;
ALTER TABLE public.jurusan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view jurusan" ON public.jurusan
  FOR SELECT USING (true);
CREATE POLICY "Guru can manage jurusan" ON public.jurusan
  FOR ALL USING (private.has_role(auth.uid(), 'guru'))
  WITH CHECK (private.has_role(auth.uid(), 'guru'));

-- =========================================================
-- 8. TABEL: mata_pelajaran
-- =========================================================
CREATE TABLE public.mata_pelajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  jurusan_id uuid REFERENCES public.jurusan(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mata_pelajaran TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mata_pelajaran TO authenticated;
GRANT ALL ON public.mata_pelajaran TO service_role;
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view mata_pelajaran" ON public.mata_pelajaran
  FOR SELECT USING (true);
CREATE POLICY "Guru can manage mata_pelajaran" ON public.mata_pelajaran
  FOR ALL USING (private.has_role(auth.uid(), 'guru'))
  WITH CHECK (private.has_role(auth.uid(), 'guru'));

-- =========================================================
-- 9. TABEL: siswa
-- =========================================================
CREATE TABLE public.siswa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  nis text NOT NULL,
  jurusan_id uuid REFERENCES public.jurusan(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.siswa TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.siswa TO authenticated;
GRANT ALL ON public.siswa TO service_role;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view siswa" ON public.siswa
  FOR SELECT USING (true);
CREATE POLICY "Guru can manage siswa" ON public.siswa
  FOR ALL USING (private.has_role(auth.uid(), 'guru'))
  WITH CHECK (private.has_role(auth.uid(), 'guru'));

-- =========================================================
-- 10. TABEL: nilai
-- =========================================================
CREATE TABLE public.nilai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
  mata_pelajaran_id uuid NOT NULL REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE,
  nilai numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nilai TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nilai TO authenticated;
GRANT ALL ON public.nilai TO service_role;
ALTER TABLE public.nilai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view nilai" ON public.nilai
  FOR SELECT USING (true);
CREATE POLICY "Guru can manage nilai" ON public.nilai
  FOR ALL USING (private.has_role(auth.uid(), 'guru'))
  WITH CHECK (private.has_role(auth.uid(), 'guru'));

-- =========================================================
-- 11. TABEL: hasil_klaster
-- =========================================================
CREATE TABLE public.hasil_klaster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
  jurusan_id uuid REFERENCES public.jurusan(id) ON DELETE SET NULL,
  klaster integer NOT NULL,
  iterasi integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hasil_klaster TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hasil_klaster TO authenticated;
GRANT ALL ON public.hasil_klaster TO service_role;
ALTER TABLE public.hasil_klaster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view hasil_klaster" ON public.hasil_klaster
  FOR SELECT USING (true);
CREATE POLICY "Guru can manage hasil_klaster" ON public.hasil_klaster
  FOR ALL USING (private.has_role(auth.uid(), 'guru'))
  WITH CHECK (private.has_role(auth.uid(), 'guru'));
```

## Langkah 2 — Update konfigurasi Supabase Anda

- Di dashboard Supabase Anda: **Authentication → Providers → Email**, aktifkan Email, dan (opsional) aktifkan **Confirm email = OFF** agar user bisa langsung login setelah register (sesuai flow di `Auth.tsx`).
- Trigger `on_auth_user_created` di SQL di atas akan otomatis membuat entry `profiles` dan memberi role `guru` kepada setiap user baru yang mendaftar.

## Langkah 3 — Ganti kredensial frontend

Update file `.env` dengan nilai dari Supabase Anda (Project Settings → API):

```
VITE_SUPABASE_URL="https://<PROJECT_REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon public key>"
VITE_SUPABASE_PROJECT_ID="<PROJECT_REF>"
```

Setelah itu restart dev server. Tidak ada perubahan kode lain yang diperlukan — struktur tabel & policy identik dengan yang sekarang dipakai aplikasi.

## Catatan teknis

- Fungsi `has_role` diletakkan di schema `private` (sama seperti sekarang) agar tidak terekspos lewat PostgREST.
- Semua tabel domain (`jurusan`, `siswa`, `mata_pelajaran`, `nilai`, `hasil_klaster`) dapat dibaca publik (sesuai policy sekarang) dan hanya user dengan role `guru` yang bisa insert/update/delete.
- Jika ingin migrasi data juga (bukan hanya schema), beri tahu — bisa saya siapkan skrip export/import CSV per tabel.
