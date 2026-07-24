import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

type Props = {
  children: React.ReactNode;
  requireRole?: AppRole;
  requireMasterDataAccess?: boolean;
};

export function ProtectedRoute({ children, requireRole, requireMasterDataAccess }: Props) {
  const { user, loading } = useAuth();
  const { role, hasMasterDataAccess, loading: roleLoading } = useUserRole();

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Memuat...
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireRole && role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireMasterDataAccess && !hasMasterDataAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
