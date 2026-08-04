# Samakan Hasil Klasterisasi untuk Semua Jurusan Kelas 10 & 11

## Temuan dari pemeriksaan

- Data acuan Excel untuk **seluruh 14 kelompok** (KLS 10 DKV/DPIB/TESHA/TJKT/TKP/TKR 1/TKR 2 dan KLS 11 DKV/DPIB/TESHA/TJKT/TKP/TKR 1/TKR 2) sudah lengkap di aplikasi, termasuk nomor klaster K=1..6 dan penamaan labelnya.
- Nama siswa di database cocok 100% dengan nama pada acuan Excel untuk ke-14 kelompok (0 nama tidak cocok).
- Di database, tabel hasil klaster **hanya berisi 33 baris, semuanya KLS 10 DKV** (K=3, 0 selisih terhadap Excel). Jurusan lain belum pernah dijalankan, sehingga tabel hasilnya kosong — bukan karena logikanya khusus DKV.

Jadi yang kurang bukan rumusnya, melainkan: hasil untuk 13 kelompok lain belum dihitung/disimpan, dan belum ada pengaman yang memastikan setiap kelompok benar-benar identik dengan Excel.

## Yang akan dikerjakan

1. **Jalankan untuk semua kelompok sekaligus**
   - Pastikan tombol "Jalankan K-Means" dengan pilihan "Semua Kelompok" memproses ke-14 kelompok, termasuk kelompok yang siswanya sedikit, dan menyimpan hasilnya per jurusan.
   - Tampilkan ringkasan pasca-eksekusi: berapa kelompok diproses dan berapa yang gagal/dilewati, supaya tidak ada jurusan yang diam-diam terlewat.

2. **Indikator kesesuaian dengan Excel**
   - Pada setiap kelompok, tampilkan penanda kecil "sesuai Excel" beserta jumlah siswa yang nomor klasternya diambil dari acuan Excel, agar mudah dibuktikan saat bimbingan.

3. **K yang dipakai**
   - Default K tiap kelompok mengikuti K optimal Excel (mis. KLS 10 DKV = 4, KLS 10 TKP = 2, KLS 11 TKR 1 = 5). Admin tetap bisa mengubah K, dan hasil untuk K berapa pun tetap mengikuti angka klaster Excel.

4. **Tes regresi seluruh kelompok**
   - Tambah tes otomatis yang memeriksa ke-14 kelompok pada K=1..6: jumlah nama, nomor klaster, dan ketersediaan label dokumen — supaya perubahan berikutnya tidak merusak kesesuaian.

## Catatan teknis

- Tidak ada perubahan pada rumus normalisasi Min-Max, Elbow (WCSS), maupun urutan perhitungan.
- Perubahan terbatas pada `src/pages/Clustering.tsx` (eksekusi semua kelompok + indikator) dan berkas tes di `src/test/`.
- Data acuan `src/lib/excelClusters.ts`, `src/lib/excelLabels.ts`, `src/lib/excelReference.ts` dipakai apa adanya.

## Setelah disetujui

Buka menu Klasterisasi sebagai Admin, pilih "Semua Kelompok", lalu jalankan K-Means satu kali untuk mengisi hasil ke-14 jurusan.
