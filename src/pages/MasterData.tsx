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

  // Columns to skip (not subjects)
  const SKIP_COLUMNS = new Set(["no", "nama peserta didik", "nisn", "nis", "s", "i", "a"]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Parse header metadata (rows before the table header)
      let kelas = "";
      let headerRowIdx = -1;

      for (let i = 0; i < Math.min(allRows.length, 15); i++) {
        const row = allRows[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] ?? "").trim().toLowerCase();
        if (firstCell === "kelas") {
          kelas = String(row[2] ?? row[1] ?? "").trim();
        }
        // Detect header row by looking for "No" or "NISN" or "NIS"
        if (firstCell === "no") {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        throw new Error("Format tidak dikenali. Pastikan ada baris header dengan kolom 'No'.");
      }

      const headers: string[] = allRows[headerRowIdx].map((h: any) => String(h ?? "").trim());

      // Find column indices
      const namaCol = headers.findIndex((h) => h.toLowerCase().includes("nama"));
      const nisnCol = headers.findIndex((h) => h.toLowerCase().includes("nisn") || h.toLowerCase() === "nis");

      if (namaCol === -1 || nisnCol === -1) {
        throw new Error("Kolom 'Nama' atau 'NISN/NIS' tidak ditemukan.");
      }

      // Subject columns = all columns that are NOT in skip list
      const subjectColumns: { idx: number; name: string }[] = [];
      headers.forEach((h, idx) => {
        if (h && !SKIP_COLUMNS.has(h.toLowerCase())) {
          subjectColumns.push({ idx, name: h });
        }
      });

      // Extract jurusan from kelas (e.g., "12 TKP" -> "TKP")
      const jurusanNama = kelas.replace(/^\d+\s*/, "").trim() || "Umum";

      // 1. Upsert jurusan
      const { data: jurusanResult, error: jErr } = await supabase
        .from("jurusan")
        .upsert([{ nama: jurusanNama }], { onConflict: "nama", ignoreDuplicates: true })
        .select();
      if (jErr) throw jErr;

      const { data: allJurusan } = await supabase.from("jurusan").select("*");
      const jurusanId = (allJurusan ?? []).find((j) => j.nama === jurusanNama)?.id;

      // 2. Upsert mata pelajaran
      if (subjectColumns.length > 0) {
        for (const sc of subjectColumns) {
          await supabase
            .from("mata_pelajaran")
            .upsert([{ nama: sc.name, jurusan_id: jurusanId }], { onConflict: "nama", ignoreDuplicates: false })
            .select();
        }
      }
      const { data: allMapel } = await supabase.from("mata_pelajaran").select("id, nama");
      const mapelMap = new Map((allMapel ?? []).map((m) => [m.nama, m.id]));

      // 3. Insert siswa
      const dataRows = allRows.slice(headerRowIdx + 1).filter((row) => row && row[namaCol]);
      const siswaData = dataRows.map((row) => ({
        nis: String(row[nisnCol] ?? "").trim(),
        nama: String(row[namaCol] ?? "").trim(),
        jurusan_id: jurusanId ?? null,
      }));

      if (siswaData.length > 0) {
        const { error: sErr } = await supabase.from("siswa").insert(siswaData);
        if (sErr) throw sErr;
      }

      // 4. Insert nilai
      const { data: allSiswa } = await supabase.from("siswa").select("id, nis");
      const siswaMap = new Map((allSiswa ?? []).map((s) => [s.nis, s.id]));

      const nilaiData: { siswa_id: string; mata_pelajaran_id: string; nilai: number }[] = [];
      for (const row of dataRows) {
        const nis = String(row[nisnCol] ?? "").trim();
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
        const { error: nErr } = await supabase.from("nilai").insert(nilaiData);
        if (nErr) throw nErr;
      }

      toast.success(`Berhasil import ${siswaData.length} siswa, ${subjectColumns.length} mata pelajaran, dan ${nilaiData.length} nilai!`);
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
