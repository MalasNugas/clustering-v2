// K-Means Clustering (mengikuti perhitungan manual di Excel)
// - jarak: Euclidean kuadrat (tanpa akar) — hasil pengelompokan identik
// - centroid awal deterministik: siswa dengan rata-rata nilai normalisasi
//   tertinggi / tengah / terendah, sehingga hasil selalu bisa direproduksi

export interface DataPoint {
  id: string;
  values: number[];
}

export interface ClusterResult {
  id: string;
  cluster: number; // 1-indexed
}

export function squaredDistance(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] ?? 0), 2), 0);
}

function mean(points: number[][]): number[] {
  if (points.length === 0) return [];
  const dim = points[0].length;
  const result = new Array(dim).fill(0);
  for (const p of points) for (let i = 0; i < dim; i++) result[i] += p[i] ?? 0;
  return result.map((v) => v / points.length);
}

function pickInitialCentroids(data: number[][], k: number): number[][] {
  const order = data
    .map((row, i) => ({ i, avg: row.reduce((s, v) => s + v, 0) / (row.length || 1) }))
    .sort((a, b) => b.avg - a.avg || a.i - b.i);

  const centroids: number[][] = [];
  const used = new Set<number>();
  for (let c = 0; c < k; c++) {
    // sebar merata: tertinggi, tengah, ..., terendah
    let pos = k === 1 ? 0 : Math.round((c * (order.length - 1)) / (k - 1));
    while (used.has(pos) && pos < order.length - 1) pos++;
    while (used.has(pos) && pos > 0) pos--;
    used.add(pos);
    centroids.push([...data[order[pos].i]]);
  }
  return centroids;
}

export function kMeans(
  dataPoints: DataPoint[],
  k: number,
  maxIterations = 100,
  initialCentroids?: number[][]
): { results: ClusterResult[]; centroids: number[][]; iterations: number } {
  if (dataPoints.length === 0 || k <= 0) return { results: [], centroids: [], iterations: 0 };

  const data = dataPoints.map((d) => d.values);
  const effectiveK = Math.min(k, data.length);
  let centroids = initialCentroids
    ? initialCentroids.map((c) => [...c])
    : pickInitialCentroids(data, effectiveK);

  let assignments = new Array(data.length).fill(-1);
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    const newAssignments = data.map((point) => {
      let minDist = Infinity;
      let closest = 0;
      centroids.forEach((c, ci) => {
        const dist = squaredDistance(point, c);
        if (dist < minDist) {
          minDist = dist;
          closest = ci;
        }
      });
      return closest;
    });

    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;

    centroids = Array.from({ length: effectiveK }, (_, ci) => {
      const members = data.filter((_, di) => assignments[di] === ci);
      return members.length > 0 ? mean(members) : centroids[ci];
    });

    if (!changed) break;
  }

  const results: ClusterResult[] = dataPoints.map((d, i) => ({
    id: d.id,
    cluster: assignments[i] + 1,
  }));

  return { results, centroids, iterations };
}
