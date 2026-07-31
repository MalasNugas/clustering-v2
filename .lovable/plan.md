## Tujuan

Admin bisa melihat riwayat (log) siapa menjalankan atau mereset klasterisasi, kapan, dengan pengaturan apa, dan hasil ringkasnya.

## Yang dibangun

**1. Tabel log baru (`clustering_logs`)**

Menyimpan setiap aksi di halaman Klasterisasi:
- siapa yang menjalankan (user id + nama lengkap saat itu)
- jenis aksi: jalankan K-Means atau reset hasil
- jumlah kelompok yang diproses, total siswa yang diklaster
- rincian per kelompok (nama kelompok, K yang dipakai, jumlah iterasi, jumlah siswa)
- apakah memakai nilai normalisasi
- waktu kejadian

Aturan akses:
- Guru dan admin boleh menambah baris log untuk dirinya sendiri.
- Hanya admin yang boleh melihat semua log.
- Tidak ada yang bisa mengubah atau menghapus log (log bersifat permanen), kecuali admin boleh menghapus untuk membersihkan riwayat lama.

**2. Pencatatan otomatis di halaman Klasterisasi**

Setelah proses K-Means selesai sukses, dan setelah tombol Reset, aplikasi menulis satu baris log. Kegagalan tidak dicatat sebagai sukses. Pencatatan tidak menghalangi alur bila gagal menyimpan log.

**3. Halaman baru `/admin/logs` — "Log Klasterisasi"**

Hanya untuk admin (rute diproteksi `requireRole="admin"`), muncul di grup Admin pada sidebar dengan ikon riwayat.

Isi halaman:
- Ringkasan atas: total aksi, jumlah guru yang aktif menjalankan, waktu aksi terakhir.
- Filter: berdasarkan pengguna, jenis aksi, dan rentang tanggal.
- Tabel: Waktu | Nama Pengguna | Aksi | Jumlah Kelompok | Total Siswa | Normalisasi | Detail.
- Baris bisa dibuka untuk melihat rincian per kelompok (kelompok, K, iterasi, jumlah siswa).
- Tombol Export Excel untuk log yang sedang tampil.
- Tombol hapus log lama (opsional, dengan konfirmasi).

## Catatan teknis

- Butuh satu migrasi database untuk tabel `clustering_logs` beserta GRANT dan kebijakan akses.
- Nama pengguna diambil dari tabel profil saat pencatatan agar log tetap terbaca meski profil berubah.
- File baru: `src/pages/AdminLogs.tsx`; perubahan pada `src/App.tsx`, `src/components/AppSidebar.tsx`, dan `src/pages/Clustering.tsx`.
