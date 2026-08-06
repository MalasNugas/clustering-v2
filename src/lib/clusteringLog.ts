import { supabase } from "@/integrations/supabase/client";

export type ClusteringLogDetail = {
  kelompok: string;
  tahunAjaran?: string;
  kelas?: string;
  jurusan?: string;
  k: number;
  iterasi: number;
  siswa: number;
};

export type LogClusteringInput = {
  action: "run" | "reset";
  groupCount: number;
  studentCount: number;
  normalized: boolean;
  tahunAjaran?: string;
  details: ClusteringLogDetail[];
};

/** Catat aktivitas klasterisasi. Tidak pernah melempar error agar tidak mengganggu alur utama. */
export async function logClustering(input: LogClusteringInput) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("nama_lengkap")
      .eq("user_id", user.id)
      .maybeSingle();

    await supabase.from("clustering_logs").insert({
      user_id: user.id,
      user_nama: profile?.nama_lengkap ?? user.email ?? null,
      action: input.action,
      group_count: input.groupCount,
      student_count: input.studentCount,
      normalized: input.normalized,
      tahun_ajaran: input.tahunAjaran ?? null,
      details: input.details as unknown as never,
    });
  } catch {
    // abaikan kegagalan pencatatan log
  }
}
