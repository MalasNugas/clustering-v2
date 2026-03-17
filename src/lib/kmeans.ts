// K-Means Clustering Algorithm

export interface DataPoint {
  id: string;
  values: number[];
}

export interface ClusterResult {
  id: string;
  cluster: number;
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] ?? 0), 2), 0));
}

function randomCentroids(data: number[][], k: number): number[][] {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, k);
}

function mean(points: number[][]): number[] {
  if (points.length === 0) return [];
  const dim = points[0].length;
  const result = new Array(dim).fill(0);
  for (const p of points) {
    for (let i = 0; i < dim; i++) result[i] += p[i];
  }
  return result.map((v) => v / points.length);
}

export function kMeans(
  dataPoints: DataPoint[],
  k: number,
  maxIterations = 100
): { results: ClusterResult[]; centroids: number[][]; iterations: number } {
  if (dataPoints.length === 0 || k <= 0) return { results: [], centroids: [], iterations: 0 };

  const data = dataPoints.map((d) => d.values);
  let centroids = randomCentroids(data, k);
  let assignments = new Array(data.length).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    const newAssignments = data.map((point) => {
      let minDist = Infinity;
      let closest = 0;
      centroids.forEach((c, ci) => {
        const dist = euclideanDistance(point, c);
        if (dist < minDist) {
          minDist = dist;
          closest = ci;
        }
      });
      return closest;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;

    // Update centroids
    const newCentroids = Array.from({ length: k }, (_, ci) => {
      const members = data.filter((_, di) => assignments[di] === ci);
      return members.length > 0 ? mean(members) : centroids[ci];
    });
    centroids = newCentroids;

    if (!changed) break;
  }

  const results: ClusterResult[] = dataPoints.map((d, i) => ({
    id: d.id,
    cluster: assignments[i] + 1, // 1-indexed
  }));

  return { results, centroids, iterations };
}
