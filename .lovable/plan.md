## Temuan

- Tabel `mata_pelajaran` menyimpan satu baris per jurusan, sehingga ada **153 baris** untuk hanya **30 nama unik** — inilah sumber tampilan "double".
- Hasil query: **tidak ada** mata pelajaran yang benar-benar tanpa nilai di database (semua punya baris nilai > 0). Jadi kolom yang terlihat kosong muncul karena Master Data menampilkan seluruh 153 kolom saat filter jurusan = "Semua", sehingga siswa dari jurusan lain kosong.

Perbaikan bersifat tampilan saja — tidak ada perubahan database, data tidak dihapus.

## Perubahan

**Dashboard (`src/pages/Dashboard.tsx`)**
- Daftar "Daftar Mata Pelajaran": tampilkan nama unik (dedupe case-insensitive, urut alfabetis).
- Kartu "Mata Pelajaran": hitung jumlah nama unik, bukan jumlah baris.

**Master Data (`src/pages/MasterData.tsx`)**
- Kolom mata pelajaran yang ditampilkan disaring: hanya mapel yang punya minimal satu nilai pada siswa yang sedang tampil (setelah filter jurusan/tahun/pencarian).
- Saat filter jurusan = "Semua", kolom digabung per nama unik agar tidak muncul kolom kembar; nilai tiap siswa diambil dari mapel milik jurusannya.
- Form tambah/edit nilai tetap memakai mapel spesifik jurusan siswa (tidak berubah), sehingga penyimpanan nilai tetap benar.

## Catatan teknis

Dedupe dilakukan di frontend memakai peta `nama → daftar mapel_id`; pengambilan nilai per siswa mencari id mapel yang cocok dengan jurusan siswa tersebut. Logika import, klasterisasi, dan `dipakai_klaster` tidak disentuh.