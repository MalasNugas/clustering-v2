CREATE TABLE public.clustering_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_nama text,
  action text NOT NULL,
  group_count integer NOT NULL DEFAULT 0,
  student_count integer NOT NULL DEFAULT 0,
  normalized boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.clustering_logs TO authenticated;
GRANT ALL ON public.clustering_logs TO service_role;

ALTER TABLE public.clustering_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own clustering log"
ON public.clustering_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (private.has_role(auth.uid(), 'guru'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admin view all clustering logs"
ON public.clustering_logs FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete clustering logs"
ON public.clustering_logs FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_clustering_logs_created_at ON public.clustering_logs (created_at DESC);