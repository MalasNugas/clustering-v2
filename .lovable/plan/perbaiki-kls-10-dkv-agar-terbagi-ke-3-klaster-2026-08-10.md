# Perbaiki KLS 10 DKV agar terbagi ke 3 klaster

## Penyebab

Pada perubahan sebelumnya, KLS 10 DKV diikat ke acuan gabungan sheet "KELAS 10" dari file Hasil_Klasterisasi (208 siswa sekaligus). Pada perhitungan gabungan itu, ke-33 siswa DKV memang semuanya jatuh di Klaster 1 (distribusi keseluruhan: 98 / 8 / 102). Karena itu tampilan Admin hanya menunjukkan 1 klaster untuk DKV. File baru yang diunggah (Hasil_Klasterisasi-3.xlsx) memberi hasil yang sama persis.

## Yang akan dikerjakan

1. **Kembalikan DKV ke perhitungan per jurusan**
   KLS 10 DKV (dan kelompok lain) tidak lagi mengambil nomor klaster dari acuan gabungan KELAS 10/11. K-Means dijalankan hanya pada 33 siswa DKV dengan K = 3, sehingga hasilnya tersebar ke Klaster 1, 2, dan 3 sesuai acuan per jurusan yang sudah ada (byK[3] pada acuan Excel per jurusan).

2. **Kolom C1–C3 dan Terdekat**
   Dihitung dari centroid akhir kelompok DKV sendiri (nilai mentah, jarak Euclidean berakar, 6 desimal), bukan dari centroid gabungan kelas.

3. **Panel Elbow kembali tampil**
   Karena kelompok tidak lagi terkunci ke acuan gabungan, Pengujian Elbow untuk DKV ditampilkan lagi bagi Admin; K default tetap bisa diatur (default 3 sesuai permintaan).

4. **Export Excel dan Log**
   Sheet KLS 10 DKV pada export memakai angka hasil per jurusan yang sama dengan tabel.

5. **Tes**
   Tes lama yang mengunci DKV ke acuan gabungan (`src/test/excelKelasResults.test.ts`) disesuaikan/dihapus, diganti tes yang memastikan hasil DKV pada K=3 memakai 3 nomor klaster.

## Catatan teknis

- `src/pages/Clustering.tsx`: hapus pemakaian `kelasSheetForGroup` / `kelasResult` pada `getK`, `runClustering`, `groupDistances`, panel Elbow, badge "Sesuai Excel", dan export.
- `src/lib/excelKelasResults.ts` dibiarkan ada (tidak dipakai) atau dihapus bila tidak ada pemakai lain.
- Tidak ada perubahan database; hasil lama perlu dijalankan ulang (tombol Jalankan K-Means) agar nomor klaster tersimpan diperbarui.
