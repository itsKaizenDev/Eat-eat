// Data level "Jejak Kunci" (tanpa perilaku). Legenda peta ada di sim.js (buildLevel).
// `par` = jumlah langkah optimal hasil solver BFS; test memverifikasinya dan memutar ulang solusi tiap level.
import { buildLevel } from './sim';

export const RAW_LEVELS = [
  {
    id: 'jk-1', name: 'Kunci dan Pintu', par: 13,
    goal: 'Ambil kunci, lalu masuk ke pintu keluar.',
    map: [
      '#########',
      '#.......#',
      '#E..#..K#',
      '#.......#',
      '#########',
    ],
    snake: [[3, 1], [4, 1]], dir: 'L', exit: { keys: 1, plates: [] },
  },
  {
    id: 'jk-2', name: 'Sakelar Pertama', par: 20,
    goal: 'Injak sakelar A, ambil kunci, lalu keluar. Apel adalah bonus opsional.',
    map: [
      '##########',
      '#........#',
      '#.F....F.#',
      '#.######.#',
      '#a..E...K#',
      '##########',
    ],
    snake: [[5, 1], [6, 1]], dir: 'L', exit: { keys: 1, plates: ['a'] },
  },
  {
    id: 'jk-3', name: 'Dua Sakelar', par: 25,
    goal: 'Aktifkan sakelar A dan B, ambil kunci, lalu keluar. Sakelar tidak perlu ditahan.',
    map: [
      '###########',
      '#.........#',
      '#.F.F.F...#',
      '#.#######.#',
      '#.a.b.E.K.#',
      '###########',
    ],
    snake: [[6, 1], [7, 1]], dir: 'L', exit: { keys: 1, plates: ['a', 'b'] },
  },
  {
    id: 'jk-4', name: 'Portal Berpasangan', par: 6,
    goal: 'Masuk ke satu ujung portal, muncul di ujung pasangannya. Capai pintu keluar.',
    map: [
      '############',
      '#...#..#...#',
      '#...#..#...#',
      '#..1#2.#...#',
      '#...#.1#.2.#',
      '#...#..#..E#',
      '############',
    ],
    snake: [[2, 2], [1, 2]], dir: 'R', exit: { keys: 0, plates: [] },
  },
  {
    id: 'jk-5', name: 'Ekspedisi Kecil', par: 17,
    goal: 'Ambil kunci lewat portal, aktifkan sakelar A, lalu keluar. Apel hanya bonus.',
    map: [
      '#############',
      '#....#......#',
      '#.F..#...K..#',
      '#...1#1.....#',
      '#....#......#',
      '#a.E.#......#',
      '#############',
    ],
    snake: [[2, 3], [1, 3]], dir: 'R', exit: { keys: 1, plates: ['a'] },
  },
];

// Level yang tidak lolos validasi DITOLAK (tidak pernah bisa dimainkan) dan dilaporkan di `rejected`.
export function loadLevels(raw) {
  const levels = [], rejected = [];
  raw.forEach(spec => {
    const r = buildLevel(spec);
    if (r.level) levels.push(r.level); else rejected.push({ id: spec && spec.id, errors: r.errors });
  });
  return { levels, rejected };
}

const loaded = loadLevels(RAW_LEVELS);
export const LEVELS = loaded.levels;
export const REJECTED_LEVELS = loaded.rejected;
