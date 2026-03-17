import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { kMeans, DataPoint } from "@/lib/kmeans";

const clusterColors = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-warning text-warning-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-secondary text-secondary-foreground",
];

export default function Clustering() {
  const queryClient = useQueryClient();
  const [k, setK] = useState(3);
  const [running, setRunning] = useState(false);
  const [iterationCount, setIterationCount] = useState<number | null>(null);

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
      const { data } = await supabase.from("mata_pelajaran").select("*").order("nama");
      return data ?? [];
    },
  });

  const { data: nilai = [] } = useQuery({
    queryKey: ["nilai"],
    queryFn: async () => {
      const { data } = await supabase.from("nilai").select("*");
      return data ?? [];
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
      // Build data points: each student has scores for each subject
      const dataPoints: DataPoint[] = siswa.map((s: any) => {
        const scores = mapel.map((m: any) => {
          const n = nilai.find((v: any) => v.siswa_id === s.id && v.mata_pelajaran_id === m.id);
          return n ? Number(n.nilai) : 0;
        });
        return { id: s.id, values: scores };
      });

      const { results, iterations } = kMeans(dataPoints, k);
      setIterationCount(iterations);

      // Clear old results and insert new
      await supabase.from("hasil_klaster").delete().neq("id", "");
      const insertData = results.map((r) => ({
        siswa_id: r.id,
        klaster: r.cluster,
        iterasi: iterations,
      }));
      const { error } = await supabase.from("hasil_klaster").insert(insertData);
      if (error) throw error;

      toast.success(`Klasterisasi selesai! ${iterations} iterasi.`);
      refetchHasil();
      queryClient.invalidateQueries({ queryKey: ["hasil-klaster"] });
    } catch (err: any) {
      toast.error("Gagal: " + (err.message || "Unknown error"));
    } finally {
      setRunning(false);
    }
  };

  const handleReset = async () => {
    await supabase.from("hasil_klaster").delete().neq("id", "");
    setIterationCount(null);
    refetchHasil();
    toast.success("Hasil klasterisasi direset");
  };

  // Build results map
  const klasterMap = new Map(hasilKlaster.map((h: any) => [h.siswa_id, h.klaster]));

  // Cluster summary
  const clusterSummary = Array.from({ length: k }, (_, i) => {
    const members = hasilKlaster.filter((h: any) => h.klaster === i + 1);
    return { cluster: i + 1, count: members.length };
  });

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
            {hasilKlaster.length > 0 && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
          {iterationCount !== null && (
            <p className="mt-3 text-sm text-muted-foreground">
              Konvergen dalam <strong>{iterationCount}</strong> iterasi
            </p>
          )}
        </CardContent>
      </Card>

      {hasilKlaster.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {clusterSummary.map((cs) => (
              <Card key={cs.cluster} className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Klaster {cs.cluster}</p>
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

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Hasil Klasterisasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jurusan</TableHead>
                      <TableHead>Klaster</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siswa.map((s: any, i: number) => {
                      const cl = klasterMap.get(s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{s.nis}</TableCell>
                          <TableCell>{s.nama}</TableCell>
                          <TableCell>{s.jurusan?.nama ?? "-"}</TableCell>
                          <TableCell>
                            {cl ? (
                              <Badge className={clusterColors[(cl - 1) % clusterColors.length]}>
                                Klaster {cl}
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
        </>
      )}
    </div>
  );
}
