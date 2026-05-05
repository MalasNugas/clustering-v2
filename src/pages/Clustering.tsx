import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw, Download } from "lucide-react";
import { toast } from "sonner";
import { kMeans, DataPoint } from "@/lib/kmeans";
import * as XLSX from "xlsx";

const clusterColors = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-warning text-warning-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-secondary text-secondary-foreground",
];

const clusterLabels: Record<number, string> = {
  1: "Rendah",
  2: "Sedang",
  3: "Tinggi",
};

export default function Clustering() {
  const queryClient = useQueryClient();
  const [k, setK] = useState(3);
  const [running, setRunning] = useState(false);
  const [iterationInfo, setIterationInfo] = useState<{ jurusan: string; iters: number }[]>([]);

  const { data: jurusan = [] } = useQuery({
    queryKey: ["jurusan"],
    queryFn: async () => {
      const { data } = await supabase.from("jurusan").select("*").order("nama");
      return data ?? [];
    },
  });

  const { data: siswa = [] } = useQuery({
    queryKey: ["siswa"],
    queryFn: async () => {
      const { data } = await supabase.from("siswa").select("*, jurusan(nama)").order("nama");
      return data ?? [];
    },
  });

  const { data: mapel = [] } = useQuery({
    queryKey: ["mapel"],
    queryFn: async () => {
      const { data } = await supabase.from("mata_pelajaran").select("*");
      return data ?? [];
    },
  });

  const { data: nilai = [] } = useQuery({
    queryKey: ["nilai"],
    queryFn: async () => {
      // Supabase default limit is 1000; fetch all in batches
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("nilai")
          .select("*")
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

  const { data: hasilKlaster = [], refetch: refetchHasil } = useQuery({
    queryKey: ["hasil-klaster"],
    queryFn: async () => {
      const { data } = await supabase.from("hasil_klaster").select("*");
      return data ?? [];
    },
  });

  const runClustering = async () => {
    if (siswa.length === 0 || mapel.length === 0 || nilai.length === 0) {
      toast.error("Data belum lengkap. Silakan import data terlebih dahulu.");
      return;
    }
    setRunning(true);

    try {
      await supabase.from("hasil_klaster").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const iterInfo: { jurusan: string; iters: number }[] = [];
      const allInsert: { siswa_id: string; klaster: number; iterasi: number; jurusan_id: string }[] = [];

      // Preset to reproduce the reference Excel result
      const PRESET: Record<string, { mapelOrder: string[]; centroids: number[][] }> = {
        "KELAS 10": {
          mapelOrder: ["KODING", "BI", "MTK", "INFOR", "KEJU"],
          centroids: [
            [76, 73, 75, 79, 89],
            [80, 74, 70, 75, 75],
            [91, 85, 78, 83, 80],
          ],
        },
        "KELAS 11": {
          mapelOrder: ["INFOR", "KIK", "KEJU"],
          centroids: [
            [71, 80, 89],
            [83, 80, 90],
            [92, 80, 91],
          ],
        },
      };

      // Run K-Means per jurusan
      for (const j of jurusan as any[]) {
        const jSiswa = (siswa as any[]).filter((s) => s.jurusan_id === j.id);
        const jMapel = (mapel as any[]).filter((m) => m.jurusan_id === j.id);
        if (jSiswa.length < k || jMapel.length === 0) continue;

        const preset = PRESET[j.nama];
        let sortedMapel: any[];
        if (preset) {
          sortedMapel = preset.mapelOrder
            .map((nm) => jMapel.find((m: any) => m.nama === nm))
            .filter(Boolean);
          // Append any leftover mapel not in preset
          for (const m of jMapel) if (!sortedMapel.includes(m)) sortedMapel.push(m);
        } else {
          sortedMapel = [...jMapel].sort((a: any, b: any) => a.nama.localeCompare(b.nama));
        }

        const dataPoints: DataPoint[] = jSiswa.map((s: any) => {
          const scores = sortedMapel.map((m: any) => {
            const n = (nilai as any[]).find(
              (v) => v.siswa_id === s.id && v.mata_pelajaran_id === m.id
            );
            return n ? Number(n.nilai) : 0;
          });
          return { id: s.id, values: scores };
        });

        const initialCentroids =
          preset && preset.centroids.length === k ? preset.centroids : undefined;

        const { results, iterations } = kMeans(dataPoints, k, 100, initialCentroids);
        iterInfo.push({ jurusan: j.nama, iters: iterations });

        for (const r of results) {
          allInsert.push({
            siswa_id: r.id,
            klaster: r.cluster,
            iterasi: iterations,
            jurusan_id: j.id,
          });
        }
      }

      if (allInsert.length > 0) {
        const { error } = await supabase.from("hasil_klaster").insert(allInsert);
        if (error) throw error;
      }

      setIterationInfo(iterInfo);
      toast.success(`Klasterisasi selesai untuk ${iterInfo.length} jurusan!`);
      refetchHasil();
      queryClient.invalidateQueries({ queryKey: ["hasil-klaster"] });
    } catch (err: any) {
      toast.error("Gagal: " + (err.message || "Unknown error"));
    } finally {
      setRunning(false);
    }
  };

  const handleReset = async () => {
    await supabase.from("hasil_klaster").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setIterationInfo([]);
    refetchHasil();
    toast.success("Hasil klasterisasi direset");
  };

  const handleExport = () => {
    if ((hasilKlaster as any[]).length === 0) {
      toast.error("Belum ada hasil klasterisasi untuk diekspor");
      return;
    }
    const wb = XLSX.utils.book_new();
    const klMap = new Map((hasilKlaster as any[]).map((h) => [h.siswa_id, h.klaster]));
    const nilaiMap = new Map<string, Record<string, number>>();
    for (const n of nilai as any[]) {
      if (!nilaiMap.has(n.siswa_id)) nilaiMap.set(n.siswa_id, {});
      nilaiMap.get(n.siswa_id)![n.mata_pelajaran_id] = Number(n.nilai);
    }
    for (const j of jurusan as any[]) {
      const jSiswa = (siswa as any[]).filter((s) => s.jurusan_id === j.id);
      if (jSiswa.length === 0) continue;
      const jMapel = (mapel as any[])
        .filter((m) => m.jurusan_id === j.id)
        .sort((a, b) => a.nama.localeCompare(b.nama));
      const header = ["No", "Nama", "Kelas", ...jMapel.map((m) => m.nama), "Klaster", "Keterangan"];
      const rows = jSiswa.map((s: any, i: number) => {
        const cl = klMap.get(s.id);
        const sn = nilaiMap.get(s.id) ?? {};
        return [
          i + 1,
          s.nama,
          j.nama,
          ...jMapel.map((m) => (sn[m.id] != null ? sn[m.id] : "")),
          cl ?? "",
          cl ? clusterLabels[cl as number] ?? "" : "",
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, j.nama.substring(0, 31));
    }
    XLSX.writeFile(wb, `Hasil_Klasterisasi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Berhasil mengekspor hasil klasterisasi");
  };

  const klasterMap = new Map((hasilKlaster as any[]).map((h) => [h.siswa_id, h.klaster]));

  const clusterSummary = Array.from({ length: k }, (_, i) => {
    const members = (hasilKlaster as any[]).filter((h) => h.klaster === i + 1);
    return { cluster: i + 1, count: members.length, label: clusterLabels[i + 1] ?? `K${i + 1}` };
  });

  // Group siswa by jurusan for display
  const siswaByJurusan = (jurusan as any[]).map((j) => ({
    jurusan: j,
    siswa: (siswa as any[]).filter((s) => s.jurusan_id === j.id),
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Klasterisasi K-Means</h2>

      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Konfigurasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="k-value">Jumlah Klaster (K)</Label>
              <Input
                id="k-value"
                type="number"
                min={2}
                max={10}
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Button onClick={runClustering} disabled={running}>
              <Play className="mr-2 h-4 w-4" />
              {running ? "Memproses..." : "Jalankan K-Means"}
            </Button>
            {(hasilKlaster as any[]).length > 0 && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
            {(hasilKlaster as any[]).length > 0 && (
              <Button variant="secondary" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            )}
          </div>
          {iterationInfo.length > 0 && (
            <div className="mt-3 text-sm text-muted-foreground space-y-1">
              {iterationInfo.map((i) => (
                <p key={i.jurusan}>
                  <strong>{i.jurusan}</strong>: konvergen dalam {i.iters} iterasi
                </p>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Klaster 1 = Rendah, 2 = Sedang, 3 = Tinggi (urutan tergantung sebaran data per kelas).
          </p>
        </CardContent>
      </Card>

      {(hasilKlaster as any[]).length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {clusterSummary.map((cs) => (
              <Card key={cs.cluster} className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Klaster {cs.cluster} — {cs.label}
                      </p>
                      <p className="text-2xl font-bold">{cs.count} siswa</p>
                    </div>
                    <Badge className={clusterColors[(cs.cluster - 1) % clusterColors.length]}>
                      K{cs.cluster}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {siswaByJurusan.map(({ jurusan: j, siswa: jSiswa }) => {
            if (jSiswa.length === 0) return null;
            const jMapel = (mapel as any[])
              .filter((m) => m.jurusan_id === j.id)
              .sort((a, b) => a.nama.localeCompare(b.nama));
            const nilaiBySiswa = new Map<string, Record<string, number>>();
            for (const n of nilai as any[]) {
              if (!nilaiBySiswa.has(n.siswa_id)) nilaiBySiswa.set(n.siswa_id, {});
              nilaiBySiswa.get(n.siswa_id)![n.mata_pelajaran_id] = Number(n.nilai);
            }
            return (
              <Card key={j.id} className="shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Hasil Klasterisasi — {j.nama}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Jurusan</TableHead>
                          {jMapel.map((m) => (
                            <TableHead key={m.id} className="text-center">{m.nama}</TableHead>
                          ))}
                          <TableHead className="text-right sticky right-0 bg-background">Klaster</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jSiswa.map((s: any, i: number) => {
                          const cl = klasterMap.get(s.id);
                          const sNilai = nilaiBySiswa.get(s.id) ?? {};
                          return (
                            <TableRow key={s.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">{s.nama}</TableCell>
                              <TableCell>{s.jurusan?.nama ?? j.nama}</TableCell>
                              {jMapel.map((m) => (
                                <TableCell key={m.id} className="text-center">
                                  {sNilai[m.id] != null ? sNilai[m.id] : "-"}
                                </TableCell>
                              ))}
                              <TableCell className="text-right sticky right-0 bg-background">
                                {cl ? (
                                  <Badge className={clusterColors[(cl - 1) % clusterColors.length]}>
                                    Klaster {cl} — {clusterLabels[cl] ?? ""}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
