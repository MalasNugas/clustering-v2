# Tahun Ajaran pada Data Dummy & Log Klasterisasi

## Kondisi saat ini (hasil pemeriksaan)

- "Kelompok" pada aplikasi = baris pada tabel jurusan, isinya gabungan kelas + jurusan (mis. `KLS 10 TJKT`, `KLAS 11 DKV`).
- Tahun hanya diturunkan dari tanggal dibuat data siswa; hanya dipakai sebagai filter di Master Data, tidak dipakai di Klasterisasi.
- Sudah ada data dummy `KLS 10 DUMMY 2025` (20 siswa, tahun 2025), tapi namanya tidak menyebut jurusan dan **tidak muncul di menu Klasterisasi** karena halaman Klasterisasi hanya memproses kelompok yang punya acuan Excel.
- Tabel `clustering_logs` menyimpan jumlah kelompok/siswa dan rincian per kelompok, tanpa informasi tahun ajaran.

## 1. Data dummy Tahun Ajaran 2025

- Menambah kolom `tahun_ajaran` (teks, mis. `2025/2026`) pada tabel jurusan; semua kelompok yang ada sekarang diisi `2026/2027`, dummy diisi `2025/2026`.
- Mengganti nama kelompok dummy menjadi jelas: `KLS 10 TJKT 2025/2026` (kelas + jurusan + tahun ajaran), dengan 20 siswa dan nilainya yang sudah ada.
- Menambah satu kelompok dummy lagi agar demo pemisahan lebih terlihat: `KLS 11 TKR 1 2025/2026` (20 siswa, nilai acak wajar 70–95, tanggal 2025).
- Menu Klasterisasi mendapat filter **Tahun Ajaran**. Klasterisasi selalu dihitung terpisah per kelompok (kelas + jurusan + tahun ajaran), jadi data 2025 tidak pernah tercampur dengan 2026.
- Kelompok dummy yang tidak punya acuan Excel tetap bisa diproses: K optimal dihitung dari Elbow Method biasa (admin) atau K = 3 (guru), dan hasil Excel untuk 14 kelompok asli tidak berubah sama sekali.

## 2. Informasi Tahun Ajaran, Kelas, Jurusan di Log Klasterisasi

- Setiap proses klasterisasi mencatat, per kelompok: tahun ajaran, kelas, jurusan, K optimal, jumlah iterasi, jumlah siswa.
- Halaman Log Klasterisasi menampilkan kolom baru **Tahun Ajaran**, **Kelas**, dan **Jurusan** (ketika satu proses mencakup banyak kelompok, kolom menampilkan ringkasan dan detail lengkapnya tetap bisa dibuka pada baris rincian).
- Filter tambahan: Tahun Ajaran (dan tetap ada filter pengguna, aksi, rentang tanggal).
- Export Excel log ikut memuat kolom Tahun Ajaran, Kelas, dan Jurusan.

## Detail teknis

- Migrasi: `ALTER TABLE public.jurusan ADD COLUMN tahun_ajaran text NOT NULL DEFAULT '2026/2027'`; `ALTER TABLE public.clustering_logs ADD COLUMN tahun_ajaran text` (ringkasan tahun ajaran proses tsb).
- Insert data: rename jurusan dummy, tambah 1 jurusan dummy + 20 siswa + nilai (created_at 2025-07-15), set `tahun_ajaran` semua baris.
- `src/lib/clusteringLog.ts`: `ClusteringLogDetail` bertambah `tahunAjaran`, `kelas`, `jurusan`; input log bertambah `tahunAjaran`.
- `src/pages/Clustering.tsx`: `kelasGroups` tidak lagi membuang kelompok tanpa acuan Excel (acuan tetap dipakai jika ada), tambah state `tahunFilter` + Select, nama kelompok dipecah menjadi kelas/jurusan untuk log.
- `src/pages/AdminLogs.tsx`: kolom + filter tahun ajaran, baris rincian menampilkan kelas & jurusan, header export diperbarui.
