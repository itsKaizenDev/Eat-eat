import { COLS } from '../constants';

// Fungsi murni untuk grid: tanpa React, GSAP, atau storage.
export const cellKey = (x, y) => y * COLS + x;
export const sameCell = (a, b) => a.x === b.x && a.y === b.y;
export const isOpposite = (a, b) => a.x === -b.x && a.y === -b.y && (a.x !== 0 || a.y !== 0);
export const inBounds = (p, b) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;

// Pilih sel bebas secara seragam di dalam `b`. Mengembalikan null kalau tidak
// ada sel bebas (papan penuh) — tidak pernah looping tanpa batas.
export function pickFreeCell(b, occupied, rand) {
  const cells = [];
  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      if (!occupied.has(cellKey(x, y))) cells.push({ x, y });
    }
  }
  if (!cells.length) return null;
  return cells[Math.floor(rand() * cells.length)];
};

// Sel yang masih terisi tubuh setelah langkah ini. Kalau ular tidak tumbuh,
// ekor dilepas di langkah yang sama sehingga selnya boleh dimasuki.
export function bodyAfterMove(snake, growing) {
  return growing ? snake : snake.slice(0, -1);
}

// Cari posisi respawn 3 segmen lurus yang aman (plus 2 sel kosong di depan).
// `dirs` urut prioritas, `homeX` = kolom favorit. null kalau tidak ada.
export function findSpawn(b, occupied, dirs, homeX, preferY) {
  const ys = [];
  for (let y = b.minY; y <= b.maxY; y++) ys.push(y);
  ys.sort((p, q) => Math.abs(p - preferY) - Math.abs(q - preferY) || p - q);
  const xs = [];
  for (let x = b.minX; x <= b.maxX; x++) xs.push(x);
  xs.sort((p, q) => Math.abs(p - homeX) - Math.abs(q - homeX) || p - q);
  for (const d of dirs) {
    for (const y of ys) {
      for (const x of xs) {
        const cells = [];
        for (let k = -2; k <= 2; k++) cells.push({ x: x + d.x * k, y: y + d.y * k });
        if (cells.every(c => inBounds(c, b) && !occupied.has(cellKey(c.x, c.y)))) {
          return { snake: [0, 1, 2].map(k => ({ x: x - d.x * k, y: y - d.y * k })), dir: { ...d } };
        }
      }
    }
  }
  return null;
}
