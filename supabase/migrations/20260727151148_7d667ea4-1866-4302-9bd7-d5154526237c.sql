ALTER TABLE public.hasil_klaster
  ADD COLUMN IF NOT EXISTS k_used integer,
  ADD COLUMN IF NOT EXISTS label text;