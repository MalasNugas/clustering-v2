# Samakan KLS 10 DKV (Admin) dengan Hasil_Klasterisasi-2.xlsx

## Temuan dari file acuan

File `Hasil_Klasterisasi-2.xlsx` hanya berisi dua sheet: **KELAS 10** (208 siswa gabungan semua jurusan) dan **KELAS 11**. Di dalamnya:

- Perhitungan memakai **nilai mentah** (KODING, BI, MTK, INFOR, KEJU) — tidak ada kolom normalisasi Min-Max.
- **K = 3 tetap**, tidak ada tabel Elbow/WCSS maupun K optimal.
- Tiap iterasi punya kolom `C1`, `C2`, `C3`, `TERDEKAT` (nilai jarak terkecil), dan `CLUSTER`.
- Hasil akhir KELAS 10: klaster 1 = 98 siswa, klaster 2 = 8 siswa, klaster 3 = 102 siswa.

Karena centroid dihitung dari seluruh siswa KELAS 10, angka untuk siswa DKV tidak bisa direproduksi dari perhitungan per jurusan.

## Yang akan dikerjakan

1. **Sumber acuan baru (gabungan kelas)**
   Ekstrak hasil akhir sheet KELAS 10 dan KELAS 11 dari file ini ke berkas acuan baru: untuk tiap siswa disimpan nomor klaster akhir, `C1..C3`, dan nilai `Terdekat`, beserta centroid akhir tiap kelas.

2. **Tampilan Admin untuk KLS 10 DKV**
   Pada tabel "Hasil Klasterisasi — KLS 10 DKV":
   - Kolom `C1`, `C2`, `C3` dan `Terdekat` diambil dari perhitungan gabungan KELAS 10 (nilai mentah, jarak Euclidean berakar, 6 desimal) — persis angka di file.
   - Kolom `Klaster` mengikuti `CLUSTER` akhir file (1/2/3), dengan label sesuai skala 3 klaster.
   - Kolom nilai mentah dan nilai normalisasi tetap ditampilkan seperti sekarang (normalisasi hanya informatif, tidak dipakai untuk jarak).

3. **Panel Elbow**
   Untuk kelompok yang mengikuti acuan gabungan ini, K dikunci di 3 dan panel Pengujian Elbow tidak ditampilkan (file acuan tidak memuat WCSS). Kelompok lain tidak berubah.

4. **Export Excel**
   Sheet KLS 10 DKV pada export memakai angka yang sama: nilai mentah, `C1..C3`, `Terdekat`, `Klaster`, `Keterangan`.

5. **Tes regresi**
   Tambah tes yang mencocokkan seluruh siswa KLS 10 DKV terhadap acuan: nomor klaster, nilai `C1..C3`, dan `Terdekat` (toleransi 1e-4).

## Cakupan

Perubahan diterapkan pada **KLS 10 DKV** sesuai permintaan. Acuan yang diekstrak sudah mencakup seluruh KELAS 10 dan KELAS 11, sehingga jurusan lain bisa disamakan dengan cara yang sama bila diminta nanti.

## Catatan teknis

- Berkas baru `src/lib/excelKelasResults.ts` (auto-generated dari sheet KELAS 10/11): peta nama siswa → `{ cluster, dists[3], nearest }`.
- `src/pages/Clustering.tsx`: `groupDistances` memakai acuan tersebut bila kelompok termasuk cakupan acuan; `getK` mengunci 3; panel Elbow dan tabel hasil serta `handleExport` menyesuaikan.
- Tidak ada perubahan database maupun rumus untuk kelompok di luar cakupan.
