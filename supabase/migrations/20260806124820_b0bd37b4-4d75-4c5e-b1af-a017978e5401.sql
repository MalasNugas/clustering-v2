ALTER TABLE public.jurusan ADD COLUMN IF NOT EXISTS tahun_ajaran text NOT NULL DEFAULT '2026/2027';
ALTER TABLE public.clustering_logs ADD COLUMN IF NOT EXISTS tahun_ajaran text;