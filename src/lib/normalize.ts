// Normalisasi Min-Max per kolom (fitur), dihitung dalam satu kelompok data
// rumus: x' = (x - min) / (max - min); jika max == min maka hasilnya 0

export function minMaxNormalize(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const dim = matrix[0].length;
  const mins = new Array(dim).fill(Infinity);
  const maxs = new Array(dim).fill(-Infinity);

  for (const row of matrix) {
    for (let j = 0; j < dim; j++) {
      const v = row[j] ?? 0;
      if (v < mins[j]) mins[j] = v;
      if (v > maxs[j]) maxs[j] = v;
    }
  }

  return matrix.map((row) =>
    row.map((v, j) => {
      const range = maxs[j] - mins[j];
      return range === 0 ? 0 : ((v ?? 0) - mins[j]) / range;
    })
  );
}
