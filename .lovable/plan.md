## Temuan

- Kebijakan akses tabel `hasil_klaster` hanya mengizinkan role **guru**. Akun yang dipakai (`marchellino940@gmail.com`) berperan **admin**, sehingga simpan hasil K-Means ditolak.
- Nama mata pelajaran di database sangat panjang (mis. "Dasar Dasar Desain Pemodelan dan Informasi Banguna", "Pendidikan Jasmani, Olahraga, dan Kesehatan"), membuat kolom tabel Master Data melebar.

## Perubahan

**1. Izin hasil klasterisasi (migrasi database)**
- Ganti kebijakan kelola `hasil_klaster` agar berlaku untuk guru **dan** admin (memakai fungsi akses yang sudah ada), sehingga admin bisa menjalankan dan mereset K-Means. Tampilan hasil tetap bisa dilihat publik.

**2. Singkatan nama mata pelajaran (tampilan saja)**
- Tambah util `src/lib/mapelShort.ts` berisi pemetaan nama panjang → singkat, mis.:
  - Pendidikan Agama Islam dan Budi Pekerti → PAI
  - Pendidikan Jasmani, Olahraga, dan Kesehatan → PJOK
  - Pendidikan Pancasila → PP
  - Bahasa Indonesia → B. Indo; Bahasa Inggris → B. Ing
  - Kreativitas, Inovasi, dan Kewirausahaan → KIK
  - Koding dan Kecerdasan Artifisial → Koding & KA
  - Dasar Dasar … → "Dasar" + akronim jurusan (mis. Dasar DKV, Dasar DPIB, Dasar TJKT, Dasar TKR)
  - Muatan Lokal Potensi Daerah → Mulok
  - Matematika (Umum) → MTK; Projek IPAS → IPAS
  - Nama lain: akronim otomatis bila > 18 karakter.
- Pakai singkatan pada header kolom tabel Master Data, dengan `title`/tooltip berisi nama lengkap agar tetap jelas.

## Catatan teknis

Nama asli di database tidak diubah — hanya lapisan tampilan, jadi import, klasterisasi, dan pencocokan `dipakai_klaster` tetap aman. Migrasi hanya menyentuh kebijakan akses `hasil_klaster`.