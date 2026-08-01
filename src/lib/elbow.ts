// Elbow Method: menghitung WCSS (Within-Cluster Sum of Squares) untuk K=1..kMax
// dan menentukan K optimal dari persentase penurunan WCSS antar K.

import { DataPoint, kMeans, squaredDistance } from "./kmeans";

export interface ElbowPoint {
  k: number;
  wcss: number;
  /** persentase penurunan WCSS dari K-1 ke K (undefined untuk K=1) */
  penurunan?: number;
}

export interface ElbowResult {
  points: ElbowPoint[];
  transitions: { fromK: number; toK: number; before: number; after: number; penurunan: number }[];
  optimalK: number;
}

export function computeWCSS(data: number[][], assignments: number[], centroids: number[][]): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const c = centroids[assignments[i]];
    if (!c) continue;
    sum += squaredDistance(data[i], c);
  }
  return sum;
}

/** Jalankan K-Means untuk K=1..kMax dan kumpulkan WCSS tiap K */
export function runElbow(
  dataPoints: DataPoint[],
  kMax = 6,
  initialCentroidsByK?: Record<number, number[][]>,
  referenceWcss?: number[],
  referenceOptimalK?: number
): ElbowResult {
  const points: ElbowPoint[] = [];
  const maxK = Math.min(kMax, dataPoints.length);

  for (let k = 1; k <= maxK; k++) {
    const { results, centroids } = kMeans(dataPoints, k, 100, initialCentroidsByK?.[k]);
    const assignments = results.map((r) => r.cluster - 1);
    const calculatedWcss = computeWCSS(
      dataPoints.map((d) => d.values),
      assignments,
      centroids
    );
    const wcss = referenceWcss?.[k - 1] ?? calculatedWcss;
    const prev = points[points.length - 1];
    points.push({
      k,
      wcss,
      penurunan: prev && prev.wcss > 0 ? ((prev.wcss - wcss) / prev.wcss) * 100 : undefined,
    });
  }

  const transitions = points.slice(1).map((point, index) => {
    const before = points[index].wcss;
    const after = point.wcss;
    return {
      fromK: point.k - 1,
      toK: point.k,
      before,
      after,
      penurunan: before === 0 ? 0 : ((before - after) / before) * 100,
    };
  });
  return { points, transitions, optimalK: referenceOptimalK ?? pickOptimalK(points) };
}

/**
 * Titik siku: K terakhir yang penurunannya masih "berarti" (>= 10%),
 * sebelum kurva melandai. Penurunan negatif diabaikan.
 */
export function pickOptimalK(points: ElbowPoint[], threshold = 10): number {
  let best = 1;
  for (const p of points) {
    if (p.k === 1) continue;
    if ((p.penurunan ?? 0) >= threshold) best = p.k;
    else break;
  }
  return Math.max(best, 2);
}
