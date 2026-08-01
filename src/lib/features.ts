// Pemetaan mata pelajaran ke variabel perhitungan, mengikuti file perhitungan manual.
//
// KELAS 10 : KODING, BI (Bahasa Inggris), MTK, INFOR, KEJU (mapel kejuruan)
// KELAS 11 : INFOR, KIK, KEJU (mapel kejuruan)

export type FeatureKey = "KODING" | "BING" | "MTK" | "INFOR" | "KIK" | "KEJURUAN";

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  KODING: "KODING",
  BING: "B. INGGRIS",
  MTK: "MATEMATIKA",
  INFOR: "INFORMATIKA",
  KIK: "KIK",
  KEJURUAN: "KEJURUAN",
};

export const FEATURES_BY_KELAS: Record<"10" | "11", FeatureKey[]> = {
  "10": ["KODING", "BING", "MTK", "INFOR", "KEJURUAN"],
  "11": ["INFOR", "KIK", "KEJURUAN"],
};

/** Mapel umum yang tidak dipakai sebagai variabel klasterisasi */
const GENERAL_PREFIXES = [
  "BAHASA INDONESIA",
  "PENDIDIKAN",
  "SEJARAH",
  "SENI",
  "PROJEK IPAS",
  "MUATAN LOKAL",
  "PROJECT IPAS",
];

const clean = (s: string) => (s ?? "").toUpperCase().replace(/\s+/g, " ").trim();

/** Kelas dari nama kelompok jurusan, contoh "KLS 10 TKR 1" → "10" */
export function kelasOf(jurusanNama: string): "10" | "11" | null {
  const n = clean(jurusanNama);
  if (/\b10\b/.test(n)) return "10";
  if (/\b11\b/.test(n)) return "11";
  return null;
}

export function featureOf(mapelNama: string): FeatureKey | null {
  const n = clean(mapelNama);
  if (n.includes("KODING")) return "KODING";
  if (n.includes("BAHASA INGGRIS")) return "BING";
  if (n.startsWith("MATEMATIKA")) return "MTK";
  if (n.startsWith("INFORMATIKA")) return "INFOR";
  if (n.includes("KREATIVITAS") || n === "KIK") return "KIK";
  if (GENERAL_PREFIXES.some((p) => n.startsWith(p))) return null;
  return "KEJURUAN";
}

/** Isi nilai kosong (null) dengan rata-rata kolom pada kelompoknya */
export function imputeColumnMean(matrix: (number | null)[][]): number[][] {
  if (matrix.length === 0) return [];
  const dim = matrix[0].length;
  const means = new Array(dim).fill(0).map((_, j) => {
    const vals = matrix.map((r) => r[j]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  return matrix.map((row) => row.map((v, j) => (v === null ? means[j] : v)));
}
