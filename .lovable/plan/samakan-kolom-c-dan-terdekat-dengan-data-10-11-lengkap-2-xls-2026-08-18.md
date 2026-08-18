# Samakan Kolom C dan Terdekat dengan DATA_10_11_LENGKAP-2.xlsx

## Temuan dari file acuan

Sheet `KLS 10 DKV` pada file ini menghitung jarak di bagian K=4 (K optimal DKV) seperti berikut:

- Jarak dihitung dari **nilai normalisasi Min-Max** (0–1), bukan nilai mentah.
- Rumus jarak: **Euclidean kuadrat (tanpa akar)**.
  Contoh ADI PUTRA LODU HAMU DJUA: C1 = 0.359360, C2 = 0.025023, C3 = 0.807623, C4 = 1.707611.
- Kolom `TERDEKAT` = nilai jarak terkecil (0.025023), `CLUSTER` = 2 — sama dengan nomor klaster yang sudah dipakai aplikasi.
- Centroid adalah rata-rata nilai normalisasi anggota tiap klaster pada iterasi terakhir (mis. C1 = 0.3, 0.212121, 0.5, 0.327273, 0.818182, 0.090909).

Aplikasi saat ini menghitung C1..Ck dari **nilai mentah** dengan **akar** Euclidean, sehingga angkanya jauh berbeda dari file.

## Yang akan diubah

1. **Kolom C memakai nilai normalisasi + jarak kuadrat**
   Pada tabel Hasil Klasterisasi (Admin), `C1..Ck` dihitung dari matriks normalisasi kelompok terhadap centroid akhir (rata-rata normalisasi anggota tiap klaster), tanpa akar. Ditampilkan 6 desimal.

2. **Kolom Terdekat**
   Tetap berisi nilai jarak terkecil, mengikuti perhitungan baru.

3. **Jumlah kolom C**
   Tetap mengikuti K optimal kelompok (DKV = 4, kelompok lain sesuai acuan Elbow-nya).

4. **Export Excel**
   Kolom `C1..Ck` dan `Terdekat` pada file ekspor memakai perhitungan yang sama.

5. **Tes regresi**
   Tes baru mencocokkan beberapa siswa KLS 10 DKV (mis. ADI PUTRA, ALVONSHA, APRIANTI) terhadap angka acuan dengan toleransi 1e-6.

## Catatan teknis

- `src/pages/Clustering.tsx`: `groupDistances` menerima matriks `normalized` (bukan `raw`) dan memakai `squaredDistance` langsung tanpa `Math.sqrt`; pemanggilan di tabel hasil dan `handleExport` disesuaikan.
- Nomor klaster, label, WCSS, dan panel Elbow tidak berubah.
- Tidak ada perubahan database.
