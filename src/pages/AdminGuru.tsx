import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminGuru() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-guru-list"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: reqs }] = await Promise.all([
        supabase.from("profiles").select("user_id, nama_lengkap, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("master_data_access_requests")
          .select("user_id, status, requested_at")
          .order("requested_at", { ascending: false }),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const latestReq = new Map<string, string>();
      (reqs ?? []).forEach((r) => {
        if (!latestReq.has(r.user_id)) latestReq.set(r.user_id, r.status);
      });
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) ?? [],
        accessStatus: latestReq.get(p.user_id) ?? "none",
      }));
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Kelola Guru</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Daftar seluruh akun terdaftar beserta role dan status akses Master Data.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Akun Terdaftar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Akses Master Data</TableHead>
                  <TableHead>Terdaftar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.nama_lengkap}</TableCell>
                    <TableCell>
                      {u.roles.length === 0 ? (
                        <Badge variant="outline">tidak ada</Badge>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">
                            {r}
                          </Badge>
                        ))
                      )}
                    </TableCell>
                    <TableCell>
                      {u.roles.includes("admin") ? (
                        <Badge>admin (full access)</Badge>
                      ) : u.accessStatus === "approved" ? (
                        <Badge className="bg-green-600">disetujui</Badge>
                      ) : u.accessStatus === "pending" ? (
                        <Badge variant="secondary">menunggu</Badge>
                      ) : u.accessStatus === "rejected" ? (
                        <Badge variant="destructive">ditolak</Badge>
                      ) : (
                        <Badge variant="outline">belum request</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("id-ID")}
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
