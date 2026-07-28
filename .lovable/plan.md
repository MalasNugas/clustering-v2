## Tujuan
Membuat kolom **Klaster** pada tabel "Hasil Klasterisasi" di menu Klasterisasi hanya menampilkan `Klaster 1` / `Klaster 2` / dst., tanpa embel-embel label ("— Sangat Tinggi").

## Perubahan
- `src/pages/Clustering.tsx` — pada badge di kolom Klaster tabel hasil, tampilkan hanya `Klaster {h.klaster}`. Warna badge tetap mengikuti label (`labelClass(lab)`) supaya perbedaan tingkat tetap terlihat, dan nama label lengkap dipasang di atribut `title` agar muncul saat hover.

## Yang tidak diubah
- Kartu ringkasan jumlah siswa per label (Sangat Tinggi, Tinggi, dst.) tetap ada.
- Kolom "Keterangan" pada export Excel tetap berisi label lengkap.
