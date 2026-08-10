# Export Excel untuk Hasil Klasterisasi Data Dummy

## Masalah

Kelompok dummy bernama `KLS 10 TJKT 2025/2026` dan `KLS 11 TKR 1 2025/2026` (keduanya sudah punya hasil klasterisasi tersimpan). Nama sheet Excel dibuat langsung dari nama kelompok, padahal Excel melarang karakter `/ \ ? * [ ] :` pada nama sheet — sehingga proses ekspor gagal begitu sampai pada kelompok dummy.

## Perubahan

1. Bersihkan nama sheet sebelum dipakai: ganti karakter terlarang (`/ \ ? * [ ] :`) menjadi `-`, potong ke 31 karakter, dan pastikan tidak ada nama sheet ganda (tambah akhiran angka bila perlu).
2. Bungkus penambahan tiap sheet agar satu kelompok bermasalah tidak membatalkan seluruh ekspor; kelompok yang gagal dilaporkan lewat notifikasi, sisanya tetap terekspor.
3. Nama file ekspor juga dibersihkan dari karakter terlarang saat memilih kelompok/tahun ajaran dummy.
4. Untuk kelompok dummy yang tidak punya acuan Excel, sheet "Pengujian Elbow" tetap diisi dari hasil perhitungan aplikasi (tanpa acuan) seperti sekarang — tidak ada perubahan angka.

## Catatan teknis

- Perubahan hanya di `src/pages/Clustering.tsx` pada `handleExport` (helper `safeSheetName`).
- Tidak ada perubahan database maupun logika perhitungan.
