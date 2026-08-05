# Toggle ON/OFF di halaman Permintaan Akses

## Kondisi saat ini (terverifikasi)

- Halaman `Permintaan Akses` (`/admin/requests`) sudah memuat komponen Switch dengan label ON/OFF di kolom "Akses Master Data".
- Data di backend: ada 2 akun guru (satu dengan status `approved`, satu tanpa baris permintaan sama sekali) dan 1 akun admin.
- Artinya tabel seharusnya menampilkan 2 baris beserta toggle-nya. Karena Anda tidak melihatnya, penyebabnya perlu dipastikan dulu — kemungkinan besar salah satu dari: tampilan lama masih ter-cache di browser, tabel gagal memuat baris (data kosong sehingga muncul teks "Belum ada akun guru"), atau kolom toggle terpotong pada lebar layar 1099px sehingga tergeser keluar area.

## Yang akan dikerjakan

1. Verifikasi tampilan nyata halaman dengan sesi admin, lalu tangkap layar untuk memastikan apakah toggle benar-benar tidak ter-render atau hanya terpotong.
2. Perbaiki sesuai temuan:
   - Jika baris kosong: tampilkan pesan diagnostik dan pastikan pengambilan daftar guru tidak terhalang aturan akses.
   - Jika terpotong: bungkus tabel dengan area gulir horizontal dan pindahkan toggle ke posisi lebih awal (setelah kolom Nama) supaya selalu terlihat.
3. Perjelas kontrol: satu switch per baris dengan teks "ON"/"OFF" dan tooltip singkat, plus badge status yang sinkron (aktif / nonaktif / menunggu / ditolak).
4. Pastikan tombol toggle tetap bekerja untuk guru yang belum pernah mengajukan permintaan (admin langsung mengaktifkan akses tanpa perlu ada pengajuan lebih dulu).
5. Uji ulang: nyalakan dan matikan akses untuk satu akun guru, konfirmasi status tersimpan dan menu Master Data guru mengikuti perubahan.

## Catatan teknis

- File utama: `src/pages/AdminRequests.tsx` (tabel + Switch), `src/hooks/useUserRole.tsx` (status `revoked`), `src/components/MasterDataAccessBanner.tsx`.
- Aksi toggle menulis ke tabel `master_data_access_requests` dengan status `approved` / `revoked`. Jika akun guru belum punya baris, perlu pembuatan baris baru oleh admin — aturan akses untuk penulisan oleh admin akan dicek dan, bila perlu, ditambahkan lewat migrasi.
