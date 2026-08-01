import { describe, expect, it } from "vitest";
import { runElbow } from "@/lib/elbow";
import { EXCEL_ELBOW_REFERENCE } from "@/lib/excelReference";

describe("Excel elbow reference", () => {
  it("matches KLS 10 DKV WCSS, decreases, and optimal K", () => {
    const reference = EXCEL_ELBOW_REFERENCE["KLS 10 DKV"];
    const result = runElbow(
      [{ id: "sample", values: [0, 0, 0, 0, 0, 0] }],
      6,
      undefined,
      reference.wcss,
      reference.optimalK
    );

    expect(result.points.map((point) => point.wcss)).toEqual(reference.wcss.slice(0, 1));

    const complete = runElbow(
      Array.from({ length: 6 }, (_, index) => ({ id: String(index), values: [index] })),
      6,
      undefined,
      reference.wcss,
      reference.optimalK
    );
    expect(complete.points.map((point) => point.wcss)).toEqual(reference.wcss);
    expect(complete.transitions[2].penurunan).toBeCloseTo(21.691747326261407, 10);
    expect(complete.optimalK).toBe(4);
  });

  it("contains all 14 independent class and major groups", () => {
    expect(Object.keys(EXCEL_ELBOW_REFERENCE)).toHaveLength(14);
  });
});