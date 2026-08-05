import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

type Row = {
  user_id: string;
  nama_lengkap?: string;
  request_id: string | null;
  status: "none" | "pending" | "approved" | "rejected" | "revoked";
  requested_at: string | null;
};

export default function AdminRequests() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const [{ data: roles }, { data: reqs }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").eq("role", "guru"),
        supabase
          .from("master_data_access_requests")
          .select("*")
          .order("requested_at", { ascending: false }),
      ]);

      const guruIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      const reqMap = new Map<string, any>();
      for (const r of reqs ?? []) if (!reqMap.has(r.user_id)) reqMap.set(r.user_id, r);

      const ids = Array.from(new Set([...guruIds, ...reqMap.keys()]));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("user_id, nama_lengkap").in("user_id", ids)
        : { data: [] as { user_id: string; nama_lengkap: string }[] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nama_lengkap]));

      const rows: Row[] = ids.map((id) => {
        const r = reqMap.get(id);
        return {
          user_id: id,
          nama_lengkap: nameMap.get(id),
          request_id: r?.id ?? null,
          status: (r?.status as Row["status"]) ?? "none",
          requested_at: r?.requested_at ?? null,
        };
      });

      rows.sort((a, b) => {
        const rank = (s: Row["status"]) => (s === "pending" ? 0 : s === "approved" ? 1 : 2);
        return rank(a.status) - rank(b.status) ||
          (a.nama_lengkap ?? "").localeCompare(b.nama_lengkap ?? "");
      });
      return rows;
    },
  });

  const setStatus = async (row: Row, status: "approved" | "rejected" | "revoked") => {
    const payload = {
      user_id: row.user_id,
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    };
    const { error } = row.request_id
      ? await supabase.from("master_data_access_requests").update(payload).eq("id", row.request_id)
      : await supabase.from("master_data_access_requests").insert(payload);

    if (error) {
      toast.error("Gagal: " + error.message);
      return;
    }
    toast.success(
      status === "approved"
        ? "Akses Master Data diaktifkan"
        : status === "revoked"
        ? "Akses Master Data dinonaktifkan"
        : "Permintaan ditolak"
    );
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
  };

  const statusBadge = (s: Row["status"]) => {
    if (s === "pending") return <Badge variant="secondary">menunggu persetujuan</Badge>;
    if (s === "approved") return <Badge className="bg-green-600">aktif</Badge>;
    if (s === "rejected") return <Badge variant="destructive">ditolak</Badge>;
    if (s === "revoked") return <Badge variant="outline">nonaktif</Badge>;
    return <Badge variant="outline">belum ada akses</Badge>;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Permintaan Akses Master Data</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Aktifkan atau nonaktifkan akses Master Data untuk setiap akun guru kapan saja.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Akun Guru</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : data.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada akun guru.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead>Diajukan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Akses Master Data</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-medium">{r.nama_lengkap ?? r.user_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.requested_at ? new Date(r.requested_at).toLocaleString("id-ID") : "-"}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={r.status === "approved"}
                          onCheckedChange={(on) => setStatus(r, on ? "approved" : "revoked")}
                          aria-label="Aktifkan akses Master Data"
                        />
                        <span className="text-xs text-muted-foreground w-8 text-left">
                          {r.status === "approved" ? "ON" : "OFF"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => setStatus(r, "approved")}>
                            <Check className="h-4 w-4 mr-1" /> Setujui
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setStatus(r, "rejected")}>
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
