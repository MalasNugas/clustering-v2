# Samakan Kolom C dan Terdekat dengan File Excel

## Temuan dari `Hasil_Klasterisasi-2.xlsx`

Pada sheet KELAS 10 / KELAS 11, tiap iterasi punya kolom `C1`, `C2`, `C3`, `TERDEKAT`, `CLUSTER`:

- Nilai `C1..Ck` dihitung dari **nilai mentah** (bukan normalisasi), memakai jarak Euclidean biasa (dengan akar).
  Contoh: siswa (71, 80, 89) terhadap centroid (83, 80, 90) → `akar(144 + 0 + 1) = 12,041595`.
- Kolom `TERDEKAT` berisi **nilai jarak terkecil** dari baris tersebut (angka, mis. 9,541711), bukan nomor centroid.
- Nomor centroid tetap ada di kolom `CLUSTER` yang terpisah.

Di aplikasi sekarang, `C1..Ck` dihitung dari nilai **normalisasi** (sehingga angkanya kecil, 0–1) dan `Terdekat` menampilkan **nomor** klaster. Itu sebabnya tampilannya tidak cocok dengan Excel.

## Yang akan diubah

1. **Kolom C pakai nilai mentah**
   Jarak dihitung terhadap centroid akhir yang dibentuk dari rata-rata nilai mentah anggota tiap klaster, dengan jarak Euclidean (berakar), ditampilkan 6 desimal — persis seperti Excel.

2. **Kolom Terdekat berisi angka jarak terkecil**
   Bukan lagi nomor klaster. Nomor klaster tetap terbaca pada kolom "Klaster" yang sudah ada di sebelahnya.

3. **Jumlah kolom C mengikuti K optimal kelompok**
   Kolom yang ditampilkan tepat `C1..C{K optimal}` untuk tiap kelompok kelas/jurusan yang sedang ditampilkan (mis. KLS 10 DKV → C1..C4, KLS 10 TKP → C1..C2).

4. **Export Excel ikut menyesuaikan**
   Kolom `C1..Ck` dan `Terdekat` pada file ekspor memakai perhitungan yang sama, sehingga file hasil unduhan sebanding langsung dengan perhitungan manual.

## Catatan teknis

- Perubahan terbatas pada `src/pages/Clustering.tsx`: fungsi `groupDistances` menerima matriks nilai mentah (`raw`) alih-alih `normalized`, mengembalikan `dists` dan `nearestValue` (nilai minimum), dipakai pada tabel hasil (Admin) dan pada `handleExport`.
- Kolom normalisasi, nomor klaster, label, WCSS, dan Elbow tidak berubah.
- Tidak ada perubahan database.
