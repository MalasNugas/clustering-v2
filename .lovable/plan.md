## Masalah
Saat deploy ke Vercel, `npm install` gagal dengan error `ERESOLVE`. Penyebabnya adalah konflik *peer dependency* antara `lovable-tagger@1.1.13` (memerlukan Vite versi lama) dan `vite@8.0.0` yang terpasang di project.

Plugin `lovable-tagger` hanya dipakai saat mode **development** di Lovable Editor (`vite.config.ts` baris 15: `mode === "development" && componentTagger()`). Plugin ini sama sekali tidak diperlukan untuk build production di Vercel.

## Solusi
1. **Hapus `lovable-tagger` dari `devDependencies` di `package.json`**  
   Agar Vercel tidak mencoba menginstal plugin yang memicu konflik peer dependency.

2. **Ubah `vite.config.ts` ke dynamic import**  
   Gunakan `import()` bersyarat hanya saat `mode === 'development'`, sehingga Vite tidak mencoba memuat modul tersebut saat build di Vercel.

3. **Verifikasi build lokal**  
   Pastikan `npm install` dan `vite build` berjalan tanpa error setelah perubahan.

## Detail Teknis
- File yang diubah: `package.json`, `vite.config.ts`
- Tidak ada perubahan pada aplikasi — ini hanya perbaikan konfigurasi build.