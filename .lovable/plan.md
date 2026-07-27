## Tujuan

Menyesuaikan sistem dengan file perhitungan manual terbaru: data dipisah per **kelas + jurusan** (14 kelompok), dinormalisasi Min-Max dulu, baru K-Means (K=3).

## Temuan dari file Excel

- `SEBELUM DI LAKUKAN PERHITUNGAN_KLS 10&11.xlsx` punya **14 sheet** = 14 kelompok (KLS 10 DKV, DPIB, TESHA, TJKT, TKP, TKR 1, TKR 2, dan 7 sheet KLS 11).
- Header data mulai baris ke-3: `No | NAMA PESERTA DIDIK | NISN | <daftar mapel>`. Nilai kosong ditulis `-`.
- Di `NEW_DATA_10_11-2.xlsx`, hanya sebagian mapel dipakai sebagai fitur (blok "NILAI SETELAH DI NORMALISASI PAKAI MIN-MAX"):
  - KLS 10: Koding, Bahasa Inggris, Matematika, Projek IPAS, Informatika, Dasar-Dasar Kejuruan (6 fitur)
  - KLS 11: Kreativitas/Inovasi (KIK) + Mapel Kejuruan (2 fitur)
- Normalisasi Min-Max **per kolom, per kelompok**: `(x - min) / (max - min)`.
- Jarak memakai **Euclidean kuadrat** (tanpa akar) — urutan klaster sama, tetap saya samakan.
- Label diambil dari rata-rata **nilai asli** tiap klaster: tertinggi = Tinggi, tengah = Sedang, terendah = Rendah.

## Perubahan yang akan dibuat

### 1. Data & struktur

- Hapus seluruh data lama (`hasil_klaster`, `nilai`, `siswa`, `mata_pelajaran`, `jurusan`).
- Setiap sheet menjadi satu baris `jurusan` (mis. "KLS 10 DKV") sehingga kelompok tidak lagi digabung.
- Tambah kolom `dipakai_klaster boolean default false` di `mata_pelajaran`, dicentang hanya untuk mapel fitur sesuai daftar di atas (mapping nama mapel per kelas 10/11 ditanam di kode import).
- Data dari file Excel yang Anda kirim di-import langsung ke database (bukan Anda upload manual), sehingga isi Master Data langsung sesuai.

### 2. Mesin perhitungan (`src/lib/kmeans.ts` + file baru `src/lib/normalize.ts`)

- Fungsi `minMaxNormalize(matrix)` — per kolom; jika `max == min`, hasil 0.
- `kMeans` diubah: pakai jarak Euclidean kuadrat, iterasi sampai assignment tidak berubah (maks 100).
- Centroid awal deterministik: siswa dengan rata-rata normalisasi **tertinggi / tengah / terendah** (reproducible, tidak acak). Bisa saya ganti kalau Anda punya aturan pasti dari Excel.

### 3. Halaman Klasterisasi (`src/pages/Clustering.tsx`)

- Hapus `expectedClusters.ts` (hasil hardcode lama) dan blok `PRESET` centroid lama.
- Alur baru per kelompok: ambil siswa + nilai mapel bertanda `dipakai_klaster` → normalisasi Min-Max → K-Means (K=3) → simpan klaster.
- Penamaan Tinggi/Sedang/Rendah dihitung dari rata-rata nilai asli tiap klaster (bukan nomor klaster tetap).
- Tabel hasil ditampilkan terpisah per kelompok, dengan kolom nilai asli + nilai normalisasi (bisa di-toggle) + klaster + keterangan.
- Export Excel: satu sheet per kelompok, berisi nilai asli, nilai normalisasi, klaster, keterangan.

### 4. Master Data (`src/pages/MasterData.tsx`)

- Importer diperbarui untuk format multi-sheet baru (header di baris 3, `-` = kosong, nama sheet = jurusan/kelompok).
- Tab Mata Pelajaran menampilkan penanda "dipakai untuk klasterisasi".

## Catatan teknis

- Migrasi database diperlukan untuk kolom `dipakai_klaster`; penghapusan + pengisian data lewat operasi data biasa.
- Total ± 14 kelompok, ratusan siswa; import dilakukan bertahap (batch) agar tidak kena limit.
- Hasil website akan identik dengan Excel selama daftar mapel fitur dan K sama; kalau ada selisih karena centroid awal, saya sesuaikan setelah pengujian pertama.
