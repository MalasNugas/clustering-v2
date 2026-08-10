import { describe, it, expect } from "vitest";
import { EXCEL_CLUSTERS } from "@/lib/excelClusters";

describe("KLS 10 DKV per jurusan", () => {
  it("K=3 menghasilkan 3 nomor klaster berbeda", () => {
    const arr = EXCEL_CLUSTERS["KLS 10 DKV"].byK[3];
    expect(new Set(arr)).toEqual(new Set([1, 2, 3]));
    expect(arr).toHaveLength(EXCEL_CLUSTERS["KLS 10 DKV"].names.length);
  });
});
