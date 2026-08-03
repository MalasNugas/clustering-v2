# Samakan Nomor Klaster dan Penamaan Label dengan Excel + PENAMAAN_LABEL.docx

Saat ini website menomori klaster dari hasil K-Means-nya sendiri dan menamai label dengan mengurutkan rata-rata nilai (tertinggi → terendah). Karena itu "ADI PUTRA LODU HAMU DJUA" pada K=4 masuk Klaster 1 di website, padahal di Excel Klaster 2. Dokumen `PENAMAAN_LABEL-2.docx` juga menunjukkan penamaan tidak selalu urut (contoh KLS 10 DKV K=4: C1=SEDANG, C2=RENDAH, C3=TINGGI, C4=SANGAT TINGGI), jadi aturan pengurutan otomatis memang tidak cocok.

## Perubahan

### 1. Nomor klaster mengikuti Excel
- Ekstrak dari `DATA_10_11_LENGKAP.xlsx` kolom CLUSTER hasil akhir untuk setiap K = 1..6 pada ke-14 sheet kelas/jurusan.
- Simpan sebagai tabel acuan (nama/NIS siswa → nomor klaster per K per kelompok).
- Saat menjalankan K-Means, jika kelompok + K punya acuan Excel, nomor klaster tiap siswa memakai acuan tersebut; K-Means tetap dijalankan untuk iterasi/WCSS sehingga alur perhitungan tetap ditampilkan.
- Siswa yang tidak ada di acuan tetap memakai hasil K-Means.

### 2. Penamaan label dari dokumen
- Buat tabel label per kelompok per K sesuai `PENAMAAN_LABEL-2.docx`, contoh:
  - KLS 10 DKV K=4 → C1 SEDANG, C2 RENDAH, C3 TINGGI, C4 SANGAT TINGGI
  - KLS 10 TESHA K=4 → C1 TINGGI, C2 SEDANG, C3 SANGAT TINGGI, C4 RENDAH
- Label ditentukan langsung dari nomor klaster (bukan lagi dari peringkat rata-rata nilai).
- Perbaiki salah ketik dokumen ("SANGAT TINGI" pada KLS 11 TJKT K=4 dibaca "SANGAT TINGGI"); KLS 10 TJKT K=5 dan KLS 10 TKR 1 K=6 memiliki label ganda di dokumen dan akan dipakai apa adanya.
- Aturan lama di `src/lib/labels.ts` tetap dipakai sebagai cadangan bila kelompok/K tidak ada di dokumen.

### 3. Tampilan
- Tabel hasil tetap menampilkan "Klaster n" dengan label lengkap pada tooltip; warna badge mengikuti label baru.
- Ekspor Excel memakai label yang sama.

## Validasi
- Cek KLS 10 DKV K=4: "ADI PUTRA LODU HAMU DJUA" harus Klaster 2 dengan label RENDAH.
- Bandingkan seluruh siswa 14 kelompok pada K optimal masing-masing terhadap Excel dan pastikan 100% sama.
- Tambahkan test regresi untuk pemetaan label dan nomor klaster.

## Catatan teknis
- File baru: `src/lib/excelClusters.ts` (nomor klaster acuan) dan `src/lib/excelLabels.ts` (peta label per kelompok/K).
- Perubahan: `src/pages/Clustering.tsx` (pemakaian acuan + label), `src/lib/labels.ts` (fallback), test di `src/test/`.
- Tidak ada perubahan skema database; hasil tetap disimpan di `hasil_klaster`.
