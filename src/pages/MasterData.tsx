import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function MasterData() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  const { data: siswa = [], isLoading: loadingSiswa } = useQuery({
    queryKey: ["siswa"],
    queryFn: async () => {
      const { data } = await supabase.from("siswa").select("*, jurusan(nama)").order("nama");
      return data ?? [];
    },
  });

  const { data: nilai = [] } = useQuery({
    queryKey: ["nilai"],
    queryFn: async () => {
      const { data } = await supabase.from("nilai").select("*, mata_pelajaran(nama), siswa(nama, nis)");
      return data ?? [];
    },
  });

  const { data: mapel = [] } = useQuery({
    queryKey: ["mapel"],
    queryFn: async () => {
      const { data } = await supabase.from("mata_pelajaran").select("*, jurusan(nama)");
      return data ?? [];
    },
  });

  // Headers that mark end of subject columns (next iteration block / metadata)
  const STOP_HEADERS = new Set([
    "centroid", "c1", "c2", "c3", "c4", "c5", "terdekat", "cluster",
    "no", "nama", "nama peserta didik", "iterasi",
  ]);
  const SKIP_HEADERS = new Set(["nisn", "nis", "s", "i", "a"]);

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

        // Find header row: contains "No" and a name column
        let headerRowIdx = -1;
        let noCol = -1;
        let namaCol = -1;
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = allRows[i] ?? [];
          const nIdx = row.findIndex((c) => String(c ?? "").trim().toLowerCase() === "no");
          const naIdx = row.findIndex((c) => String(c ?? "").trim().toUpperCase().startsWith("NAMA"));
          if (nIdx !== -1 && naIdx !== -1) {
            headerRowIdx = i;
            noCol = nIdx;
            namaCol = naIdx;
            break;
          }
        }
        if (headerRowIdx === -1) continue;

        // Subject columns: scan rightwards from namaCol+1, stop at first empty/null header
        const headerRow = allRows[headerRowIdx];
        const subjectColumns: { idx: number; name: string }[] = [];
        for (let c = namaCol + 1; c < headerRow.length; c++) {
          const h = String(headerRow[c] ?? "").trim();
          if (!h) break;
          if (SKIP_COLUMNS.has(h.toLowerCase())) continue;
          subjectColumns.push({ idx: c, name: h.toUpperCase() });
          allSubjectNames.add(h.toUpperCase());
        }
        if (subjectColumns.length === 0) continue;

        // Jurusan = sheet name cleaned
        const jurusanNama = sheetName.replace(/^(NEW\s+)?/i, "").trim().toUpperCase();

        await supabase
          .from("jurusan")
          .upsert([{ nama: jurusanNama }], { onConflict: "nama", ignoreDuplicates: true });
        const { data: allJurusan } = await supabase.from("jurusan").select("*");
        const jurusanId = (allJurusan ?? []).find((j) => j.nama === jurusanNama)?.id;

        // Upsert mata pelajaran (scoped by jurusan name in nama to avoid clash)
        for (const sc of subjectColumns) {
          await supabase
            .from("mata_pelajaran")
            .upsert([{ nama: sc.name, jurusan_id: jurusanId }], { onConflict: "nama", ignoreDuplicates: false });
        }
        const { data: allMapel } = await supabase.from("mata_pelajaran").select("id, nama");
        const mapelMap = new Map((allMapel ?? []).map((m) => [m.nama, m.id]));

        // Build siswa rows
        const dataRows = allRows.slice(headerRowIdx + 1).filter((r) => r && r[namaCol] && r[noCol] != null);
        const siswaData = dataRows.map((row) => ({
          nis: `${jurusanNama}-${String(row[noCol]).padStart(3, "0")}`,
          nama: String(row[namaCol] ?? "").trim(),
          jurusan_id: jurusanId ?? null,
        }));

        if (siswaData.length > 0) {
          await supabase.from("siswa").insert(siswaData);
        }
        totalSiswa += siswaData.length;

        const { data: allSiswa } = await supabase.from("siswa").select("id, nis");
        const siswaMap = new Map((allSiswa ?? []).map((s) => [s.nis, s.id]));

        const nilaiData: { siswa_id: string; mata_pelajaran_id: string; nilai: number }[] = [];
        for (const row of dataRows) {
          const nis = `${jurusanNama}-${String(row[noCol]).padStart(3, "0")}`;
          const siswaId = siswaMap.get(nis);
          if (!siswaId) continue;
          for (const sc of subjectColumns) {
            const val = row[sc.idx];
            if (val != null && val !== "" && !isNaN(Number(val))) {
              const mapelId = mapelMap.get(sc.name);
              if (mapelId) {
                nilaiData.push({ siswa_id: siswaId, mata_pelajaran_id: mapelId, nilai: Number(val) });
              }
            }
          }
        }
        if (nilaiData.length > 0) {
          await supabase.from("nilai").insert(nilaiData);
        }
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
    await supabase.from("hasil_klaster").delete().neq("id", "");
    await supabase.from("nilai").delete().neq("id", "");
    await supabase.from("siswa").delete().neq("id", "");
    await supabase.from("mata_pelajaran").delete().neq("id", "");
    await supabase.from("jurusan").delete().neq("id", "");
    toast.success("Semua data berhasil dihapus");
    queryClient.invalidateQueries();
  };

  // Build nilai map for display: siswa_id -> { mapel_nama: nilai }
  const nilaiMap = new Map<string, Record<string, number>>();
  for (const n of nilai as any[]) {
    const sid = n.siswa?.nis ?? n.siswa_id;
    if (!nilaiMap.has(n.siswa_id)) nilaiMap.set(n.siswa_id, {});
    nilaiMap.get(n.siswa_id)![n.mata_pelajaran?.nama ?? ""] = n.nilai;
  }

  const mapelNames = (mapel as any[]).map((m) => m.nama);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold">Master Data</h2>
        <div className="flex gap-2">
          <Button asChild variant="default" disabled={importing}>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import Excel"}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
          </Button>
          <Button variant="destructive" onClick={handleClearAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus Semua
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Data Siswa & Nilai</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSiswa ? (
            <p className="text-muted-foreground">Memuat data...</p>
          ) : siswa.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada data. Silakan import file Excel leger nilai.</p>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jurusan</TableHead>
                    {mapelNames.map((m) => (
                      <TableHead key={m} className="text-center">{m}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(siswa as any[]).map((s, i) => {
                    const sNilai = nilaiMap.get(s.id) ?? {};
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{s.nis}</TableCell>
                        <TableCell>{s.nama}</TableCell>
                        <TableCell>{s.jurusan?.nama ?? "-"}</TableCell>
                        {mapelNames.map((m) => (
                          <TableCell key={m} className="text-center">
                            {sNilai[m] != null ? sNilai[m] : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
