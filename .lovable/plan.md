
# Migrasi Data ke Supabase "Clustering v2"

Anda memilih: **migrasi skema + data** dari Lovable Cloud ke project Supabase eksternal Anda. Kode aplikasi (`client.ts`, `.env`) tidak akan diubah karena auto-generated oleh Lovable Cloud. Hasil akhirnya adalah file SQL yang Anda copy-paste ke SQL Editor project "Clustering v2".

## Yang akan saya kerjakan

1. **Baca seluruh data dari Lovable Cloud** menggunakan `supabase--read_query`:
   - `jurusan`, `mata_pelajaran`, `siswa`, `nilai`, `hasil_klaster`
   - `profiles` dan `user_roles` (opsional — UUID-nya terikat ke `auth.users` Lovable Cloud, jadi tidak ikut diexport secara default; akan saya sebut di catatan)

2. **Generate satu file SQL** `migration-clustering-v2.sql` di `/mnt/documents/` berisi 2 bagian:

   **Bagian A — Skema (jalankan sekali):**
   - Schema `private` + function `private.has_role`
   - Enum `app_role` (`admin`, `guru`, `siswa`)
   - Tables: `jurusan`, `mata_pelajaran`, `siswa`, `nilai`, `profiles`, `user_roles`, `hasil_klaster`
   - GRANTs untuk `anon`, `authenticated`, `service_role`
   - RLS policies (sama persis dengan yang sekarang)
   - Function `public.update_updated_at_column()` + trigger untuk `profiles`
   - Trigger `on_auth_user_created` → `handle_new_user()` untuk auto-create profile + role `guru`

   **Bagian B — Data (INSERT statements):**
   - UUID asli dipertahankan agar relasi `jurusan_id`, `siswa_id`, `mata_pelajaran_id` tetap konsisten
   - Urutan insert: jurusan → mata_pelajaran → siswa → nilai → hasil_klaster
   - `ON CONFLICT (id) DO NOTHING` agar aman dijalankan ulang

3. **Buat juga `data-only.sql` terpisah** untuk kasus Anda sudah punya skema dan hanya butuh data.

4. **Berikan instruksi singkat** cara menjalankan di SQL Editor "Clustering v2" + catatan tentang user auth (`profiles`/`user_roles` perlu signup ulang di project baru karena UUID-nya milik project lama).

## Catatan teknis

- File auto-generated di project Lovable (`client.ts`, `types.ts`, `.env`) **tidak** diubah — preview Lovable tetap mengarah ke Lovable Cloud.
- Untuk benar-benar memakai project Anda, Anda akan menjalankan app secara lokal/self-host dengan `.env` yang mengarah ke "Clustering v2" — itu di luar Lovable preview.
- Kredensial project "Clustering v2" tidak saya butuhkan untuk generate SQL ini — Anda yang eksekusi di dashboard Supabase Anda.

## Output

Setelah Anda approve plan ini, saya akan langsung query data dari Lovable Cloud, men-generate file SQL, lalu menampilkannya sebagai artifact yang bisa Anda download.
