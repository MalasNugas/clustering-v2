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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Sheet 1: Jurusan (columns: nama)
      const jurusanSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jurusanRows = XLSX.utils.sheet_to_json<{ nama: string }>(jurusanSheet);

      if (jurusanRows.length > 0) {
        const { data: insertedJurusan, error: jErr } = await supabase
          .from("jurusan")
          .upsert(jurusanRows.map((r) => ({ nama: r.nama })), { onConflict: "nama", ignoreDuplicates: true })
          .select();
        if (jErr) throw jErr;

        // Sheet 2: Mata Pelajaran (columns: nama, jurusan)
        if (workbook.SheetNames.length >= 2) {
          const mapelSheet = workbook.Sheets[workbook.SheetNames[1]];
          const mapelRows = XLSX.utils.sheet_to_json<{ nama: string; jurusan: string }>(mapelSheet);
          
          const { data: allJurusan } = await supabase.from("jurusan").select("*");
          const jurusanMap = new Map((allJurusan ?? []).map((j) => [j.nama, j.id]));

          const mapelData = mapelRows.map((r) => ({
            nama: r.nama,
            jurusan_id: jurusanMap.get(r.jurusan) ?? null,
          }));
          if (mapelData.length > 0) {
            const { error: mErr } = await supabase.from("mata_pelajaran").insert(mapelData);
            if (mErr) throw mErr;
          }
        }

        // Sheet 3: Siswa (columns: nis, nama, jurusan)
        if (workbook.SheetNames.length >= 3) {
          const siswaSheet = workbook.Sheets[workbook.SheetNames[2]];
          const siswaRows = XLSX.utils.sheet_to_json<{ nis: string; nama: string; jurusan: string }>(siswaSheet);

          const { data: allJurusan } = await supabase.from("jurusan").select("*");
          const jurusanMap = new Map((allJurusan ?? []).map((j) => [j.nama, j.id]));

          const siswaData = siswaRows.map((r) => ({
            nis: String(r.nis),
            nama: r.nama,
            jurusan_id: jurusanMap.get(r.jurusan) ?? null,
          }));
          if (siswaData.length > 0) {
            const { error: sErr } = await supabase.from("siswa").insert(siswaData);
            if (sErr) throw sErr;
          }
        }

        // Sheet 4: Nilai (columns: nis, mata_pelajaran, nilai)
        if (workbook.SheetNames.length >= 4) {
          const nilaiSheet = workbook.Sheets[workbook.SheetNames[3]];
          const nilaiRows = XLSX.utils.sheet_to_json<{ nis: string; mata_pelajaran: string; nilai: number }>(nilaiSheet);

          const { data: allSiswa } = await supabase.from("siswa").select("id, nis");
          const { data: allMapel } = await supabase.from("mata_pelajaran").select("id, nama");
          const siswaMap = new Map((allSiswa ?? []).map((s) => [s.nis, s.id]));
          const mapelMap = new Map((allMapel ?? []).map((m) => [m.nama, m.id]));

          const nilaiData = nilaiRows
            .filter((r) => siswaMap.has(String(r.nis)) && mapelMap.has(r.mata_pelajaran))
            .map((r) => ({
              siswa_id: siswaMap.get(String(r.nis))!,
              mata_pelajaran_id: mapelMap.get(r.mata_pelajaran)!,
              nilai: r.nilai,
            }));
          if (nilaiData.length > 0) {
            const { error: nErr } = await supabase.from("nilai").insert(nilaiData);
            if (nErr) throw nErr;
          }
        }
      }

      toast.success("Data berhasil diimport!");
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
          <CardTitle className="text-base">Data Siswa</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSiswa ? (
            <p className="text-muted-foreground">Memuat data...</p>
          ) : siswa.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada data. Silakan import file Excel.</p>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jurusan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siswa.map((s: any, i: number) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{s.nis}</TableCell>
                      <TableCell>{s.nama}</TableCell>
                      <TableCell>{s.jurusan?.nama ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
