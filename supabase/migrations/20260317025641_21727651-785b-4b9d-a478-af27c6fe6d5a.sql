
-- Table: jurusan (departments)
CREATE TABLE public.jurusan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: mata_pelajaran (subjects)
CREATE TABLE public.mata_pelajaran (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  jurusan_id UUID REFERENCES public.jurusan(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: siswa (students)
CREATE TABLE public.siswa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  nis TEXT NOT NULL UNIQUE,
  jurusan_id UUID REFERENCES public.jurusan(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: nilai (scores)
CREATE TABLE public.nilai (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
  mata_pelajaran_id UUID NOT NULL REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE,
  nilai NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(siswa_id, mata_pelajaran_id)
);

-- Table: hasil_klaster (clustering results)
CREATE TABLE public.hasil_klaster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
  klaster INTEGER NOT NULL,
  iterasi INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.jurusan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hasil_klaster ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (this is a thesis app, no auth needed)
CREATE POLICY "Allow all access on jurusan" ON public.jurusan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on mata_pelajaran" ON public.mata_pelajaran FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on siswa" ON public.siswa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on nilai" ON public.nilai FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on hasil_klaster" ON public.hasil_klaster FOR ALL USING (true) WITH CHECK (true);
