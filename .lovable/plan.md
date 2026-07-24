
## 1. Filter Tahun di Master Data

- Tambah dropdown "Tahun" di halaman Master Data (di atas tab Siswa/Nilai/Mapel/Jurusan).
- Opsi diisi otomatis dari `DISTINCT EXTRACT(YEAR FROM created_at)` pada tabel `siswa` (+ opsi "Semua Tahun").
- Filter diterapkan ke query list Siswa dan Nilai (nilai difilter via join siswa) menggunakan `.gte('created_at', 'YYYY-01-01').lt(...)`.
- Default: tahun terbaru yang tersedia.

## 2. Role Admin

Database:
- Tambah nilai `'admin'` sudah ada di enum `app_role` (sudah ada).
- Migrasi: INSERT role `admin` ke `user_roles` untuk user dengan email `marchellino940@gmail.com` (lookup via `auth.users`).
- Jika email belum terdaftar, migrasi akan gagal aman — user diminta signup dulu lewat halaman Auth, lalu jalankan grant.

Karena akun admin belum tentu ada, alur:
1. User signup `marchellino940@gmail.com` di halaman `/auth` (password apapun).
2. Jalankan migrasi yang: hapus role `guru` default untuk email tsb (jika ada) & INSERT role `admin`.

## 3. Gate Menu & Akses Master Data

Sidebar (`AppSidebar.tsx`):
- Fetch role user via `user_roles`.
- Admin: lihat semua menu + menu baru "Kelola Guru" & "Permintaan Akses".
- Guru: Dashboard, Klasterisasi, Profil. Master Data ditampilkan HANYA jika ada row aktif di `master_data_access` (lihat bawah).

Route guard (`ProtectedRoute` diperluas jadi `RoleRoute`):
- `/master-data`: butuh admin ATAU guru dengan izin aktif.
- `/admin/*`: butuh admin.

## 4. Request & Approve Akses Master Data

Tabel baru `master_data_access_requests`:
- `user_id` (guru), `status` ('pending'|'approved'|'rejected'), `requested_at`, `reviewed_at`, `reviewed_by`.
- RLS:
  - Guru: SELECT & INSERT row miliknya sendiri.
  - Admin: SELECT semua, UPDATE status.
- Fungsi helper `has_master_data_access(uid)` = admin OR ada request approved untuk uid.
- RLS tabel `siswa/nilai/mapel/jurusan` diubah dari `has_role('guru')` → `has_master_data_access(auth.uid())` supaya guru approved bisa CRUD.

Halaman baru:
- **`/admin/guru`** (Admin): list semua guru dari `profiles` + role, dengan status akses Master Data (approved/pending/none) — informasi saja.
- **`/admin/requests`** (Admin): tabel permintaan pending, tombol Approve / Reject.
- **Banner di Dashboard untuk Guru tanpa akses**: tombol "Minta Akses Master Data" → insert request pending. Jika sudah pending, tampilkan status.

## Ringkasan file yang berubah/baru

- Migrasi SQL: tabel `master_data_access_requests` + grants + RLS + function + update RLS 4 tabel + grant admin ke marchellino940@gmail.com.
- `src/hooks/useUserRole.tsx` (baru): return `{ role, hasMasterDataAccess, loading }`.
- `src/components/AppSidebar.tsx`: menu dinamis per role.
- `src/components/ProtectedRoute.tsx` atau `RoleRoute.tsx`: prop `requireRole` / `requireMasterDataAccess`.
- `src/pages/MasterData.tsx`: dropdown filter tahun.
- `src/pages/AdminGuru.tsx` & `src/pages/AdminRequests.tsx` (baru).
- `src/pages/Dashboard.tsx`: banner request akses untuk guru tanpa izin.
- `src/App.tsx`: route `/admin/guru`, `/admin/requests`.

## Catatan

- Password akun admin tidak disimpan — Anda signup manual di `/auth`, lalu migrasi mempromosikan akun tsb jadi admin.
- Filter tahun pakai `created_at` sesuai pilihan Anda; kalau nanti butuh "tahun ajaran" (mis. 2024/2025) bisa ditambah kolom terpisah.
