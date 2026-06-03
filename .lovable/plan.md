Masalahnya bukan dari file Excel. Import gagal karena aturan keamanan database hanya mengizinkan akun dengan role `guru` untuk menambah data `jurusan`, sementara tabel `user_roles` saat ini kosong, jadi akun yang login belum dianggap sebagai guru.

Rencana perbaikan:

1. Tetapkan role `guru` untuk akun yang sedang digunakan
   - Tambahkan data role ke tabel `user_roles` untuk user yang terakhir login.
   - Ini akan membuat import `jurusan`, `mata_pelajaran`, `siswa`, dan `nilai` lolos aturan keamanan.

2. Verifikasi aturan role
   - Cek bahwa role `guru` sudah terbaca oleh fungsi pengecekan akses database.
   - Pastikan import tidak lagi berhenti di tahap `Insert jurusan`.

3. Perbaiki pesan error di halaman Master Data
   - Jika user belum login atau belum punya role guru, tampilkan pesan yang lebih jelas seperti: “Silakan login sebagai guru sebelum import data.”
   - Ini menggantikan pesan teknis `row-level security policy` agar tidak membingungkan.

Catatan: Setelah ini, silakan login ulang bila masih gagal, lalu coba import ulang file `DATA GABUNGAN 10,11.xlsx`.