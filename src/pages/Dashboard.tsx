import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, GraduationCap, BarChart3, BookMarked } from "lucide-react";
import { MasterDataAccessBanner } from "@/components/MasterDataAccessBanner";

export default function Dashboard() {
  const { data: siswaCount = 0 } = useQuery({
    queryKey: ["siswa-count"],
    queryFn: async () => {
      const { count } = await supabase.from("siswa").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: jurusanCount = 0 } = useQuery({
    queryKey: ["jurusan-count"],
    queryFn: async () => {
      const { count } = await supabase.from("jurusan").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: mapelCount = 0 } = useQuery({
    queryKey: ["mapel-count"],
    queryFn: async () => {
      const { count } = await supabase.from("mata_pelajaran").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: nilaiCount = 0 } = useQuery({
    queryKey: ["nilai-count"],
    queryFn: async () => {
      const { count } = await supabase.from("nilai").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: mapelList = [] } = useQuery({
    queryKey: ["mapel-list"],
    queryFn: async () => {
      const { data } = await supabase.from("mata_pelajaran").select("nama").order("nama");
      return data?.map((m) => m.nama) ?? [];
    },
  });

  const stats = [
    { title: "Jumlah Siswa", value: siswaCount, icon: Users, color: "text-primary" },
    { title: "Jumlah Kelas", value: jurusanCount, icon: GraduationCap, color: "text-accent" },
    { title: "Mata Pelajaran", value: mapelCount, icon: BookOpen, color: "text-warning" },
    { title: "Total Nilai", value: nilaiCount, icon: BarChart3, color: "text-primary" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Klasterisasi Siswa Berdasarkan Tingkat Penguasaan Kompetensi Keahlian Menggunakan Algoritma K-Means
      </p>
      <MasterDataAccessBanner />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <BookMarked className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Daftar Mata Pelajaran</CardTitle>
        </CardHeader>
        <CardContent>
          {mapelList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data mata pelajaran.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mapelList.map((nama) => (
                <span
                  key={nama}
                  className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"
                >
                  {nama}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
