import { describe, it, expect } from "vitest";
import { squaredDistance } from "@/lib/kmeans";

// Acuan: DATA_10_11_LENGKAP-2.xlsx, sheet "KLS 10 DKV", bagian K=4 (iterasi terakhir)
const CENTROIDS = [
  [0.29999999999999993, 0.21212121212121218, 0.5, 0.32727272727272727, 0.8181818181818182, 0.09090909090909091],
  [0.1636363636363636, 0.1515151515151515, 0.3909090909090909, 0.21818181818181817, 0.1590909090909091, 0.05454545454545456],
  [0.39999999999999997, 0.7777777777777778, 0.45, 0.3833333333333333, 0.8333333333333334, 0.13333333333333333],
  [0.78, 0.6500000000000001, 0.74, 0.8800000000000001, 0.45, 0.76],
];

const CASES: { nama: string; norm: number[]; dists: number[]; nearest: number; cluster: number }[] = [
  {
    nama: "ADI PUTRA LODU HAMU DJUA",
    norm: [0.2, 1 / 6, 0.5, 0.2, 0.25, 0],
    dists: [0.3593595041322315, 0.02502295684113867, 0.8076234567901236, 1.7076111111111114],
    nearest: 0.02502295684113867,
    cluster: 2,
  },
  {
    nama: "ALVONSHA MANGUTU WANDIR",
    norm: [0.3, 5 / 12, 0.5, 0.4, 1, 0],
    dists: [0.08845041322314046, 0.8439623507805327, 0.18873456790123452, 1.4529444444444448],
    nearest: 0.08845041322314046,
    cluster: 1,
  },
  {
    nama: "APRIANTI K. WANDAL",
    norm: [1, 0.75, 0.5, 1, 0.25, 0],
    dists: [1.5629706152433427, 1.6920684113865934, 1.101604938271605, 0.748],
    nearest: 0.748,
    cluster: 4,
  },
];

describe("KLS 10 DKV — kolom C dan Terdekat (K=4)", () => {
  it.each(CASES)("$nama cocok dengan Excel", ({ norm, dists, nearest, cluster }) => {
    const computed = CENTROIDS.map((c) => squaredDistance(norm, c));
    computed.forEach((v, i) => expect(v).toBeCloseTo(dists[i], 6));
    const min = Math.min(...computed);
    expect(min).toBeCloseTo(nearest, 6);
    expect(computed.indexOf(min) + 1).toBe(cluster);
  });
});
