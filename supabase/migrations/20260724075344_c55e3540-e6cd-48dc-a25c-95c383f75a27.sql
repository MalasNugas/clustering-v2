
REVOKE EXECUTE ON FUNCTION public.has_master_data_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_master_data_access(uuid) TO authenticated, service_role;
