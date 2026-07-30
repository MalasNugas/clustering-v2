import { useEffect, useMemo, useState } from "react";
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
import { runElbow, ElbowResult } from "@/lib/elbow";
import { clusterLabel, labelClass } from "@/lib/labels";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import * as XLSX from "xlsx";

const K_MAX = 6;

// K optimal hasil pengujian Elbow pada perhitungan manual (bisa diubah manual di UI)
const DEFAULT_K: Record<string, number> = {
  "KLS 10 DKV": 4,
  "KLS 10 DPIB": 3,
  "KLS 10 TESHA": 3,
  "KLS 10 TJKT": 3,
  "KLS 10 TKP": 2,
  "KLS 10 TKR 1": 3,
  "KLS 10 TKR 2": 3,
  "KLS 11 DKV": 3,
  "KLS 11 DPIB": 4,
  "KLS 11 TESHA": 3,
  "KLS 11 TJKT": 4,
  "KLS 11 TKP": 2,
  "KLS 11 TKR 1": 5,
  "KLS 11 TKR 2": 3,
};

export default function Clustering() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [klasterFilter, setKlasterFilter] = useState<string>("all");
  const [kelompokFilter, setKelompokFilter] = useState<string>("all");
  const [showNormalized, setShowNormalized] = useState(false);
  const [kByGroup, setKByGroup] = useState<Record<string, number>>({});

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

  const featureMapel = (jurusanId: string) =>
    (mapel as any[]).filter((m) => m.jurusan_id === jurusanId && m.dipakai_klaster);

  const groupData = (jurusanId: string) => {
    const jSiswa = (siswa as any[]).filter((s) => s.jurusan_id === jurusanId);
    const feats = featureMapel(jurusanId);
    const raw = jSiswa.map((s) => feats.map((m) => nilaiBySiswa.get(s.id)?.[m.id] ?? 0));
    const normalized = minMaxNormalize(raw);
    return { jSiswa, feats, raw, normalized };
  };

  // Pengujian Elbow Method per kelompok (K=1..6)
  const elbowByGroup = useMemo(() => {
    const out = new Map<string, ElbowResult>();
    for (const j of jurusan as any[]) {
      const { jSiswa, feats, normalized } = groupData(j.id);
      if (jSiswa.length < 2 || feats.length === 0) continue;
      const dp: DataPoint[] = jSiswa.map((s: any, i: number) => ({ id: s.id, values: normalized[i] }));
      out.set(j.id, runElbow(dp, K_MAX));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jurusan, siswa, mapel, nilai]);

  // Nilai awal K tiap kelompok: hasil pengujian manual, fallback ke Elbow otomatis
  useEffect(() => {
    if ((jurusan as any[]).length === 0 || elbowByGroup.size === 0) return;
    setKByGroup((prev) => {
      const next = { ...prev };
      for (const j of jurusan as any[]) {
        if (next[j.id]) continue;
        next[j.id] = DEFAULT_K[j.nama] ?? elbowByGroup.get(j.id)?.optimalK ?? 3;
      }
      return next;
    });
  }, [jurusan, elbowByGroup]);

  const getK = (j: any) => kByGroup[j.id] ?? DEFAULT_K[j.nama] ?? elbowByGroup.get(j.id)?.optimalK ?? 3;

  const runClustering = async () => {
    if (siswa.length === 0 || mapel.length === 0 || nilai.length === 0) {
      toast.error("Data belum lengkap. Silakan import data terlebih dahulu.");
      return;
    }
    setRunning(true);
    try {
      await supabase.from("hasil_klaster").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const allInsert: {
        siswa_id: string;
        klaster: number;
        iterasi: number;
        jurusan_id: string;
        k_used: number;
        label: string;
      }[] = [];
      let processed = 0;

      // Perhitungan dilakukan TERPISAH untuk setiap kelas + jurusan
      for (const j of jurusan as any[]) {
        const { jSiswa, feats, raw, normalized } = groupData(j.id);
        const K = getK(j);
        if (jSiswa.length < K || feats.length === 0) continue;

        const dataPoints: DataPoint[] = jSiswa.map((s: any, i: number) => ({
          id: s.id,
          values: normalized[i],
        }));

        const { results, iterations } = kMeans(dataPoints, K, 100);

        // Urutkan klaster: rata-rata nilai ASLI tertinggi = Klaster 1
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
          const cl = remap.get(r.cluster) ?? r.cluster;
          allInsert.push({
            siswa_id: r.id,
            klaster: cl,
            iterasi: iterations,
            jurusan_id: j.id,
            k_used: K,
            label: clusterLabel(cl, K),
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

  const hasilBySiswa = new Map((hasilKlaster as any[]).map((h) => [h.siswa_id, h]));

  const handleExport = () => {
    if ((hasilKlaster as any[]).length === 0) {
      toast.error("Belum ada hasil klasterisasi untuk diekspor");
      return;
    }
    const wb = XLSX.utils.book_new();

    // Sheet ringkasan pengujian Elbow
    const elbowRows: any[][] = [["Kelompok", "K", "WCSS", "% Penurunan", "K dipakai"]];
    for (const j of jurusan as any[]) {
      const el = elbowByGroup.get(j.id);
      if (!el) continue;
      for (const p of el.points) {
        elbowRows.push([
          j.nama,
          p.k,
          Number(p.wcss.toFixed(6)),
          p.penurunan === undefined ? "" : Number(p.penurunan.toFixed(4)),
          getK(j),
        ]);
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(elbowRows), "Pengujian Elbow");

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
        const h = hasilBySiswa.get(s.id);
        return [
          i + 1,
          s.nama,
          j.nama,
          ...raw[i],
          ...normalized[i].map((v) => Number(v.toFixed(4))),
          h?.klaster ?? "",
          h?.label ?? (h ? clusterLabel(h.klaster, h.k_used ?? getK(j)) : ""),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, j.nama.substring(0, 31));
    }
    XLSX.writeFile(wb, `Hasil_Klasterisasi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Berhasil mengekspor hasil klasterisasi");
  };

  const visibleJurusan = (jurusan as any[]).filter(
    (j) => kelompokFilter === "all" || j.id === kelompokFilter
  );

  const labelSummary = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hasilKlaster as any[]) {
      const lab = h.label ?? clusterLabel(h.klaster, h.k_used ?? 3);
      m.set(lab, (m.get(lab) ?? 0) + 1);
    }
    const order = [
      "Sangat Tinggi",
      "Cukup Tinggi",
      "Tinggi",
      "Sedang",
      "Cukup Rendah",
      "Rendah",
      "Sangat Rendah",
    ];
    return order.filter((l) => m.has(l)).map((l) => ({ label: l, count: m.get(l)! }));
  }, [hasilKlaster]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Klasterisasi K-Means</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Alur: data mentah → normalisasi Min-Max → K-Means → penentuan K optimal dengan Elbow Method,
        dihitung terpisah untuk setiap kelas &amp; jurusan.
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
            {(hasilKlaster as any[]).length > 0 && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button variant="secondary" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
                <div className="space-y-1.5">
                  <Label>Filter Klaster</Label>
                  <Select value={klasterFilter} onValueChange={setKlasterFilter}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Klaster</SelectItem>
                      {Array.from({ length: K_MAX }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>Klaster {i + 1}</SelectItem>
                      ))}
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

      {/* Pengujian Elbow Method per kelompok */}
      {visibleJurusan.map((j) => {
        const el = elbowByGroup.get(j.id);
        if (!el) return null;
        const K = getK(j);
        return (
          <Card key={`elbow-${j.id}`} className="shadow-sm mb-6">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Pengujian Elbow Method — {j.nama}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  WCSS dihitung untuk K=1 sampai K={K_MAX}. Titik siku menunjukkan K optimal
                  (otomatis: K={el.optimalK}).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>K Optimal</Label>
                <Select
                  value={String(K)}
                  onValueChange={(v) => setKByGroup((p) => ({ ...p, [j.id]: Number(v) }))}
                >
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: K_MAX - 1 }, (_, i) => i + 2).map((k) => (
                      <SelectItem key={k} value={String(k)}>K = {k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={el.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="k" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <RTooltip
                      formatter={(v: any) => Number(v).toFixed(5)}
                      labelFormatter={(l) => `K = ${l}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="wcss"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perubahan K</TableHead>
                    <TableHead className="text-right">WCSS</TableHead>
                    <TableHead className="text-right">% Penurunan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {el.points.map((p) => (
                    <TableRow key={p.k} className={p.k === K ? "bg-muted/60 font-medium" : undefined}>
                      <TableCell>K = {p.k}</TableCell>
                      <TableCell className="text-right">{p.wcss.toFixed(5)}</TableCell>
                      <TableCell className="text-right">
                        {p.penurunan === undefined ? "-" : `${p.penurunan.toFixed(2)}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {(hasilKlaster as any[]).length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {labelSummary.map((ls) => (
              <Card key={ls.label} className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{ls.label}</p>
                      <p className="text-2xl font-bold">{ls.count} siswa</p>
                    </div>
                    <Badge className={labelClass(ls.label)}>{ls.label}</Badge>
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
              .filter(
                (r) =>
                  klasterFilter === "all" ||
                  hasilBySiswa.get(r.s.id)?.klaster === Number(klasterFilter)
              )
              .sort((a, b) => {
                const ca = hasilBySiswa.get(a.s.id)?.klaster ?? 999;
                const cb = hasilBySiswa.get(b.s.id)?.klaster ?? 999;
                if (ca !== cb) return ca - cb;
                return (a.s.nama ?? "").localeCompare(b.s.nama ?? "");
              });
            if (rows.length === 0) return null;

            return (
              <Card key={j.id} className="shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Hasil Klasterisasi — {j.nama}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    K = {getK(j)} · Variabel: {feats.map((m: any) => m.nama).join(", ")}
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
                          const h = hasilBySiswa.get(r.s.id);
                          const lab = h?.label ?? (h ? clusterLabel(h.klaster, h.k_used ?? getK(j)) : null);
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
                                {h ? (
                                  <Badge className={labelClass(lab ?? "")} title={lab ?? undefined}>
                                    Klaster {h.klaster}
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
