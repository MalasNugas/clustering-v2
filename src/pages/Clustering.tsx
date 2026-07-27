import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RotateCcw, Download } from "lucide-react";
import { toast } from "sonner";
import { kMeans, DataPoint } from "@/lib/kmeans";
import { minMaxNormalize } from "@/lib/normalize";
import * as XLSX from "xlsx";

const K = 3;

const clusterColors = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-warning text-warning-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-secondary text-secondary-foreground",
];

const clusterLabels: Record<number, string> = { 1: "Tinggi", 2: "Sedang", 3: "Rendah" };

export default function Clustering() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [klasterFilter, setKlasterFilter] = useState<string>("all");
  const [kelompokFilter, setKelompokFilter] = useState<string>("all");
  const [showNormalized, setShowNormalized] = useState(false);

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
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase.from("nilai").select("*").range(from, from + pageSize - 1);
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

  // nilai per siswa
  const nilaiBySiswa = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const n of nilai as any[]) {
      if (!m.has(n.siswa_id)) m.set(n.siswa_id, {});
      m.get(n.siswa_id)![n.mata_pelajaran_id] = Number(n.nilai);
    }
    return m;
  }, [nilai]);

  // Fitur (mapel yang dipakai) per kelompok
  const featureMapel = (jurusanId: string) =>
    (mapel as any[]).filter((m) => m.jurusan_id === jurusanId && m.dipakai_klaster);

  const groupData = (jurusanId: string) => {
    const jSiswa = (siswa as any[]).filter((s) => s.jurusan_id === jurusanId);
    const feats = featureMapel(jurusanId);
    const raw = jSiswa.map((s) => feats.map((m) => nilaiBySiswa.get(s.id)?.[m.id] ?? 0));
    const normalized = minMaxNormalize(raw);
    return { jSiswa, feats, raw, normalized };
  };

  const runClustering = async () => {
    if (siswa.length === 0 || mapel.length === 0 || nilai.length === 0) {
      toast.error("Data belum lengkap. Silakan import data terlebih dahulu.");
      return;
    }
    setRunning(true);
    try {
      await supabase.from("hasil_klaster").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const allInsert: { siswa_id: string; klaster: number; iterasi: number; jurusan_id: string }[] = [];
      let processed = 0;

      // Perhitungan dilakukan TERPISAH untuk setiap kelas + jurusan
      for (const j of jurusan as any[]) {
        const { jSiswa, feats, raw, normalized } = groupData(j.id);
        if (jSiswa.length < K || feats.length === 0) continue;

        const dataPoints: DataPoint[] = jSiswa.map((s: any, i: number) => ({
          id: s.id,
          values: normalized[i],
        }));

        const { results, iterations } = kMeans(dataPoints, K, 100);

        // Penamaan klaster: rata-rata nilai ASLI tertinggi = Klaster 1 (Tinggi)
        const avgByCluster = new Map<number, number>();
        for (let c = 1; c <= K; c++) {
          const idxs = results.map((r, i) => (r.cluster === c ? i : -1)).filter((i) => i >= 0);
          if (idxs.length === 0) continue;
          const avg =
            idxs.reduce((s, i) => s + raw[i].reduce((a, b) => a + b, 0) / (raw[i].length || 1), 0) /
            idxs.length;
          avgByCluster.set(c, avg);
        }
        const ranked = Array.from(avgByCluster.entries()).sort((a, b) => b[1] - a[1]);
        const remap = new Map<number, number>();
        ranked.forEach(([c], i) => remap.set(c, i + 1));

        for (const r of results) {
          allInsert.push({
            siswa_id: r.id,
            klaster: remap.get(r.cluster) ?? r.cluster,
            iterasi: iterations,
            jurusan_id: j.id,
          });
        }
        processed++;
      }

      for (let i = 0; i < allInsert.length; i += 500) {
        const { error } = await supabase.from("hasil_klaster").insert(allInsert.slice(i, i + 500));
        if (error) throw error;
      }

      toast.success(`Klasterisasi selesai untuk ${processed} kelompok kelas!`);
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
    refetchHasil();
    toast.success("Hasil klasterisasi direset");
  };

  const klasterMap = new Map((hasilKlaster as any[]).map((h) => [h.siswa_id, h.klaster]));

  const handleExport = () => {
    if ((hasilKlaster as any[]).length === 0) {
      toast.error("Belum ada hasil klasterisasi untuk diekspor");
      return;
    }
    const wb = XLSX.utils.book_new();
    for (const j of jurusan as any[]) {
      const { jSiswa, feats, raw, normalized } = groupData(j.id);
      if (jSiswa.length === 0 || feats.length === 0) continue;
      const header = [
        "No",
        "Nama",
        "Kelas",
        ...feats.map((m: any) => m.nama),
        ...feats.map((m: any) => `${m.nama} (Norm)`),
        "Klaster",
        "Keterangan",
      ];
      const rows = jSiswa.map((s: any, i: number) => {
        const cl = klasterMap.get(s.id);
        return [
          i + 1,
          s.nama,
          j.nama,
          ...raw[i],
          ...normalized[i].map((v) => Number(v.toFixed(4))),
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

  const clusterSummary = Array.from({ length: K }, (_, i) => ({
    cluster: i + 1,
    count: (hasilKlaster as any[]).filter((h) => h.klaster === i + 1).length,
    label: clusterLabels[i + 1] ?? `K${i + 1}`,
  }));

  const visibleJurusan = (jurusan as any[]).filter(
    (j) => kelompokFilter === "all" || j.id === kelompokFilter
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Klasterisasi K-Means</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Alur: normalisasi Min-Max per mata pelajaran → K-Means (K={K}), dihitung terpisah untuk setiap
        kelas &amp; jurusan.
      </p>

      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Konfigurasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <Button onClick={runClustering} disabled={running}>
              <Play className="mr-2 h-4 w-4" />
              {running ? "Memproses..." : "Jalankan K-Means"}
            </Button>
            {(hasilKlaster as any[]).length > 0 && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button variant="secondary" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
                <div className="space-y-1.5">
                  <Label>Kelompok Kelas</Label>
                  <Select value={kelompokFilter} onValueChange={setKelompokFilter}>
                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kelompok</SelectItem>
                      {(jurusan as any[]).map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Filter Klaster</Label>
                  <Select value={klasterFilter} onValueChange={setKlasterFilter}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Klaster</SelectItem>
                      <SelectItem value="1">Klaster 1 — Tinggi</SelectItem>
                      <SelectItem value="2">Klaster 2 — Sedang</SelectItem>
                      <SelectItem value="3">Klaster 3 — Rendah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch id="norm" checked={showNormalized} onCheckedChange={setShowNormalized} />
                  <Label htmlFor="norm">Tampilkan nilai normalisasi</Label>
                </div>
              </>
            )}
          </div>
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

          {visibleJurusan.map((j) => {
            const { jSiswa, feats, raw, normalized } = groupData(j.id);
            if (jSiswa.length === 0 || feats.length === 0) return null;
            const rows = jSiswa
              .map((s: any, i: number) => ({ s, raw: raw[i], norm: normalized[i] }))
              .filter((r) => klasterFilter === "all" || klasterMap.get(r.s.id) === Number(klasterFilter))
              .sort((a, b) => {
                const ca = klasterMap.get(a.s.id) ?? 999;
                const cb = klasterMap.get(b.s.id) ?? 999;
                if (ca !== cb) return ca - cb;
                return (a.s.nama ?? "").localeCompare(b.s.nama ?? "");
              });
            if (rows.length === 0) return null;

            return (
              <Card key={j.id} className="shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Hasil Klasterisasi — {j.nama}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Variabel: {feats.map((m: any) => m.nama).join(", ")}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Nama</TableHead>
                          {feats.map((m: any) => (
                            <TableHead key={m.id} className="text-center">{m.nama}</TableHead>
                          ))}
                          <TableHead className="text-right sticky right-0 bg-background">Klaster</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => {
                          const cl = klasterMap.get(r.s.id);
                          return (
                            <TableRow key={r.s.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">{r.s.nama}</TableCell>
                              {feats.map((m: any, ci: number) => (
                                <TableCell key={m.id} className="text-center">
                                  {showNormalized ? r.norm[ci].toFixed(3) : r.raw[ci]}
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
