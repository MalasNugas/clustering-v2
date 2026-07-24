import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  nama_lengkap?: string;
};

export default function AdminRequests() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("master_data_access_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      const ids = Array.from(new Set((reqs ?? []).map((r) => r.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("user_id, nama_lengkap").in("user_id", ids)
        : { data: [] as { user_id: string; nama_lengkap: string }[] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nama_lengkap]));
      return (reqs ?? []).map((r) => ({ ...r, nama_lengkap: nameMap.get(r.user_id) })) as Row[];
    },
  });

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("master_data_access_requests")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq("id", id);
    if (error) toast.error("Gagal: " + error.message);
    else {
      toast.success(status === "approved" ? "Permintaan disetujui" : "Permintaan ditolak");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Permintaan Akses Master Data</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Setujui atau tolak permintaan akses dari akun guru.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Permintaan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : data.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada permintaan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead>Diajukan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nama_lengkap ?? r.user_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.requested_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      {r.status === "pending" ? (
                        <Badge variant="secondary">menunggu</Badge>
                      ) : r.status === "approved" ? (
                        <Badge className="bg-green-600">disetujui</Badge>
                      ) : (
                        <Badge variant="destructive">ditolak</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => updateStatus(r.id, "approved")}>
                            <Check className="h-4 w-4 mr-1" /> Setujui
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, "rejected")}>
                            <X className="h-4 w-4 mr-1" /> Tolak
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
