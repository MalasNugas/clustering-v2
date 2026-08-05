import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Detail = { kelompok: string; k: number; iterasi: number; siswa: number };

type LogRow = {
  id: string;
  user_id: string;
  user_nama: string | null;
  action: string;
  group_count: number;
  student_count: number;
  normalized: boolean;
  details: Detail[];
  created_at: string;
};

const actionLabel = (a: string) =>
  a === "run" ? "Jalankan K-Means" : a === "reset" ? "Reset Hasil" : a;

export default function AdminLogs() {
  const qc = useQueryClient();
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["clustering-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clustering_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        details: Array.isArray(r.details) ? (r.details as Detail[]) : [],
      })) as LogRow[];
    },
  });

  const users = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of data) m.set(r.user_id, r.user_nama ?? r.user_id);
    return Array.from(m.entries());
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (userFilter !== "all" && r.user_id !== userFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      const t = new Date(r.created_at).getTime();
      if (from && t < new Date(from + "T00:00:00").getTime()) return false;
      if (to && t > new Date(to + "T23:59:59").getTime()) return false;
      return true;
    });
  }, [data, userFilter, actionFilter, from, to]);

  const lastAt = data[0]?.created_at;

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada log untuk diekspor");
      return;
    }
    const rows = filtered.map((r) => ({
      Waktu: new Date(r.created_at).toLocaleString("id-ID"),
      Pengguna: r.user_nama ?? r.user_id,
      Aksi: actionLabel(r.action),
      "Jumlah Kelompok": r.group_count,
      "Total Siswa": r.student_count,
      Normalisasi: r.normalized ? "Ya" : "Tidak",
      Rincian: r.details
        .map((d) => `${d.kelompok} (K=${d.k}, ${d.iterasi} iterasi, ${d.siswa} siswa)`)
        .join("; "),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Log Klasterisasi");
    XLSX.writeFile(wb, "log-klasterisasi.xlsx");
  };

  const handleClear = async () => {
    const { error } = await supabase
      .from("clustering_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error("Gagal menghapus log: " + error.message);
    else {
      toast.success("Riwayat log dihapus");
      qc.invalidateQueries({ queryKey: ["clustering-logs"] });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Log Klasterisasi</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Riwayat aktivitas klasterisasi yang dijalankan oleh guru dan admin.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Aksi</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pengguna Aktif</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Aksi Terakhir</p>
            <p className="text-sm font-medium mt-1">
              {lastAt ? new Date(lastAt).toLocaleString("id-ID") : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Riwayat Aktivitas</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export Excel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={data.length === 0}>
                  <Trash2 className="h-4 w-4 mr-1" /> Hapus Log
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus seluruh riwayat log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak dapat dibatalkan. Semua catatan aktivitas klasterisasi akan
                    dihapus permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4 mb-4">
            <div>
              <Label className="text-xs">Pengguna</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua pengguna</SelectItem>
                  {users.map(([id, nama]) => (
                    <SelectItem key={id} value={id}>
                      {nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Aksi</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua aksi</SelectItem>
                  <SelectItem value="run">Jalankan K-Means</SelectItem>
                  <SelectItem value="reset">Reset Hasil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dari tanggal</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Sampai tanggal</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada aktivitas tercatat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Waktu</TableHead>
                  <TableHead>Nama Pengguna</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead className="text-right">Kelompok</TableHead>
                  <TableHead className="text-right">Total Siswa</TableHead>
                  <TableHead>Normalisasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <>
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <TableCell>
                        {r.details.length > 0 &&
                          (expanded === r.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          ))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="font-medium">{r.user_nama ?? r.user_id}</TableCell>
                      <TableCell>
                        {r.action === "run" ? (
                          <Badge>Hasil K-Means</Badge>
                        ) : (
                          <Badge variant="secondary">Reset Hasil</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{r.group_count}</TableCell>
                      <TableCell className="text-right">{r.student_count}</TableCell>
                      <TableCell>{r.normalized ? "Ya" : "Tidak"}</TableCell>
                    </TableRow>
                    {expanded === r.id && r.details.length > 0 && (
                      <TableRow key={r.id + "-d"}>
                        <TableCell colSpan={7} className="bg-muted/40">
                          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-xs py-2">
                            {r.details.map((d, i) => (
                              <div key={i} className="flex justify-between gap-2 border-b py-1">
                                <span className="font-medium">{d.kelompok}</span>
                                <span className="text-muted-foreground">
                                  K={d.k} · {d.iterasi} iterasi · {d.siswa} siswa
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
