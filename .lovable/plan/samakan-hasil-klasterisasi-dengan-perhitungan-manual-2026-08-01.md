# Samakan Hasil Klasterisasi dengan Perhitungan Manual

## Temuan dari file `Hasil_Klasterisasi.xlsx`

- File hanya berisi **2 kelompok perhitungan**: `KELAS 10` (212 siswa) dan `KELAS 11` (216 siswa) — bukan 14 kelompok kelas+jurusan seperti di website sekarang.
- Mata pelajaran yang dipakai:
  - KELAS 10: KODING, BI (Bahasa Inggris), MTK (Matematika), INFOR (Informatika), KEJU (mapel kejuruan sesuai jurusan) — 5 fitur. **Projek IPAS tidak dipakai**, padahal di website sekarang ikut dihitung.
  - KELAS 11: INFOR (Informatika), KIK (Kreativitas, Inovasi & Kewirausahaan), KEJU (mapel kejuruan) — 3 fitur. Sudah dicocokkan dengan data website (contoh: ADELIN GONO = 81 / 80 / 90, sama persis).
- K = 3 pada kedua kelas, centroid awal diambil dari 3 siswa pertama pada daftar.

## Yang akan diubah

**1. Pengelompokan: dari 14 kelompok menjadi 2 kelompok (KELAS 10 dan KELAS 11)**

Semua siswa dengan nama jurusan berawalan "KLS 10"/"KLAS 10" digabung jadi satu kelompok perhitungan, begitu juga kelas 11. Jurusan tetap tersimpan dan tetap ditampilkan sebagai kolom informasi di tabel hasil, tetapi K-Means dijalankan sekali per kelas.

**2. Pemilihan mata pelajaran mengikuti file**

- Kelas 10: Koding, Bahasa Inggris, Matematika, Informatika, dan mapel kejuruan (Dasar-dasar <jurusan>). Projek IPAS dikeluarkan.
- Kelas 11: Informatika, KIK, dan mapel kejuruan.
- Mapel kejuruan tiap jurusan disamakan menjadi satu kolom fitur "KEJURUAN", supaya siswa lintas jurusan bisa dihitung dalam satu matriks.
- Beberapa jurusan kelas 11 (DPIB, TESHA, TJKT, TKR) tidak punya nilai Informatika. Nilai yang kosong diisi rata-rata kolom pada kelompoknya (bukan 0), agar tidak merusak normalisasi Min-Max.

**3. Alur perhitungan tetap seperti sekarang** (sesuai pilihan Anda)

Data mentah → normalisasi Min-Max per kolom dalam kelompok → K-Means K = 3 → penamaan Tinggi/Sedang/Rendah berdasarkan rata-rata nilai asli. Elbow Method tetap ada untuk admin, tapi kini hanya 2 grafik (KELAS 10 & KELAS 11).

**4. Centroid awal dibuat sama dengan file**

Centroid awal memakai 3 siswa pertama (urutan nama) di tiap kelas, dinormalisasi, menggantikan pemilihan otomatis sebaran tertinggi/tengah/terendah. Hasil jadi deterministik dan sejalan dengan langkah manual.

**5. Tampilan & ekspor menyesuaikan**

- Filter "Kelompok Kelas" berisi KELAS 10 dan KELAS 11.
- Tabel hasil menampilkan kolom Jurusan agar sebaran per jurusan tetap terbaca.
- Ekspor Excel menghasilkan 2 sheet + sheet Elbow.
- Log klasterisasi mencatat 2 kelompok.

## Catatan penting

Karena Anda memilih tetap memakai normalisasi Min-Max sementara file manual menghitung dengan nilai mentah, komposisi anggota klaster **bisa masih sedikit berbeda** dari file. Yang akan sama persis adalah struktur perhitungan (2 kelas, mapel yang dipakai, K = 3, centroid awal). Kalau nanti ingin benar-benar identik baris per baris, langkah berikutnya adalah mematikan normalisasi untuk perhitungan (tetap ditampilkan sebagai informasi).

## Catatan teknis

- Perubahan utama di `src/pages/Clustering.tsx` (pembentukan kelompok per kelas, pemetaan fitur, centroid awal), plus `src/lib/kmeans.ts` (parameter centroid awal sudah didukung).
- Konfigurasi mapel yang dipakai (`dipakai_klaster`) di database disesuaikan: Projek IPAS kelas 10 dinonaktifkan, Informatika kelas 11 diaktifkan.
- Tidak ada perubahan struktur tabel; hanya penyesuaian data konfigurasi mapel dan logika di frontend.
