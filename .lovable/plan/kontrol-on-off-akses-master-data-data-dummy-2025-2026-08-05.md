# Kontrol ON/OFF Akses Master Data + Data Dummy 2025

## 1. Tombol ON/OFF akses Master Data (halaman Permintaan Akses)

Saat ini admin hanya bisa menekan "Setujui" atau "Tolak" satu kali pada permintaan yang berstatus menunggu. Setelah disetujui, akses guru tidak bisa dicabut lagi dari UI.

Perubahan:
- Setiap baris guru mendapat **switch ON/OFF**:
  - ON = akses Master Data aktif (status permintaan menjadi `approved`)
  - OFF = akses dicabut (status menjadi `revoked`), guru langsung kehilangan menu Master Data
- Admin bisa mematikan/menyalakan akses kapan saja, berkali-kali, tanpa menunggu guru mengajukan ulang.
- Daftar tidak hanya berisi guru yang pernah mengajukan: **semua akun guru ditampilkan**, sehingga admin bisa langsung memberi atau mencabut akses tanpa permintaan.
- Kolom status diperjelas: Aktif / Nonaktif / Menunggu persetujuan.
- Tombol Setujui / Tolak tetap ada untuk permintaan yang masih menunggu.

## 2. Data dummy 1 kelas tahun 2025

- Menambahkan satu kelas baru (contoh: `KLS 10 DUMMY 2025`) berisi 20 siswa fiktif beserta nilai acak yang wajar (70–95) pada mata pelajaran yang sama dengan kelas lain.
- Tanggal data diisi tahun 2025 supaya muncul saat filter **Tahun = 2025** di Master Data, dan bisa ikut diproses pada menu Klasterisasi.
- Data ini terpisah dari 14 kelompok asli, jadi tidak mengubah hasil klasterisasi yang sudah sesuai Excel.

## Detail teknis

- Migrasi database:
  - Menambah nilai status `revoked` (kolom teks, cukup penyesuaian pengecekan).
  - Kebijakan baru: admin boleh membuat dan mengubah baris `master_data_access_requests` untuk user lain (saat ini insert hanya untuk diri sendiri), agar toggle bisa dipakai pada guru yang belum pernah mengajukan.
  - Fungsi `private.has_master_data_access` tetap dipakai; hanya status `approved` yang memberi akses, sehingga `revoked` otomatis memblokir di level database (RLS) — bukan hanya di UI.
- `src/pages/AdminRequests.tsx`: query gabungan daftar guru (`user_roles` + `profiles`) dengan permintaan terakhir, komponen `Switch` untuk toggle, dan upsert status.
- `src/hooks/useUserRole.tsx`: perlakukan status `revoked` sama seperti tidak punya akses (sudah otomatis karena hanya `approved` yang lolos), dan tambahkan penanganan tampilan status.
- Data dummy dimasukkan lewat insert data (jurusan, siswa, nilai) dengan `created_at` tahun 2025.
