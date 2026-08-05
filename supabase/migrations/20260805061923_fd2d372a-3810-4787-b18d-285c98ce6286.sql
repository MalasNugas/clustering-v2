-- Pastikan satu baris izin per user agar toggle konsisten
DELETE FROM public.master_data_access_requests a
USING public.master_data_access_requests b
WHERE a.user_id = b.user_id
  AND a.requested_at < b.requested_at;

CREATE UNIQUE INDEX IF NOT EXISTS master_data_access_requests_user_id_key
  ON public.master_data_access_requests (user_id);

-- Admin boleh membuat baris izin untuk guru lain
DROP POLICY IF EXISTS "Admin insert requests" ON public.master_data_access_requests;
CREATE POLICY "Admin insert requests"
ON public.master_data_access_requests
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
