import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MasterData from "./pages/MasterData";
import Clustering from "./pages/Clustering";
import Profile from "./pages/Profile";
import AdminGuru from "./pages/AdminGuru";
import AdminRequests from "./pages/AdminRequests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedLayout = ({
  children,
  requireRole,
  requireMasterDataAccess,
}: {
  children: React.ReactNode;
  requireRole?: "admin" | "guru" | "siswa";
  requireMasterDataAccess?: boolean;
}) => (
  <ProtectedRoute requireRole={requireRole} requireMasterDataAccess={requireMasterDataAccess}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route
              path="/master-data"
              element={
                <ProtectedLayout requireMasterDataAccess>
                  <MasterData />
                </ProtectedLayout>
              }
            />
            <Route path="/clustering" element={<ProtectedLayout><Clustering /></ProtectedLayout>} />
            <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
            <Route
              path="/admin/guru"
              element={
                <ProtectedLayout requireRole="admin">
                  <AdminGuru />
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/requests"
              element={
                <ProtectedLayout requireRole="admin">
                  <AdminRequests />
                </ProtectedLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
