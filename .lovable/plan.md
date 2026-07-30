## Tujuan

Halaman Klasterisasi tampil berbeda tergantung role:
- **Admin**: tetap seperti sekarang (pengujian Elbow Method, pemilihan K per kelompok, toggle normalisasi).
- **Guru**: tampilan sederhana — hanya tombol Jalankan K-Means dengan K = 3 untuk semua kelompok, dan nilai yang ditampilkan sudah dalam bentuk normalisasi.

## Perubahan

**1. Deteksi role di halaman Klasterisasi (`src/pages/Clustering.tsx`)**
- Pakai hook `useUserRole()` yang sudah ada (`isAdmin` / `isGuru`).

**2. Sembunyikan bagian Elbow untuk Guru**
- Seluruh blok kartu "Pengujian Elbow Method — {kelompok}" (grafik WCSS + tabel % penurunan + dropdown "K Optimal") hanya dirender bila `isAdmin`.

**3. K tetap 3 untuk Guru**
- Fungsi penentu K dibuat mengembalikan 3 untuk role guru, mengabaikan `DEFAULT_K` dan hasil Elbow otomatis. Jadi tombol "Jalankan K-Means" pada akun guru selalu menjalankan K = 3 untuk semua kelas/jurusan, dengan label 3 tingkat (Tinggi / Sedang / Rendah) sesuai skala label yang sudah ada.

**4. Normalisasi otomatis aktif**
- Nilai awal `showNormalized` di-set `true` saat role guru, dan switch "Tampilkan nilai normalisasi" disembunyikan agar tampilan tetap konsisten (admin masih bisa mengganti).

**5. Elemen lain**
- Tombol Reset, filter Kelompok Kelas, filter Klaster, dan Export Excel tetap tersedia untuk guru (tidak diminta dihapus). Teks pengantar di atas halaman disesuaikan untuk guru: alur data mentah → normalisasi Min-Max → K-Means (K = 3), tanpa menyebut Elbow.

## Catatan teknis

- Perhitungan Elbow (`elbowByGroup`) tidak perlu dijalankan pada akun guru sehingga halaman lebih ringan.
- Hasil disimpan seperti biasa ke tabel hasil klaster dengan `k_used = 3` dan label sesuai K = 3.
- Tidak ada perubahan database maupun aturan akses.
