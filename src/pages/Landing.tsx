import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Users, BookOpen, BarChart3, LogIn, LayoutDashboard } from "lucide-react";

const clusterColors = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-warning text-warning-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-secondary text-secondary-foreground",
];

const clusterLabels: Record<number, string> = {
  1: "Tinggi",
  2: "Sedang",
  3: "Rendah",
};

export default function Landing() {
  const { user } = useAuth();

  const { data: siswa = [] } = useQuery({
    queryKey: ["public-siswa"],
    queryFn: async () => {
      const { data } = await supabase.from("siswa").select("*, jurusan(nama)").order("nama");
      return data ?? [];
    },
  });

  const { data: hasil = [] } = useQuery({
    queryKey: ["public-hasil"],
    queryFn: async () => {
      const { data } = await supabase.from("hasil_klaster").select("*");
      return data ?? [];
    },
  });

  const { data: jurusan = [] } = useQuery({
    queryKey: ["public-jurusan"],
    queryFn: async () => {
      const { data } = await supabase.from("jurusan").select("*");
      return data ?? [];
    },
  });

  const { data: mapel = [] } = useQuery({
    queryKey: ["public-mapel"],
    queryFn: async () => {
      const { data } = await supabase.from("mata_pelajaran").select("*");
      return data ?? [];
    },
  });

  const klasterMap = new Map(hasil.map((h: any) => [h.siswa_id, h.klaster]));
  const maxK = hasil.reduce((m: number, h: any) => Math.max(m, h.klaster), 0);
  const summary = Array.from({ length: maxK }, (_, i) => ({
    cluster: i + 1,
    count: hasil.filter((h: any) => h.klaster === i + 1).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="h-7 w-7" />
            <span className="font-bold">K-Means Klasterisasi Siswa</span>
          </div>
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/auth"><LogIn className="mr-2 h-4 w-4" />Login Guru</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Klasterisasi Siswa Berdasarkan Tingkat Penguasaan Kompetensi Keahlian
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Hasil pengelompokan siswa menggunakan algoritma K-Means berdasarkan nilai kompetensi keahlian.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Siswa</p>
                  <p className="text-2xl font-bold">{siswa.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Jurusan</p>
                  <p className="text-2xl font-bold">{jurusan.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Mata Pelajaran</p>
                  <p className="text-2xl font-bold">{mapel.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Jumlah Klaster</p>
                  <p className="text-2xl font-bold">{maxK || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-12">
        {hasil.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Belum ada hasil klasterisasi. Silakan tunggu guru menjalankan analisis.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {summary.map((cs) => (
                <Card key={cs.cluster}>
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Klaster {cs.cluster} {clusterLabels[cs.cluster] ? `· ${clusterLabels[cs.cluster]}` : ""}
                      </p>
                      <p className="text-2xl font-bold">{cs.count} siswa</p>
                    </div>
                    <Badge className={clusterColors[(cs.cluster - 1) % clusterColors.length]}>
                      K{cs.cluster}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hasil Klasterisasi Siswa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[600px]">
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
                        const cl = klasterMap.get(s.id) as number | undefined;
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
                                <span className="text-muted-foreground">-</span>
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
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Skripsi K-Means Klasterisasi Siswa
      </footer>
    </div>
  );
}
