import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export function MasterDataAccessBanner() {
  const { user } = useAuth();
  const { isAdmin, hasMasterDataAccess, accessRequestStatus, refresh, loading } = useUserRole();

  if (loading || !user || isAdmin || hasMasterDataAccess) return null;

  const requestAccess = async () => {
    const { error } = await supabase
      .from("master_data_access_requests")
      .upsert(
        { user_id: user.id, status: "pending", requested_at: new Date().toISOString(), reviewed_at: null },
        { onConflict: "user_id" }
      );
    if (error) toast.error("Gagal mengirim permintaan: " + error.message);
    else {
      toast.success("Permintaan akses terkirim. Menunggu persetujuan Admin.");
      refresh();
    }
  };

  return (
    <Card className="mb-6 border-primary/40 bg-primary/5">
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
        <KeyRound className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Akses Master Data</p>
          <p className="text-muted-foreground">
            {accessRequestStatus === "pending"
              ? "Permintaan akses Anda sedang menunggu persetujuan Admin."
              : accessRequestStatus === "rejected"
              ? "Permintaan sebelumnya ditolak. Anda dapat mengajukan ulang."
              : accessRequestStatus === "revoked"
              ? "Akses Anda dinonaktifkan oleh Admin. Anda dapat mengajukan ulang."
              : "Anda belum memiliki akses. Ajukan permintaan ke Admin untuk mengelola Master Data."}
          </p>
        </div>
        {accessRequestStatus !== "pending" && (
          <Button onClick={requestAccess} size="sm">
            {accessRequestStatus === "rejected" || accessRequestStatus === "revoked"
              ? "Ajukan Ulang"
              : "Minta Akses"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
