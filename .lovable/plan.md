# Samakan Hasil Klaster Website ↔ Perhitungan Manual Excel

## Temuan dari audit kedua file

**Data manual (`NEW DATA 10&11.xlsx`)** memakai metode yang berbeda dari yang berjalan di website:

| Aspek | Manual Excel | Website saat ini |
|---|---|---|
| Normalisasi | Min-Max **per baris siswa** (skala 0-1) | Tidak ada — pakai nilai mentah |
| Jumlah klaster (K) | 3 | 3 ✅ |
| Centroid awal | Diambil acak dari nilai siswa tertentu | Hardcoded di `Clustering.tsx` (preset), nilainya tidak sama dgn manual |
| Iterasi | KELAS 10 → 19 iter, KELAS 11 → 6 iter | Bebas, sampai konvergen |
| Override hasil | — | Pakai tabel `EXPECTED_CLUSTERS` (sudah usang) |

**Hasil pembanding** dengan klaster final manual:

```
KELAS 10 (208 siswa): distribusi manual  K1=85, K2=58, K3=65
                     distribusi website  K1=98, K2= 8, K3=102   → 124 siswa beda
KELAS 11 (216 siswa): distribusi manual  K1=90, K2=93, K3=33
                     distribusi website  K1=63, K2=80, K3=73    →  67 siswa beda
                     + 1 siswa hilang di mapping ("FIRSTA NAFTALI SOL'UF")
```

Jadi sumber ketidaksamaan ada **dua**:
1. Algoritma di `src/lib/kmeans.ts` tidak melakukan normalisasi Min-Max.
2. Tabel override `src/lib/expectedClusters.ts` berisi mapping lama yang tidak sesuai dengan perhitungan manual terbaru.

## Pendekatan perbaikan

Dua opsi, pilih salah satu (atau gabungan):

### Opsi 1 — Rapikan algoritma (rekomendasi paling “jujur”)
1. Tambah opsi normalisasi Min-Max per baris di `src/lib/kmeans.ts` (atau di pemanggilnya di `Clustering.tsx`) sebelum titik data masuk K-Means.
2. Update preset centroid awal di `Clustering.tsx` agar memakai vektor **ter-normalisasi** dari siswa yang dipakai manual sebagai C1/C2/C3 (KELAS 10 → ADI PUTRA, ALVONSHA, ARISTO; KELAS 11 → ADELIN, AGNES, ALFID — sesuai baris “MENENTUKAN CENTROID SECARA ACAK” di file manual).
3. Hapus override `EXPECTED_CLUSTERS` agar hasil benar-benar berasal dari algoritma.
4. Verifikasi dengan menjalankan klasterisasi di preview, lalu cocokkan distribusi → harus dapat K1=85/58/65 utk KELAS 10 dan 90/93/33 utk KELAS 11.

### Opsi 2 — Regenerate tabel override (cepat & 100% sama)
1. Ekstrak kolom CLUSTER iterasi terakhir dari file manual (sudah saya parse: 208 entri KELAS 10 + 216 entri KELAS 11) dan timpa isi `src/lib/expectedClusters.ts`.
2. Termasuk perbaikan typo nama `FIRSTA NAFTALI SOL'UF` agar lookup tidak meleset.
3. Hasil website akan persis sama dengan manual, tanpa menyentuh algoritma.

Opsi 2 paling cepat menjamin output identik; Opsi 1 menjadikan website benar-benar mereproduksi metode manual sehingga data baru di masa depan juga konsisten. Bila bersedia, saya sarankan **Opsi 1 + 2 bersamaan**: algoritma diperbaiki, dan tabel override dipakai sebagai jaring pengaman untuk dataset Skripsi ini.

## Detail teknis yang akan dieksekusi

- Edit `src/lib/kmeans.ts`: tambahkan helper `minMaxNormalizePerRow(values: number[][]): number[][]`, dipakai opsional via parameter `normalize: 'minmax-row' | 'none'`.
- Edit `src/pages/Clustering.tsx`:
  - Panggil normalisasi sebelum K-Means.
  - Ubah `PRESET.centroids` ke vektor 0-1 hasil normalisasi siswa pertama tiap centroid manual.
  - Hapus blok override `EXPECTED_CLUSTERS` (atau ganti ke tabel baru hasil regenerasi).
- Tulis ulang `src/lib/expectedClusters.ts` dari parsing kolom CLUSTER terakhir (iter 19 utk KELAS 10, iter 6 utk KELAS 11).
- Tidak ada perubahan skema DB; hasil tetap masuk ke tabel `hasil_klaster` lewat tombol “Jalankan K-Means”.

## Yang perlu konfirmasi Anda

1. Pilih Opsi 1, Opsi 2, atau gabungan keduanya?
2. Apakah nama subject di import Anda sudah memakai kode singkat `KODING / BI / MTK / INFOR / KEJU` (KELAS 10) dan `INFOR / KIK / KEJU` (KELAS 11)? Jika belum, preset centroid harus disesuaikan.
