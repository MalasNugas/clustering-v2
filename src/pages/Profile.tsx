import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  nama_lengkap: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
});

export default function Profile() {
  const { user } = useAuth();
  const [namaLengkap, setNamaLengkap] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nama_lengkap")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nama_lengkap) setNamaLengkap(data.nama_lengkap);
        setFetching(false);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ nama_lengkap: namaLengkap });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, nama_lengkap: parsed.data.nama_lengkap },
        { onConflict: "user_id" }
      );

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil berhasil diperbarui");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Profil</h1>
        <p className="text-muted-foreground">Kelola informasi akun Anda</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
          <CardDescription>Perbarui nama lengkap yang ditampilkan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
              <Input
                id="nama_lengkap"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                maxLength={100}
                disabled={fetching}
                required
              />
            </div>
            <Button type="submit" disabled={loading || fetching}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
