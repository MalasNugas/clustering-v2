import { describe, it, expect } from "vitest";
import { EXCEL_CLUSTERS, excelClusterMap, normalizeSiswaName } from "@/lib/excelClusters";
import { EXCEL_LABELS, excelLabel } from "@/lib/excelLabels";
import { EXCEL_ELBOW_REFERENCE } from "@/lib/excelReference";

const GROUPS = [
  "KLS 10 DKV",
  "KLS 10 DPIB",
  "KLS 10 TESHA",
  "KLS 10 TJKT",
  "KLS 10 TKP",
  "KLS 10 TKR 1",
  "KLS 10 TKR 2",
  "KLS 11 DKV",
  "KLS 11 DPIB",
  "KLS 11 TESHA",
  "KLS 11 TJKT",
  "KLS 11 TKP",
  "KLS 11 TKR 1",
  "KLS 11 TKR 2",
];

describe("acuan Excel untuk semua jurusan kelas 10 & 11", () => {
  it("14 kelompok tersedia di semua berkas acuan", () => {
    for (const g of GROUPS) {
      expect(EXCEL_CLUSTERS[g], g).toBeDefined();
      expect(EXCEL_LABELS[g], g).toBeDefined();
      expect(EXCEL_ELBOW_REFERENCE[g], g).toBeDefined();
    }
    expect(Object.keys(EXCEL_CLUSTERS).sort()).toEqual([...GROUPS].sort());
  });

  it.each(GROUPS)("%s: klaster & label lengkap untuk K=1..6", (g) => {
    const ref = EXCEL_CLUSTERS[g];
    const n = ref.names.length;
    expect(n).toBeGreaterThan(0);
    expect(new Set(ref.names.map(normalizeSiswaName)).size).toBe(n);

    for (let k = 1; k <= 6; k++) {
      const arr = ref.byK[k];
      expect(arr, `${g} K=${k}`).toHaveLength(n);
      for (const c of arr) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(k);
      }
      const map = excelClusterMap(g, k)!;
      expect(map.size).toBe(n);
      expect(map.get(normalizeSiswaName(ref.names[0]))).toBe(arr[0]);

      expect(EXCEL_LABELS[g][k]).toHaveLength(k);
      for (const c of new Set(arr)) {
        expect(excelLabel(g, k, c), `${g} K=${k} C${c}`).toBeTruthy();
      }
    }
  });

  it.each(GROUPS)("%s: WCSS 6 nilai dan K optimal valid", (g) => {
    const ref = EXCEL_ELBOW_REFERENCE[g];
    expect(ref.wcss).toHaveLength(6);
    expect(ref.optimalK).toBeGreaterThanOrEqual(2);
    expect(ref.optimalK).toBeLessThanOrEqual(6);
    if (ref.initialCentroids) {
      expect(ref.initialCentroids).toHaveLength(ref.optimalK);
    }
  });

  it("ADI PUTRA LODU HAMU DJUA di KLS 10 DKV K=4 masuk klaster 2 (Rendah)", () => {
    const c = excelClusterMap("KLS 10 DKV", 4)!.get("ADI PUTRA LODU HAMU DJUA");
    expect(c).toBe(2);
    expect(excelLabel("KLS 10 DKV", 4, c!)).toBe("Rendah");
  });
});
