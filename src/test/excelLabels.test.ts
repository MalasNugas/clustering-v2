import { describe, it, expect } from "vitest";
import { EXCEL_CLUSTERS, excelClusterMap, normalizeSiswaName } from "@/lib/excelClusters";
import { EXCEL_LABELS, excelLabel } from "@/lib/excelLabels";

describe("acuan Excel & penamaan label", () => {
  it("mencakup 14 kelompok kelas untuk K=1..6", () => {
    expect(Object.keys(EXCEL_CLUSTERS)).toHaveLength(14);
    for (const [g, ref] of Object.entries(EXCEL_CLUSTERS)) {
      for (let k = 1; k <= 6; k++) {
        expect(ref.byK[k], `${g} K=${k}`).toHaveLength(ref.names.length);
        expect(EXCEL_LABELS[g]?.[k], `label ${g} K=${k}`).toHaveLength(k);
      }
    }
  });

  it("ADI PUTRA LODU HAMU DJUA masuk Klaster 2 (Rendah) pada KLS 10 DKV K=4", () => {
    const map = excelClusterMap("KLS 10 DKV", 4)!;
    const k = map.get(normalizeSiswaName("Adi Putra Lodu Hamu Djua"));
    expect(k).toBe(2);
    expect(excelLabel("KLS 10 DKV", 4, k!)).toBe("Rendah");
  });

  it("penamaan KLS 10 DKV K=4 sesuai dokumen", () => {
    expect(EXCEL_LABELS["KLS 10 DKV"][4]).toEqual([
      "Sedang",
      "Rendah",
      "Tinggi",
      "Sangat Tinggi",
    ]);
  });
});
