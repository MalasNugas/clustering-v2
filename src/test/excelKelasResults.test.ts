import { describe, it, expect } from "vitest";
import { EXCEL_KELAS_RESULTS, kelasResult, kelasSheetForGroup } from "@/lib/excelKelasResults";
import { EXCEL_CLUSTERS } from "@/lib/excelClusters";

describe("acuan gabungan KELAS 10 (Hasil_Klasterisasi.xlsx)", () => {
  it("KLS 10 DKV memakai sheet KELAS 10", () => {
    expect(kelasSheetForGroup("KLS 10 DKV")).toBe("KELAS 10");
    expect(kelasSheetForGroup("KLS 10 DPIB")).toBeNull();
  });

  it("semua siswa KLS 10 DKV punya acuan klaster, C1..C3, dan Terdekat", () => {
    const names = EXCEL_CLUSTERS["KLS 10 DKV"].names;
    for (const nama of names) {
      const r = kelasResult("KELAS 10", nama);
      expect(r, nama).toBeTruthy();
      expect(r!.cluster).toBeGreaterThanOrEqual(1);
      expect(r!.cluster).toBeLessThanOrEqual(3);
      expect(r!.dists).toHaveLength(3);
      expect(r!.nearest).toBeCloseTo(Math.min(...r!.dists), 4);
    }
  });

  it("nilai acuan siswa contoh sama dengan file Excel", () => {
    const r = kelasResult("KELAS 10", "ADI PUTRA LODU HAMU DJUA")!;
    expect(r.cluster).toBe(1);
    expect(r.dists[0]).toBeCloseTo(3.166785, 5);
    expect(r.dists[1]).toBeCloseTo(39.769846, 5);
    expect(r.dists[2]).toBeCloseTo(13.249872, 5);
    expect(r.nearest).toBeCloseTo(3.166785, 5);
  });

  it("sheet KELAS 10 memuat 208 siswa", () => {
    expect(Object.keys(EXCEL_KELAS_RESULTS["KELAS 10"])).toHaveLength(208);
  });
});
