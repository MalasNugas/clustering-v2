import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "guru" | "siswa";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [hasMasterDataAccess, setHasMasterDataAccess] = useState(false);
  const [accessRequestStatus, setAccessRequestStatus] = useState<
    "none" | "pending" | "approved" | "rejected" | "revoked"
  >("none");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setRole(null);
      setHasMasterDataAccess(false);
      setAccessRequestStatus("none");
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: roles }, { data: reqs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("master_data_access_requests")
        .select("status")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1),
    ]);
    const rolesList = (roles ?? []).map((r) => r.role as AppRole);
    const primary: AppRole | null = rolesList.includes("admin")
      ? "admin"
      : rolesList.includes("guru")
      ? "guru"
      : rolesList[0] ?? null;
    setRole(primary);

    const latest = reqs?.[0]?.status as
      | "pending"
      | "approved"
      | "rejected"
      | "revoked"
      | undefined;
    setAccessRequestStatus(latest ?? "none");
    setHasMasterDataAccess(primary === "admin" || latest === "approved");
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === "admin",
    isGuru: role === "guru",
    hasMasterDataAccess,
    accessRequestStatus,
    loading: authLoading || loading,
    refresh,
  };
}
