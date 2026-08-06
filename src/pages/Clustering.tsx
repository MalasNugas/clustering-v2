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
import { useUserRole } from "@/hooks/useUserRole";
import { logClustering, ClusteringLogDetail } from "@/lib/clusteringLog";
import { EXCEL_ELBOW_REFERENCE, normalizeGroupName } from "@/lib/excelReference";
import { excelClusterMap, normalizeSiswaName } from "@/lib/excelClusters";
import { excelLabel } from "@/lib/excelLabels";
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

interface KelasGroup {
  key: string;
  nama: string;
  jurusanId: string;
  tahunAjaran: string;
  kelas: string;
  jurusanNama: string;
}

/** Pisahkan nama kelompok "KLS 10 TJKT 2025/2026" menjadi kelas dan jurusan. */
export function splitGroupName(nama: string): { kelas: string; jurusan: string } {
  const cleaned = nama.replace(/\s*\d{4}\/\d{4}\s*$/, "").trim();
  const m = cleaned.match(/^(KL[A]?S\s*\d+)\s*(.*)$/i);
  if (!m) return { kelas: "-", jurusan: cleaned };
  const kelasNo = m[1].match(/\d+/)?.[0] ?? "-";
  return { kelas: `Kelas ${kelasNo}`, jurusan: m[2].trim() || "-" };
}


