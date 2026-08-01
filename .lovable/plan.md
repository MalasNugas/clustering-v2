# Jalankan K-Means: Semua Kelompok atau Per Kelas

Guru dan Admin bisa memilih menjalankan K-Means untuk semua kelompok sekaligus (seperti sekarang) atau hanya untuk satu kelas saja (KELAS 10 atau KELAS 11).

## Perilaku baru

- Tombol "Jalankan K-Means" mengikuti pilihan pada dropdown **Kelompok Kelas**:
  - "Semua Kelompok" → hitung KELAS 10 dan KELAS 11, hasil lama dihapus semua (perilaku sekarang).
  - "KELAS 10" / "KELAS 11" → hitung hanya kelas itu. Label tombol menjadi "Jalankan K-Means — KELAS 10".
- Saat menjalankan satu kelas, hasil kelas lain **tidak** ikut terhapus: hanya baris hasil milik siswa kelas yang dijalankan yang diganti. Jadi hasil bisa dibangun bertahap per kelas.
- Toast menyebut kelompok yang diproses, mis. "Klasterisasi selesai untuk KELAS 11 (216 siswa)".
- Tombol Reset juga mengikuti pilihan: reset semua, atau reset hanya kelas terpilih.
- Log Klasterisasi mencatat kelompok yang benar-benar dijalankan (1 kelompok saat per kelas, 2 saat semua).

Aturan lain tidak berubah: guru tetap K = 3 dengan normalisasi aktif, admin tetap bisa mengatur K per kelompok dan melihat Elbow.

## Catatan teknis

- `src/pages/Clustering.tsx`:
  - `runClustering` menerima daftar grup target dari `kelompokFilter` (semua vs satu).
  - Penghapusan hasil lama memakai `delete().in("siswa_id", idsKelompok)` untuk mode per kelas, dan delete-all untuk mode semua.
  - `handleReset` memakai pola penghapusan yang sama.
  - Label tombol dan pesan toast/log menyesuaikan grup terpilih.
- Tidak ada perubahan skema database maupun `src/lib/kmeans.ts`.
