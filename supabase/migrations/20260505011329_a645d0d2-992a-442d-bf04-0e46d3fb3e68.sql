ALTER TABLE public.hasil_klaster ADD COLUMN IF NOT EXISTS jurusan_id uuid;
CREATE INDEX IF NOT EXISTS idx_hasil_klaster_jurusan ON public.hasil_klaster(jurusan_id);