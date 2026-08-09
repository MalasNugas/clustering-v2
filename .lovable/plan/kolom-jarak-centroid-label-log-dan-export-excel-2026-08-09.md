# Kolom Jarak Centroid, Label Log, dan Export Excel

## 1. Kolom C dan Terdekat pada hasil klasterisasi (Admin)
Pada tabel "Hasil Klasterisasi — <kelompok>" (hanya untuk Admin), tambahkan kolom baru setelah kolom nilai:

- `C1`, `C2`, ... `Ck` — jarak tiap siswa ke setiap centroid akhir (sesuai K optimal kelompok tersebut), ditampilkan 6 desimal.
- `Terdekat` — nomor centroid dengan jarak terkecil, seperti pada perhitungan manual di Excel.

Jumlah kolom C mengikuti K yang dipakai kelompok tersebut. Guru tetap melihat tabel ringkas seperti sekarang.

## 2. Label aksi di Log Klasterisasi
Di halaman Log Klasterisasi, badge aksi `run` diganti dari "Hasil K-Means" kembali menjadi "Jalankan K-Means" (termasuk teks pada filter dan hasil export log).

## 3. Export Excel hasil klasterisasi (Admin dan Guru)
Tombol Export Excel tersedia untuk Admin maupun Guru, dan isi file disesuaikan:

- Sheet per kelompok kelas yang sedang ditampilkan (mengikuti filter Tahun Ajaran / Kelompok Kelas).
- Kolom: No, Nama, Jurusan, nilai mentah, nilai normalisasi, `C1..Ck`, `Terdekat`, `Klaster`, `Keterangan` (label).
- Sheet "Pengujian Elbow" hanya disertakan untuk Admin.
- Nama file mengikuti kelompok/tahun ajaran yang dipilih.

## Catatan teknis
- `src/lib/kmeans.ts`: ekspor centroid akhir sudah tersedia dari `kMeans`; untuk tampilan tabel, hitung ulang centroid per kelompok dari data hasil (rata-rata anggota tiap klaster) agar tidak perlu menyimpan centroid di database, lalu hitung jarak Euclidean kuadrat via `squaredDistance`.
- `src/pages/Clustering.tsx`: tambah kolom tabel (kondisional `isAdmin`), perluas `handleExport` untuk memakai `visibleGroups` dan kolom jarak.
- `src/pages/AdminLogs.tsx`: ubah teks badge dan `actionLabel`.
- Tidak ada perubahan database.
