# Ringkasan label mengikuti K optimal kelompok yang ditampilkan

## Masalah

Kartu ringkasan di atas tabel hasil menghitung label dari **seluruh** baris `hasil_klaster` di database, tanpa memperhatikan kelompok yang sedang ditampilkan atau K yang dipakai. Karena tiap kelas/jurusan punya K optimal dan set label sendiri (mis. satu kelompok K=3 memakai Tinggi/Sedang/Rendah, kelompok lain K=5 memakai Sangat Tinggi … Sangat Rendah), gabungan semua kelompok bisa menghasilkan 5, 6, bahkan 7 kartu walau kelompok yang dilihat hanya K=4.

## Perubahan

- Ringkasan dihitung hanya dari kelompok yang sedang tampil (mengikuti filter kelompok/kelas yang aktif), bukan dari seluruh isi tabel hasil.
- Saat satu kelompok dipilih, jumlah kartu tepat sama dengan K optimal kelompok itu — label yang tidak dipakai tidak muncul, dan label dengan 0 siswa tidak ditampilkan.
- Saat "Semua Kelompok" dipilih, ringkasan tetap gabungan (bisa lebih dari 4 label karena K tiap kelompok berbeda), namun diberi keterangan singkat bahwa ringkasan mencakup seluruh kelompok dengan K masing-masing.
- Urutan kartu tetap dari Sangat Tinggi → Sangat Rendah.

## Detail teknis

Di `src/pages/Clustering.tsx`, `labelSummary` diubah agar memfilter `hasilKlaster` berdasarkan `siswa_id` milik `visibleGroups` sebelum menghitung, dan label diambil dari `h.label` (acuan Excel) seperti sekarang. Tidak ada perubahan pada algoritma K-Means, elbow, maupun data di database.
