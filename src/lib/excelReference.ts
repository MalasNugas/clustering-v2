export interface ExcelElbowReference {
  wcss: number[];
  optimalK: number;
  initialCentroids?: number[][];
}

// Nilai acuan dari tabel PENGUJIAN METODE pada DATA_10_11_LENGKAP.xlsx.
// WCSS disimpan dengan presisi yang ditampilkan workbook agar tabel dan
// perhitungan persentase di aplikasi identik dengan Excel.
export const EXCEL_ELBOW_REFERENCE: Record<string, ExcelElbowReference> = {
  "KLS 10 DKV": { wcss: [20.1999, 10.4891, 6.8911, 5.3963, 4.9569, 4.4836], optimalK: 4, initialCentroids: [[0.3, 1/6, 0.5, 0.4, 1, 0.2], [0, 1/12, 0.5, 0.1, 0.75, 0.2], [0.1, 0.75, 0.5, 0.2, 1, 0.2], [0.2, 5/6, 0, 0.3, 0.75, 0.2]] },
  "KLS 10 DPIB": { wcss: [9.27996, 7.27965, 5.43369, 5.98918, 4.01151, 4.166884], optimalK: 3, initialCentroids: [[0.25, 2/7, 1/6, 0.5, 1, 9/13], [0.5, 5/7, 1/18, 0.25, 1, 2/13], [0.75, 6/7, 1/9, 0.75, 1, 5/13]] },
  "KLS 10 TESHA": { wcss: [9.55049, 5.68916, 4.85284, 3.45799, 3.08471, 2.79575], optimalK: 3, initialCentroids: [[1, 1, 5/6, 35/36, 0.92, 1], [49/52, 15/19, 0.75, 1, 0.8, 0.5], [31/52, 5/19, 0.75, 23/24, 0.8, 0.5]] },
  "KLS 10 TKR 2": { wcss: [11.32227, 5.921767, 5.172844, 4.335623, 4.19889, 3.86948], optimalK: 3, initialCentroids: [[1, 35/37, 4/7, 0.95, 18/19, 25/27], [1, 27/37, 19/35, 0.85, 1, 20/27], [1, 32/37, 19/35, 0.95, 18/19, 22/27]] },
  "KLS 10 TJKT": { wcss: [10.4774, 7.20533, 6.06587, 4.63695, 4.09107, 4.46371], optimalK: 3, initialCentroids: [[0, 6/13, 3/7, 0, 0.2, 8/11], [1/3, 2/13, 2/7, 0, 0.2, 5/11], [1/3, 10/13, 5/7, 0.4, 0.2, 10/11]] },
  "KLS 10 TKP": { wcss: [8.08114, 4.46762, 4.186254, 3.640831, 2.498339, 2.250348], optimalK: 2, initialCentroids: [[2/7, 0, 1, 0, 0, 12/31], [6/7, 5/9, 0.2, 17/28, 0.5, 20/31]] },
  "KLS 10 TKR 1": { wcss: [12.2282, 7.29189, 5.11344, 5.06086, 6.08201, 2.97696], optimalK: 3, initialCentroids: [[0, 13/36, 0, 0, 1/6, 0], [1, 1, 5/18, 3/7, 1/6, 0.85], [1, 17/18, 2/9, 4/7, 1/6, 0.9]] },
  "KLS 11 DKV": { wcss: [1.69934, 1.047121601, 0.274241091, 0.23034, 0.192756205, 0.088814533], optimalK: 3, initialCentroids: [[0.8, 41/44], [0.4, 41/44], [0.4, 10/11]] },
  "KLS 11 DPIB": { wcss: [4.588477, 2.948906, 1.311858, 0.35168, 0.714286, 0], optimalK: 4, initialCentroids: [[2/3, 0.5], [1/3, 0], [2/3, 0], [1/3, 1]] },
  "KLS 11 TESHA": { wcss: [5.01302, 1.62384, 1.352637, 0.99103, 0.886791939, 0.756366], optimalK: 3, initialCentroids: [[0.5, 7/12], [0, 7/12], [0, 5/6]] },
  "KLS 11 TJKT": { wcss: [4.33488, 1.688151, 1.050475, 0.320175439, 0.94914, 0.8906], optimalK: 4, initialCentroids: [[1, 0.875], [1/6, 0], [0.75, 0], [7/12, 0]] },
  "KLS 11 TKP": { wcss: [3.03847, 0.244684, 0.130125, 0.05248561, 0.022417582, 0.018367], optimalK: 2, initialCentroids: [[17/15, 1], [1.2, 13/14]] },
  "KLS 11 TKR 1": { wcss: [2.9161, 1.8474, 1.2853, 0.400077247, 0.166610463, 0.35757], optimalK: 5, initialCentroids: [[1, 1], [0.5, 22/27], [0, 25/27], [1, 25/27], [0.5, 7/9]] },
  "KLS 11 TKR 2": { wcss: [4.83184, 1.51207, 0.84713, 0.8017, 0.43495, 0.42392], optimalK: 3, initialCentroids: [[5/7, 0.2], [6/7, 0.8], [4/7, 2/3]] },
};

export const normalizeGroupName = (name: string) =>
  name.toUpperCase().replace(/^NEW\s+/, "").replace(/^KLAS\s+/, "KLS ").replace(/\s+/g, " ").trim();