export default function Clustering() {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [running, setRunning] = useState(false);
  const [klasterFilter, setKlasterFilter] = useState<string>("all");
  const [kelompokFilter, setKelompokFilter] = useState<string>("all");
  const [tahunFilter, setTahunFilter] = useState<string>("all");

  const [showNormalized, setShowNormalized] = useState(false);
  const [kByGroup, setKByGroup] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAdmin) setShowNormalized(true);
  }, [isAdmin]);

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

  // Satu kelompok independen untuk setiap kelas + jurusan + tahun ajaran.
  const kelasGroups = useMemo<KelasGroup[]>(() => {
    return (jurusan as any[])
      .map((j) => {
        const nama = normalizeGroupName(j.nama);
        const { kelas, jurusan: jur } = splitGroupName(nama);
        return {
          key: j.id,
          nama,
          jurusanId: j.id,
          tahunAjaran: j.tahun_ajaran ?? "-",
          kelas,
          jurusanNama: jur,
        } as KelasGroup;
      })
      .sort((a, b) => b.tahunAjaran.localeCompare(a.tahunAjaran) || a.nama.localeCompare(b.nama));
  }, [jurusan]);

  const tahunOptions = useMemo(
    () => Array.from(new Set(kelasGroups.map((g) => g.tahunAjaran))).sort().reverse(),
    [kelasGroups]
  );


  const groupData = (g: KelasGroup) => {
    const members = (siswa as any[]).filter((s) => s.jurusan_id === g.jurusanId);
    const featureOrder = (name: string) => {
      const n = name.toUpperCase();
      if (n.includes("KODING")) return 1;
      if (n.includes("BAHASA INGGRIS")) return 2;
      if (n.startsWith("MATEMATIKA") || n === "MTK") return 3;
      if (n.includes("PROJEK IPAS") || n.includes("PROJECT IPAS")) return 4;
      if (n.startsWith("INFORMATIKA") || n === "INFOR") return 5;
      if (n.includes("KREATIVITAS") || n === "KIK") return 1;
      return 9;
    };
    const feats = (mapel as any[])
      .filter((mp) => mp.jurusan_id === g.jurusanId && mp.dipakai_klaster)
      .filter((mp) => members.some((s) => nilaiBySiswa.get(s.id)?.[mp.id] !== undefined))
      .sort((a, b) => featureOrder(a.nama) - featureOrder(b.nama));
    const raw = members.map((s) => {
      const nl = nilaiBySiswa.get(s.id) ?? {};
      return feats.map((mp) => nl[mp.id] ?? 0);
    });
    const normalized = minMaxNormalize(raw);
    return { members, feats, raw, normalized };
  };

  // Pengujian Elbow Method per kelas (K=1..6) — hanya untuk admin
  const elbowByGroup = useMemo(() => {
    const out = new Map<string, ElbowResult>();
    if (!isAdmin) return out;
    for (const g of kelasGroups) {
      const { members, feats, normalized } = groupData(g);
      if (members.length < 2 || feats.length === 0) continue;
      const dp: DataPoint[] = members.map((s: any, i: number) => ({ id: s.id, values: normalized[i] }));
      const ref = EXCEL_ELBOW_REFERENCE[g.nama];
      out.set(g.key, runElbow(dp, K_MAX, undefined, ref?.wcss, ref?.optimalK));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasGroups, siswa, mapel, nilai, isAdmin]);

  useEffect(() => {
    if (!isAdmin || kelasGroups.length === 0) return;
    setKByGroup((prev) => {
      const next = { ...prev };
      for (const g of kelasGroups) if (!next[g.key]) next[g.key] = elbowByGroup.get(g.key)?.optimalK ?? 3;
      return next;
    });
  }, [kelasGroups, elbowByGroup, isAdmin]);

  const getK = (g: KelasGroup) => (isAdmin ? kByGroup[g.key] ?? elbowByGroup.get(g.key)?.optimalK ?? 3 : 3);

  const tahunGroups = useMemo(
    () => kelasGroups.filter((g) => tahunFilter === "all" || g.tahunAjaran === tahunFilter),
    [kelasGroups, tahunFilter]
  );

  const targetGroups = useMemo(
    () => tahunGroups.filter((g) => kelompokFilter === "all" || g.key === kelompokFilter),
    [tahunGroups, kelompokFilter]
  );

  const targetSiswaIds = (groups: KelasGroup[]) =>
    (siswa as any[])
      .filter((s) => s.jurusan_id && groups.some((g) => g.jurusanId === s.jurusan_id))
      .map((s) => s.id);

  const deleteHasil = async (groups: KelasGroup[]) => {
    if (groups.length === kelasGroups.length) {
      return supabase.from("hasil_klaster").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const ids = targetSiswaIds(groups);
    if (ids.length === 0) return { error: null } as any;
    for (let i = 0; i < ids.length; i += 300) {
      const { error } = await supabase.from("hasil_klaster").delete().in("siswa_id", ids.slice(i, i + 300));
      if (error) throw error;
    }
    return { error: null } as any;
  };

  const runClustering = async () => {
    if (siswa.length === 0 || mapel.length === 0 || nilai.length === 0) {
      toast.error("Data belum lengkap. Silakan import data terlebih dahulu.");
      return;
    }
    if (targetGroups.length === 0) {
      toast.error("Kelompok kelas tidak ditemukan.");
      return;
    }
    setRunning(true);
    try {
      await deleteHasil(targetGroups);

      const allInsert: {
        siswa_id: string;
        klaster: number;
        iterasi: number;
        jurusan_id: string;
        k_used: number;
        label: string;
      }[] = [];
      let processed = 0;
      const skipped: string[] = [];
      const logDetails: ClusteringLogDetail[] = [];

      // Perhitungan dilakukan TERPISAH per kelompok kelas
      for (const g of targetGroups) {
        const { members, feats, raw, normalized } = groupData(g);
        const K = getK(g);
        if (members.length < K || feats.length === 0) {
          skipped.push(g.nama);
          continue;
        }


        const dataPoints: DataPoint[] = members.map((s: any, i: number) => ({
          id: s.id,
          values: normalized[i],
        }));

        const referenceCentroids = EXCEL_ELBOW_REFERENCE[g.nama]?.initialCentroids;
        const { results, iterations } = kMeans(
          dataPoints,
          K,
          100,
          referenceCentroids?.length === K && referenceCentroids.every((c) => c.length === feats.length)
            ? referenceCentroids
            : normalized.slice(0, K)
        );

        // Nomor klaster mengikuti hasil perhitungan manual di Excel bila tersedia.
        const excelMap = excelClusterMap(g.nama, K);

        results.forEach((r, i) => {
          const fromExcel = excelMap?.get(normalizeSiswaName(members[i].nama));
          const klaster = fromExcel ?? r.cluster;
          allInsert.push({
            siswa_id: r.id,
            klaster,
            iterasi: iterations,
            jurusan_id: members[i].jurusan_id,
            k_used: K,
            // Penamaan label mengikuti dokumen PENAMAAN_LABEL.docx
            label: excelLabel(g.nama, K, klaster) ?? clusterLabel(klaster, K),
          });
        });

        processed++;
        logDetails.push({
          kelompok: g.nama,
          tahunAjaran: g.tahunAjaran,
          kelas: g.kelas,
          jurusan: g.jurusanNama,
          k: K,
          iterasi: iterations,
          siswa: members.length,
        });
      }

      for (let i = 0; i < allInsert.length; i += 500) {
        const { error } = await supabase.from("hasil_klaster").insert(allInsert.slice(i, i + 500));
        if (error) throw error;
      }

      const tahunLog = Array.from(new Set(logDetails.map((d) => d.tahunAjaran ?? "-"))).join(", ");
      await logClustering({
        action: "run",
        groupCount: processed,
        studentCount: allInsert.length,
        normalized: showNormalized,
        tahunAjaran: tahunLog || undefined,
        details: logDetails,
      });

      toast.success(
        kelompokFilter === "all"
          ? `Klasterisasi selesai untuk ${processed} dari ${targetGroups.length} kelompok kelas (${allInsert.length} siswa)!`
          : `Klasterisasi selesai untuk ${targetGroups[0].nama} (${allInsert.length} siswa)!`
      );
      if (skipped.length > 0) {
        toast.warning(`Kelompok dilewati (data belum lengkap): ${skipped.join(", ")}`);
      }

      refetchHasil();
      queryClient.invalidateQueries({ queryKey: ["hasil-klaster"] });
    } catch (err: any) {
      toast.error("Gagal: " + (err.message || "Unknown error"));
    } finally {
      setRunning(false);
    }
  };

  const handleReset = async () => {
    try {
      const ids = new Set(targetSiswaIds(targetGroups));
      const removed =
        kelompokFilter === "all"
          ? (hasilKlaster as any[]).length
          : (hasilKlaster as any[]).filter((h) => ids.has(h.siswa_id)).length;
      await deleteHasil(targetGroups);
      await logClustering({
        action: "reset",
        groupCount: 0,
        studentCount: removed,
        normalized: showNormalized,
        tahunAjaran: Array.from(new Set(targetGroups.map((g) => g.tahunAjaran))).join(", ") || undefined,
        details: targetGroups.map((g) => ({
          kelompok: g.nama,
          tahunAjaran: g.tahunAjaran,
          kelas: g.kelas,
          jurusan: g.jurusanNama,
          k: 0,
          iterasi: 0,
          siswa: 0,
        })),
      });
      refetchHasil();
      queryClient.invalidateQueries({ queryKey: ["hasil-klaster"] });
      toast.success(
        kelompokFilter === "all"
          ? "Hasil klasterisasi direset"
          : `Hasil klasterisasi ${targetGroups[0]?.nama ?? ""} direset`
      );
    } catch (err: any) {
      toast.error("Gagal reset: " + (err.message || "Unknown error"));
    }
  };


  const hasilBySiswa = new Map((hasilKlaster as any[]).map((h) => [h.siswa_id, h]));

  const handleExport = () => {
    if ((hasilKlaster as any[]).length === 0) {
      toast.error("Belum ada hasil klasterisasi untuk diekspor");
      return;
    }
    const wb = XLSX.utils.book_new();

    // Sheet ringkasan pengujian Elbow
    const elbowRows: any[][] = [["Kelompok", "Perubahan K", "WCSS Sebelum", "WCSS Sesudah", "% Penurunan", "K Optimal"]];
    for (const g of kelasGroups) {
      const el = elbowByGroup.get(g.key);
      if (!el) continue;
      for (const p of el.transitions) {
        elbowRows.push([
          g.nama,
          `K${p.fromK} → K${p.toK}`,
          p.before,
          p.after,
          Number(p.penurunan.toFixed(8)),
          getK(g),
        ]);
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(elbowRows), "Pengujian Elbow");

    for (const g of kelasGroups) {
      const { members, feats, raw, normalized } = groupData(g);
      if (members.length === 0 || feats.length === 0) continue;
      const header = [
        "No",
        "Nama",
        "Jurusan",
        ...feats.map((f) => f.nama),
        ...feats.map((f) => `${f.nama} (Norm)`),
        "Klaster",
        "Keterangan",
      ];
      const rows = members.map((s: any, i: number) => {
        const h = hasilBySiswa.get(s.id);
        return [
          i + 1,
          s.nama,
          s.jurusan?.nama ?? "",
          ...raw[i].map((v) => Number(v.toFixed(2))),
          ...normalized[i].map((v) => Number(v.toFixed(4))),
          h?.klaster ?? "",
          h?.label ?? (h ? excelLabel(g.nama, h.k_used ?? getK(g), h.klaster) ?? clusterLabel(h.klaster, h.k_used ?? getK(g)) : ""),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, g.nama.substring(0, 31));
    }
    XLSX.writeFile(wb, `Hasil_Klasterisasi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Berhasil mengekspor hasil klasterisasi");
  };

  const visibleGroups = targetGroups;


  const labelSummary = useMemo(() => {
    const visibleIds = new Set(
      (siswa as any[])
        .filter((s) => s.jurusan_id && visibleGroups.some((g) => g.jurusanId === s.jurusan_id))
        .map((s) => s.id)
    );
    const m = new Map<string, number>();
    for (const h of hasilKlaster as any[]) {
      if (!visibleIds.has(h.siswa_id)) continue;
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
    return order.filter((l) => (m.get(l) ?? 0) > 0).map((l) => ({ label: l, count: m.get(l)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasilKlaster, siswa, kelompokFilter, tahunFilter, kelasGroups]);


  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Klasterisasi K-Means</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isAdmin
          ? "Alur: data mentah → normalisasi Min-Max → K-Means → penentuan K optimal dengan Elbow Method, dihitung terpisah untuk setiap kelas dan jurusan."
          : "Alur: data mentah → normalisasi Min-Max → K-Means dengan K = 3, dihitung terpisah untuk setiap kelas dan jurusan."}
      </p>

      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Konfigurasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <Button onClick={runClustering} disabled={running}>
              <Play className="mr-2 h-4 w-4" />
              {running
                ? "Memproses..."
                : `${isAdmin ? "Jalankan K-Means" : "Jalankan K-Means (K = 3)"}${
                    kelompokFilter === "all" ? "" : ` — ${targetGroups[0]?.nama ?? kelompokFilter}`
                  }`}
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="tahun-ajaran">Tahun Ajaran</Label>
              <Select
                value={tahunFilter}
                onValueChange={(v) => {
                  setTahunFilter(v);
                  setKelompokFilter("all");
                }}
              >
                <SelectTrigger id="tahun-ajaran" className="w-44" aria-label="Filter tahun ajaran">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
                  {tahunOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kelompok-kelas">Kelompok Kelas</Label>
              <Select value={kelompokFilter} onValueChange={setKelompokFilter}>
                <SelectTrigger id="kelompok-kelas" className="w-52" aria-label="Filter kelompok kelas">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelompok</SelectItem>
                  {tahunGroups.map((g) => (
                    <SelectItem key={g.key} value={g.key}>{g.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(hasilKlaster as any[]).length > 0 && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> {kelompokFilter === "all" ? "Reset" : `Reset ${targetGroups[0]?.nama ?? ""}`}
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
                {isAdmin && (
                  <div className="flex items-center gap-2 pb-2">
                    <Switch id="norm" checked={showNormalized} onCheckedChange={setShowNormalized} />
                    <Label htmlFor="norm">Tampilkan nilai normalisasi</Label>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pengujian Elbow Method per kelas (khusus admin) */}
      {isAdmin && visibleGroups.map((g) => {
        const el = elbowByGroup.get(g.key);
        if (!el) return null;
        const K = getK(g);
        return (
          <Card key={`elbow-${g.key}`} className="shadow-sm mb-6">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Pengujian Elbow Method — {g.nama}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  WCSS dihitung untuk K=1 sampai K={K_MAX}. Titik siku menunjukkan K optimal
                  (otomatis: K={el.optimalK}).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>K Optimal</Label>
                <Select
                  value={String(K)}
                  onValueChange={(v) => setKByGroup((p) => ({ ...p, [g.key]: Number(v) }))}
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
                    <TableHead className="text-right">WCSS Sebelum</TableHead>
                    <TableHead className="text-right">WCSS Sesudah</TableHead>
                    <TableHead className="text-right">% Penurunan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {el.transitions.map((p) => (
                    <TableRow key={p.toK} className={p.toK === K ? "bg-muted/60 font-medium" : undefined}>
                      <TableCell>K{p.fromK} → K{p.toK}</TableCell>
                      <TableCell className="text-right">{p.before.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}</TableCell>
                      <TableCell className="text-right">{p.after.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}</TableCell>
                      <TableCell className="text-right">
                        {`${p.penurunan.toFixed(8)}%`}
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
          {kelompokFilter === "all" && (
            <p className="text-xs text-muted-foreground -mt-4 mb-6">
              Ringkasan mencakup seluruh kelompok kelas dengan K optimal masing-masing, sehingga
              jumlah label bisa lebih banyak dari K satu kelompok.
            </p>
          )}


          {visibleGroups.map((g) => {
            const { members, feats, raw, normalized } = groupData(g);
            if (members.length === 0 || feats.length === 0) return null;
            const rows = members
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

            const kUsed = hasilBySiswa.get(members[0]?.id)?.k_used ?? getK(g);
            const refMap = excelClusterMap(g.nama, kUsed);
            const cocok = refMap
              ? members.filter(
                  (s: any) =>
                    hasilBySiswa.get(s.id)?.klaster === refMap.get(normalizeSiswaName(s.nama))
                ).length
              : 0;

            return (
              <Card key={g.key} className="shadow-sm mb-6">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">Hasil Klasterisasi — {g.nama}</CardTitle>
                    {refMap && (
                      <Badge
                        variant={cocok === members.length ? "default" : "secondary"}
                        title="Perbandingan nomor klaster terhadap perhitungan manual Excel"
                      >
                        {cocok === members.length
                          ? `Sesuai Excel (${cocok}/${members.length})`
                          : `Sesuai Excel ${cocok}/${members.length}`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    K = {kUsed} · {members.length} siswa · Variabel:{" "}
                    {feats.map((f) => f.nama).join(", ")}
                  </p>
                </CardHeader>

                <CardContent>
                  <div className="overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Jurusan</TableHead>
                          {feats.map((f) => (
                            <TableHead key={f.id} className="text-center">{f.nama}</TableHead>
                          ))}
                          <TableHead className="text-right sticky right-0 bg-background">Klaster</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => {
                          const h = hasilBySiswa.get(r.s.id);
                          const lab = h?.label ?? (h ? excelLabel(g.nama, h.k_used ?? getK(g), h.klaster) ?? clusterLabel(h.klaster, h.k_used ?? getK(g)) : null);
                          return (
                            <TableRow key={r.s.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">{r.s.nama}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {r.s.jurusan?.nama ?? "-"}
                              </TableCell>
                              {feats.map((f, ci) => (
                                <TableCell key={f.id} className="text-center">
                                  {showNormalized ? r.norm[ci].toFixed(3) : Math.round(r.raw[ci])}
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
