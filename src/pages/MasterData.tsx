import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, Plus, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Siswa = { id: string; nis: string; nama: string; jurusan_id: string | null; jurusan?: { nama: string } | null };
type Jurusan = { id: string; nama: string };
type Mapel = { id: string; nama: string; jurusan_id: string | null };

export default function MasterData() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [filterJurusan, setFilterJurusan] = useState<string>("all");

  // pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Siswa | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formJurusan, setFormJurusan] = useState<string>("");
  const [formNilai, setFormNilai] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<Siswa | null>(null);

  const { data: siswa = [], isLoading: loadingSiswa } = useQuery({
    queryKey: ["siswa"],
    queryFn: async () => {
      const { data } = await supabase.from("siswa").select("*, jurusan(nama)").order("nama");
      return (data ?? []) as Siswa[];
    },
  });

  const { data: nilai = [] } = useQuery({
    queryKey: ["nilai"],
    queryFn: async () => {
      // Supabase default limit is 1000 rows; fetch all in batches
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("nilai")
          .select("*, mata_pelajaran(nama, jurusan_id)")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  const { data: mapel = [] } = useQuery({
    queryKey: ["mapel"],
    queryFn: async () => {
      const { data } = await supabase.from("mata_pelajaran").select("*, jurusan(nama)");
      return (data ?? []) as Mapel[];
    },
  });

  const { data: jurusan = [] } = useQuery({
    queryKey: ["jurusan"],
    queryFn: async () => {
      const { data } = await supabase.from("jurusan").select("*").order("nama");
      return (data ?? []) as Jurusan[];
    },
  });

  // ============= IMPORT =============
  const STOP_HEADERS = new Set([
    "centroid", "c1", "c2", "c3", "c4", "c5", "terdekat", "cluster",
    "no", "nama", "nama peserta didik", "iterasi",
  ]);
  const SKIP_HEADERS = new Set(["nisn", "nis", "s", "i", "a"]);

  const insertBatched = async (table: "siswa" | "nilai" | "mata_pelajaran", rows: any[], size = 200) => {
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) throw new Error(`Insert ${table} gagal: ${error.message}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf);

      let totalSiswa = 0;
      let totalNilai = 0;
      const allSubjectNames = new Set<string>();

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerRowIdx = -1, namaCol = -1;
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = allRows[i] ?? [];
          const nIdx = row.findIndex((c) => String(c ?? "").trim().toLowerCase() === "no");
          const naIdx = row.findIndex((c) => String(c ?? "").trim().toUpperCase().startsWith("NAMA"));
          if (nIdx !== -1 && naIdx !== -1) { headerRowIdx = i; namaCol = naIdx; break; }
        }
        if (headerRowIdx === -1) continue;

        const headerRow = allRows[headerRowIdx];
        const subjectColumns: { idx: number; name: string }[] = [];
        for (let c = namaCol + 1; c < headerRow.length; c++) {
          const h = String(headerRow[c] ?? "").trim();
          if (!h) continue;
          const hl = h.toLowerCase();
          if (STOP_HEADERS.has(hl)) break;
          if (SKIP_HEADERS.has(hl)) continue;
          subjectColumns.push({ idx: c, name: h.toUpperCase() });
          allSubjectNames.add(h.toUpperCase());
        }
        if (subjectColumns.length === 0) continue;

        const jurusanNama = sheetName.replace(/^(NEW\s+)?/i, "").trim().toUpperCase();
        const { data: existingJ } = await supabase.from("jurusan").select("*").eq("nama", jurusanNama).maybeSingle();
        let jurusanId = existingJ?.id;
        if (!jurusanId) {
          const { data: newJ, error: errNJ } = await supabase.from("jurusan").insert({ nama: jurusanNama }).select().single();
          if (errNJ) throw new Error(`Insert jurusan gagal: ${errNJ.message}`);
          jurusanId = newJ?.id;
        }

        const { data: existingMapel } = await supabase.from("mata_pelajaran").select("id, nama").eq("jurusan_id", jurusanId);
        const existingNames = new Set((existingMapel ?? []).map((m) => m.nama));
        const newMapel = subjectColumns.filter((sc) => !existingNames.has(sc.name))
          .map((sc) => ({ nama: sc.name, jurusan_id: jurusanId }));
        if (newMapel.length > 0) await insertBatched("mata_pelajaran", newMapel);
        const { data: allMapelForJurusan } = await supabase.from("mata_pelajaran").select("id, nama").eq("jurusan_id", jurusanId);
        const mapelMap = new Map((allMapelForJurusan ?? []).map((m) => [m.nama, m.id]));

        const dataRows = allRows.slice(headerRowIdx + 1)
          .filter((r) => r && String(r[namaCol] ?? "").trim() !== "");
        const makeNis = (i: number) => `${jurusanNama}-${String(i + 1).padStart(3, "0")}`;
        const siswaData = dataRows.map((row, i) => ({
          nis: makeNis(i),
          nama: String(row[namaCol] ?? "").trim(),
          jurusan_id: jurusanId ?? null,
        }));
        if (siswaData.length > 0) await insertBatched("siswa", siswaData);
        totalSiswa += siswaData.length;

        const { data: allSiswa } = await supabase.from("siswa").select("id, nis").eq("jurusan_id", jurusanId);
        const siswaMap = new Map((allSiswa ?? []).map((s) => [s.nis, s.id]));

        const nilaiData: { siswa_id: string; mata_pelajaran_id: string; nilai: number }[] = [];
        dataRows.forEach((row, i) => {
          const siswaId = siswaMap.get(makeNis(i));
          if (!siswaId) return;
          for (const sc of subjectColumns) {
            const val = row[sc.idx];
            if (val != null && val !== "" && !isNaN(Number(val))) {
              const mapelId = mapelMap.get(sc.name);
              if (mapelId) nilaiData.push({ siswa_id: siswaId, mata_pelajaran_id: mapelId, nilai: Number(val) });
            }
          }
        });
        if (nilaiData.length > 0) await insertBatched("nilai", nilaiData, 500);
        totalNilai += nilaiData.length;
      }

      toast.success(`Berhasil import ${totalSiswa} siswa, ${allSubjectNames.size} mata pelajaran, ${totalNilai} nilai!`);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error("Gagal import: " + (err.message || "Unknown error"));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Hapus semua data?")) return;
    await supabase.from("hasil_klaster").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("nilai").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("siswa").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("mata_pelajaran").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("jurusan").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success("Semua data berhasil dihapus");
    queryClient.invalidateQueries();
  };

  // ============= CRUD =============
  // nilai map: siswa_id -> { mapel_id: nilai }
  const nilaiBySiswa = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const n of nilai as any[]) {
      if (!m.has(n.siswa_id)) m.set(n.siswa_id, {});
      m.get(n.siswa_id)![n.mata_pelajaran_id] = Number(n.nilai);
    }
    return m;
  }, [nilai]);

  const mapelByJurusan = useMemo(() => {
    const m = new Map<string, Mapel[]>();
    for (const mp of mapel) {
      const k = mp.jurusan_id ?? "";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(mp);
    }
    return m;
  }, [mapel]);

  const openAdd = () => {
    setEditing(null);
    setFormNama("");
    setFormJurusan(filterJurusan !== "all" ? filterJurusan : (jurusan[0]?.id ?? ""));
    setFormNilai({});
    setDialogOpen(true);
  };

  const openEdit = (s: Siswa) => {
    setEditing(s);
    setFormNama(s.nama);
    setFormJurusan(s.jurusan_id ?? "");
    const existing = nilaiBySiswa.get(s.id) ?? {};
    const obj: Record<string, string> = {};
    for (const [k, v] of Object.entries(existing)) obj[k] = String(v);
    setFormNilai(obj);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formNama.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!formJurusan) { toast.error("Kelas wajib dipilih"); return; }
    try {
      let siswaId = editing?.id;
      const jurusanNama = jurusan.find((j) => j.id === formJurusan)?.nama ?? "X";
      if (editing) {
        const { error } = await supabase.from("siswa")
          .update({ nama: formNama.trim(), jurusan_id: formJurusan })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const nis = `${jurusanNama}-${Date.now().toString().slice(-6)}`;
        const { data, error } = await supabase.from("siswa")
          .insert({ nis, nama: formNama.trim(), jurusan_id: formJurusan })
          .select().single();
        if (error) throw error;
        siswaId = data.id;
      }

      // upsert nilai: delete existing then insert
      if (siswaId) {
        await supabase.from("nilai").delete().eq("siswa_id", siswaId);
        const rows = Object.entries(formNilai)
          .filter(([, v]) => v !== "" && !isNaN(Number(v)))
          .map(([mapel_id, v]) => ({ siswa_id: siswaId!, mata_pelajaran_id: mapel_id, nilai: Number(v) }));
        if (rows.length) {
          const { error } = await supabase.from("nilai").insert(rows);
          if (error) throw error;
        }
      }
      toast.success(editing ? "Data siswa diperbarui" : "Siswa baru ditambahkan");
      setDialogOpen(false);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supabase.from("nilai").delete().eq("siswa_id", deleteTarget.id);
      await supabase.from("hasil_klaster").delete().eq("siswa_id", deleteTarget.id);
      const { error } = await supabase.from("siswa").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Siswa dihapus");
      setDeleteTarget(null);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error("Gagal hapus: " + err.message);
    }
  };

  // ============= DISPLAY =============
  const filteredSiswa = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (siswa as Siswa[]).filter((s) => {
      if (filterJurusan !== "all" && s.jurusan_id !== filterJurusan) return false;
      if (q && !s.nama.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [siswa, search, filterJurusan]);

  // mapel columns shown depend on filter — if specific jurusan, show only that jurusan's mapel
  const visibleMapel = useMemo(() => {
    if (filterJurusan !== "all") return mapelByJurusan.get(filterJurusan) ?? [];
    return mapel;
  }, [filterJurusan, mapel, mapelByJurusan]);

  const formMapel = formJurusan ? (mapelByJurusan.get(formJurusan) ?? []) : [];

  // pagination derived
  const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = filteredSiswa.slice(startIdx, startIdx + pageSize);

  // reset to page 1 when filters/pageSize change
  // reset to page 1 when filters/pageSize change
  useEffect(() => { setPage(1); }, [search, filterJurusan, pageSize]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold">Master Data</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="default" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Siswa
          </Button>
          <Button asChild variant="secondary" disabled={importing}>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import Excel"}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
          </Button>
          <Button variant="destructive" onClick={handleClearAll}>
            <Trash2 className="mr-2 h-4 w-4" /> Hapus Semua
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">Data Siswa & Nilai</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterJurusan} onValueChange={setFilterJurusan}>
              <SelectTrigger className="sm:w-64"><SelectValue placeholder="Filter kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {jurusan.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredSiswa.length} dari {siswa.length} siswa
          </p>
        </CardHeader>
        <CardContent>
          {loadingSiswa ? (
            <p className="text-muted-foreground">Memuat data...</p>
          ) : filteredSiswa.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tidak ada data yang cocok.</p>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelas</TableHead>
                    {visibleMapel.map((m) => (
                      <TableHead key={m.id} className="text-center">{m.nama}</TableHead>
                    ))}
                    <TableHead className="text-right sticky right-0 bg-background">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((s, i) => {
                    const sNilai = nilaiBySiswa.get(s.id) ?? {};
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{startIdx + i + 1}</TableCell>
                        <TableCell className="font-medium">{s.nama}</TableCell>
                        <TableCell>{s.jurusan?.nama ?? "-"}</TableCell>
                        {visibleMapel.map((m) => (
                          <TableCell key={m.id} className="text-center">
                            {sNilai[m.id] != null ? sNilai[m.id] : "-"}
                          </TableCell>
                        ))}
                        <TableCell className="text-right sticky right-0 bg-background">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(s)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredSiswa.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Baris per halaman</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100, 200].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                {startIdx + 1}–{Math.min(startIdx + pageSize, filteredSiswa.length)} dari {filteredSiswa.length}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage === 1}>«</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                <span className="px-3 text-sm">Hal {currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={formNama} onChange={(e) => setFormNama(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={formJurusan} onValueChange={setFormJurusan}>
                <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {jurusan.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formMapel.length > 0 && (
              <div className="space-y-2">
                <Label>Nilai Mata Pelajaran</Label>
                <div className="grid grid-cols-2 gap-2">
                  {formMapel.map((m) => (
                    <div key={m.id} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{m.nama}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formNilai[m.id] ?? ""}
                        onChange={(e) => setFormNilai((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Data siswa <b>{deleteTarget?.nama}</b> beserta seluruh nilainya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
