// Penamaan label klaster mengikuti dokumen PENAMAAN_LABEL.docx
// Klaster diurutkan dari rata-rata nilai asli TERTINGGI ke TERENDAH,
// lalu diberi nama sesuai skala di bawah ini.

const SCALES: Record<number, string[]> = {
  1: ["Tinggi"],
  2: ["Tinggi", "Rendah"],
  3: ["Tinggi", "Sedang", "Rendah"],
  4: ["Sangat Tinggi", "Tinggi", "Sedang", "Rendah"],
  5: ["Sangat Tinggi", "Tinggi", "Sedang", "Rendah", "Sangat Rendah"],
  6: [
    "Sangat Tinggi",
    "Cukup Tinggi",
    "Tinggi",
    "Rendah",
    "Cukup Rendah",
    "Sangat Rendah",
  ],
};

/** Label untuk klaster ke-`cluster` (1-indexed, sudah diurutkan tertinggi → terendah) */
export function clusterLabel(cluster: number, k: number): string {
  const scale = SCALES[k];
  if (!scale) return `Klaster ${cluster}`;
  return scale[cluster - 1] ?? `Klaster ${cluster}`;
}

export function labelScale(k: number): string[] {
  return SCALES[k] ?? [];
}

const LABEL_TONE: Record<string, string> = {
  "Sangat Tinggi": "bg-primary text-primary-foreground",
  "Cukup Tinggi": "bg-accent text-accent-foreground",
  Tinggi: "bg-primary/80 text-primary-foreground",
  Sedang: "bg-warning text-warning-foreground",
  "Cukup Rendah": "bg-secondary text-secondary-foreground",
  Rendah: "bg-destructive/80 text-destructive-foreground",
  "Sangat Rendah": "bg-destructive text-destructive-foreground",
};

export function labelClass(label: string): string {
  return LABEL_TONE[label] ?? "bg-muted text-muted-foreground";
}
