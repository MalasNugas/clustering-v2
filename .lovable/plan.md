## Masalah

Vercel masih menampilkan versi lama seluruhnya. Karena Vercel build dari repo GitHub, artinya commit terbaru dari Lovable belum sampai ke branch yang dipakai Vercel. Penyebab paling umum pada project hasil **remix**: koneksi GitHub tidak ikut ter-copy, sehingga project ini belum tersambung ke repo mana pun — Vercel masih membangun repo project lama.

## Langkah perbaikan

1. **Cek koneksi GitHub project ini**
   - Menu Plus (+) di kotak chat → GitHub. Jika tertulis "Connect project", berarti project remix ini memang belum tersambung ke repo apa pun.

2. **Jika belum tersambung**
   - Buat repo baru dari Lovable (GitHub → Create Repository). Seluruh kode versi terbaru akan ter-push ke repo itu.
   - Di Vercel: buat project baru dari repo baru tersebut, atau ubah Git repository project Vercel yang lama ke repo baru (Vercel → Settings → Git).

3. **Jika sudah tersambung**
   - Pastikan branch yang dipakai Vercel sama dengan branch default repo (biasanya `main`).
   - Cek tab Deployments di Vercel: apakah ada build baru setelah perubahan terakhir. Jika tidak ada, jalankan Redeploy manual dengan opsi cache dimatikan.

4. **Set Environment Variables di Vercel**
   Build akan sukses tapi aplikasi blank/tanpa data jika variabel ini belum diisi di Vercel (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

   Nilainya harus menunjuk ke backend yang sama dengan yang dipakai preview, atau ke Supabase milik Anda sendiri jika sudah dimigrasi dengan SQL yang saya berikan sebelumnya.

5. **Verifikasi**
   - Setelah deploy selesai, buka situs Vercel dalam mode incognito (menghindari cache browser), login ulang, lalu cek halaman Klasterisasi — kolom Klaster harus menampilkan "Klaster 1" saja.

## Catatan teknis

- Perubahan **database** (role admin/guru, migrasi RLS, data siswa) tidak butuh deploy — langsung berlaku di semua environment yang menunjuk backend yang sama.
- Perubahan **kode frontend** butuh push ke GitHub + build ulang Vercel.
- Alternatif tanpa Vercel: gunakan tombol Publish di Lovable untuk mendapat URL `.lovable.app` yang otomatis selalu memakai kode terbaru.

## Yang bisa saya kerjakan

Langkah 1–3 harus Anda lakukan di UI Lovable dan dashboard Vercel (saya tidak punya akses ke sana). Jika setelah repo tersambung masih ada error build di Vercel, kirimkan log build-nya dan saya perbaiki di kode.
