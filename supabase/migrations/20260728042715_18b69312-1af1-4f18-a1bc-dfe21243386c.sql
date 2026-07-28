DROP POLICY IF EXISTS "Guru can manage hasil_klaster" ON public.hasil_klaster;

CREATE POLICY "Guru and admin can manage hasil_klaster"
ON public.hasil_klaster
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'guru'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'guru'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hasil_klaster TO authenticated;
GRANT SELECT ON public.hasil_klaster TO anon;
GRANT ALL ON public.hasil_klaster TO service_role;