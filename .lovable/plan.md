## Tujuan

Melengkapi alur perhitungan agar sama dengan file `DATA_10_11_LENGKAP.xlsx`:
raw data → normalisasi Min-Max → K-Means → **penentuan K optimal dengan Elbow Method** → penamaan label sesuai `PENAMAAN_LABEL.docx`.

## Temuan dari file yang dikirim

- 14 sheet (kelompok kelas + jurusan) — sama seperti dataset yang sudah ada di Master Data.
- Setiap sheet menghitung WCSS untuk K=1 sampai K=6, lalu tabel "PENGUJIAN METODE" berisi %Penurunan antar K dan penanda K terpilih.
- K optimal hasil manual per kelompok:
  - KLS 10: DKV=4, DPIB=3, TESHA=3, TJKT=3, TKP=2, TKR 1=3, TKR 2=3
  - KLS 11: DKV=3, DPIB=4, TESHA=3, TJKT=4, TKP=2, TKR 1=5, TKR 2=3
- `PENAMAAN_LABEL.docx` memberi nama klaster per nilai K, dengan skala label: SANGAT RENDAH, RENDAH, CUKUP RENDAH, SEDANG, CUKUP TINGGI, TINGGI, SANGAT TINGGI (urutan tergantung rata-rata nilai tiap klaster).

## Perubahan yang akan dibuat

### 1. Perhitungan (`src/lib/kmeans.ts`, file baru `src/lib/elbow.ts`)

- Tambah fungsi `computeWCSS(dataPoints, assignments, centroids)` — jumlah jarak Euclidean kuadrat tiap titik ke centroidnya.
- `runElbow(dataPoints, kMax = 6)` → menghasilkan array `{ k, wcss }` untuk K=1..6 plus `%penurunan` antar K, dan `optimalK` (K dengan titik siku / penurunan signifikan terakhir sebelum melandai).
- K-Means tetap: Min-Max dulu, jarak Euclidean kuadrat, centroid awal deterministik.

### 2. Penamaan label (file baru `src/lib/labels.ts`)

- Klaster diurutkan dari rata-rata nilai asli tertinggi → terendah, lalu diberi nama sesuai jumlah K:
  - K=1: Tinggi
  - K=2: Tinggi, Rendah
  - K=3: Tinggi, Sedang, Rendah
  - K=4: Sangat Tinggi, Tinggi, Sedang, Rendah
  - K=5: Sangat Tinggi, Tinggi, Sedang, Rendah, Sangat Rendah
  - K=6: Sangat Tinggi, Cukup Tinggi, Tinggi, Rendah, Cukup Rendah, Sangat Rendah

### 3. Halaman Klasterisasi (`src/pages/Clustering.tsx`)

- Bagian baru **"Pengujian Elbow Method"** per kelompok: tabel WCSS K=1..6, %Penurunan tiap perubahan K, dan grafik garis WCSS (recharts) dengan titik siku ditandai.
- K yang dipakai tiap kelompok ditentukan otomatis dari Elbow, tetapi bisa **diubah manual per kelompok** (dropdown K=2..6); nilai awal disetel ke K hasil perhitungan manual di atas agar hasil website langsung sama dengan Excel.
- Ringkasan klaster dan tabel hasil mengikuti K masing-masing kelompok (tidak lagi tetap 3), dengan nama label dari `labels.ts`.
- Export Excel: tambah sheet/blok "Pengujian Elbow" berisi WCSS dan %penurunan per kelompok, selain sheet hasil klaster.

### 4. Penyimpanan hasil

- Tabel `hasil_klaster` ditambah kolom `k_used integer` dan `label text` agar hasil tiap kelompok tersimpan lengkap (perlu satu migrasi database).
- Nilai WCSS tidak disimpan di database (dihitung ulang saat halaman dibuka), kecuali Anda ingin diarsipkan.

## Catatan teknis

- Dataset di Master Data akan saya cocokkan dulu dengan `DATA_10_11_LENGKAP.xlsx`; kalau ada selisih nama/nilai, data akan di-import ulang.
- Karena K bisa >3, warna badge klaster diperluas memakai token warna yang ada di design system.
