# Samakan Klasterisasi Website dengan Excel per Kelas/Jurusan

Acuan akhir adalah **`DATA_10_11_LENGKAP.xlsx`**. Perhitungan akan dikembalikan menjadi 14 kelompok independen sesuai setiap sheet (contoh: KLS 10 DKV, KLS 10 DPIB, …, KLS 11 TKR 2), bukan digabung menjadi KELAS 10 dan KELAS 11.

## Perubahan yang akan dibuat

### 1. Kelompok perhitungan dan pilihan proses
- Bentuk kelompok langsung dari setiap kelas/jurusan di Master Data sehingga tersedia 14 kelompok yang sama dengan sheet Excel.
- Dropdown **Kelompok Kelas** berisi “Semua Kelompok” dan setiap kelas/jurusan.
- “Semua Kelompok” menjalankan seluruh kelompok secara independen; pilihan satu kelas/jurusan hanya menghitung dan mengganti hasil kelompok tersebut.
- Reset, tampilan hasil, log, ringkasan, dan ekspor mengikuti kelompok yang dipilih.

### 2. Samakan input dan normalisasi dengan Excel
- Untuk setiap kelompok, gunakan mata pelajaran yang benar-benar dipakai pada sheet acuannya, termasuk Projek IPAS bila sheet tersebut menggunakannya.
- Pertahankan urutan siswa dan urutan variabel seperti di Excel.
- Jalankan Min-Max **per kolom di dalam masing-masing kelompok**, dengan rumus `(nilai - minimum) / (maximum - minimum)`.
- Hilangkan penggabungan lintas jurusan dan imputasi rata-rata lintas kelas yang sekarang mengubah data masukan.

### 3. Samakan K-Means dan hasil cluster
- Ekstrak konfigurasi centroid awal Excel untuk K=1 sampai K=6 pada masing-masing dari 14 sheet, lalu gunakan identitas siswa yang stabil sebagai seed agar hasil dapat direproduksi.
- Gunakan jarak Euclidean kuadrat, pemilihan jarak minimum, pembaruan centroid rata-rata anggota, aturan tie, dan kondisi berhenti yang sama dengan rumus Excel.
- Pertahankan nomor cluster hasil algoritma sesuai Excel; penamaan Tinggi/Sedang/Rendah dilakukan terpisah dan tidak boleh mengubah nomor cluster yang dibandingkan.
- Tambahkan pengujian regresi terhadap hasil cluster Excel untuk memastikan setiap siswa memperoleh cluster yang sama.

### 4. Samakan WCSS, persentase penurunan, dan K optimal
- Hitung WCSS K=1…K=6 dari jumlah jarak kuadrat terdekat pada hasil akhir masing-masing K.
- Ikuti presisi Excel: WCSS diringkas ke 4 desimal sebelum dipakai pada tabel perbandingan dan perhitungan persentase.
- Ubah tabel menjadi lima transisi: `K1 → K2`, `K2 → K3`, `K3 → K4`, `K4 → K5`, `K5 → K6`.
- Kolom WCSS pertama menampilkan deret K1…K5, kolom WCSS kedua menampilkan K2…K6, dan `% Penurunan = ((WCSS sebelum - WCSS sesudah) / WCSS sebelum) × 100`.
- Pilih K optimal memakai aturan titik siku Excel: K tujuan terakhir dengan penurunan yang masih berarti sebelum penurunan berikutnya melandai; contoh KLS 10 DKV menghasilkan K=4 karena 21,6917473% diikuti 8,1426162%.
- Nilai K otomatis pada Admin langsung mengikuti hasil Elbow, tetapi tetap dapat dipilih ulang bila diperlukan.

### 5. UI dan ekspor
- Tampilkan satu panel Elbow dan satu tabel hasil untuk setiap kelas/jurusan yang dipilih.
- Tampilkan K optimal, WCSS, dan % penurunan dengan presisi/label yang sama seperti Excel.
- Ekspor Excel menghasilkan sheet per kelas/jurusan serta ringkasan Elbow dengan urutan nilai yang sama.

## Validasi
- Buat pembanding otomatis untuk 14 sheet pada `DATA_10_11_LENGKAP.xlsx`.
- Verifikasi untuk tiap kelompok: nilai normalisasi sampel, WCSS K1–K6, lima persentase penurunan, K optimal, dan cluster setiap siswa.
- Jalankan pemeriksaan khusus KLS 10 DKV: WCSS ringkasan `20,1999 → 10,4891 → 6,8911 → 5,3963 → 4,9569 → 4,4836` dan K optimal `4`.
- Uji alur “Semua Kelompok” dan satu kelas/jurusan agar hasil kelompok lain tidak terhapus.

## Catatan teknis
- Perubahan utama: `src/pages/Clustering.tsx`, `src/lib/elbow.ts`, `src/lib/kmeans.ts`, dan konfigurasi fitur/seed per kelompok.
- Tidak memerlukan perubahan skema database; hasil tetap disimpan di `hasil_klaster` dan log tetap memakai `clustering_logs`.
