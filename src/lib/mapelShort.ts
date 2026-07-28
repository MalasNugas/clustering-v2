// Singkatan nama mata pelajaran — hanya untuk tampilan.
// Nama asli di database tidak diubah.

const MAP: Record<string, string> = {
  "pendidikan agama islam dan budi pekerti": "PAI",
  "pendidikan agama katholik dan budi pekerti": "PA Katholik",
  "pendidikan agama katolik dan budi pekerti": "PA Katolik",
  "pendidikan agama kristen dan budi pekerti": "PA Kristen",
  "pendidikan jasmani, olahraga, dan kesehatan": "PJOK",
  "pendidikan pancasila": "PP",
  "bahasa indonesia": "B. Indo",
  "bahasa inggris": "B. Ing",
  "kreativitas, inovasi, dan kewirausahaan": "KIK",
  "koding dan kecerdasan artifisial": "Koding & KA",
  "muatan lokal potensi daerah": "Mulok",
  "matematika (umum)": "MTK",
  matematika: "MTK",
  "projek ipas": "IPAS",
  informatika: "Informatika",
  sejarah: "Sejarah",
  koding: "Koding",
  "seni tari": "Seni Tari",
  "desain komunikasi visual": "DKV",
  "desain pemodelan bangunan gedung": "DPBG",
  "teknik komputer dan jaringan": "TKJ",
  "teknik konstruksi dan perumahan": "TKP",
  "teknik energi surya": "TES",
  ppkr: "PPKR",
};

// "Dasar Dasar <X>" -> "Dasar <akronim X>"
const DASAR_RE = /^dasar[\s-]*dasar\s+(.*)$/;

const STOP = new Set(["dan", "atau", "di", "ke", "dari", "yang", "the", "of"]);

function acronym(text: string): string {
  const words = text
    .replace(/[(),.]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()));
  return words.map((w) => w[0].toUpperCase()).join("");
}

export function shortMapel(nama: string): string {
  const raw = (nama ?? "").trim();
  if (!raw) return raw;
  const key = raw.toLowerCase();
  if (MAP[key]) return MAP[key];

  const m = key.match(DASAR_RE);
  if (m) return `Dasar ${acronym(m[1])}`;

  if (raw.length > 18) return acronym(raw);
  return raw;
}
