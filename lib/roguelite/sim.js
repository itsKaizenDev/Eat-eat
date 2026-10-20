// Simulasi SATU RONDE Ekspedisi Mayhem — MURNI: tanpa React/GSAP/storage/jam/RNG global. Waktu `t` (ms) dan `rng` diberikan pemanggil.
// State dimutasi in-place; hasil langkah berupa daftar event. Aturan nilai/stacking ada di upgrades.js.
//
// URUTAN satu langkah (stepRound):
//   1. efek yang habis (t >= endsAt) dilepas;  2. klasifikasi target: dinding / tubuh (aturan ekor + tumbuh) / ranjau;
//   3. TABRAKAN: ranjau + perisai = ranjau hancur, ular lanjut; dinding/tubuh + perisai = BELOK AMAN (kiri dulu, lalu kanan; hanya ke sel
//      tanpa dinding/tubuh/ranjau); jika tak ada belokan aman, ular DIRELOKASI ke garis lurus bebas (tidak pernah di dalam tembok);
//      tanpa perisai = ronde gagal;  4. gerak (+tumbuh bila makan apel non-racun);  5. efek apel;  6. target tercapai -> `cleared`.
import { COLS, ROWS } from '../constants';
import { pickFreeCell, sameCell, bodyAfterMove } from '../sim/grid';
import { cellKey } from '../sim/grid';
import { appleValue, BASE, effectDuration, rollEffect, EFFECTS, MAX_BOMBS } from './upgrades';

export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
export const DEFAULT_CFG = {
  rounds: 5, targets: [28, 40, 52, 64, 76], baseBombs: [2, 3, 4, 4, 5], foodCount: 5, minBombDist: 4,
  weights: { normal: 62, big: 12, poison: 14, lucky: 12 }, poisonCut: 2, minLen: 2,
};
const BOUNDS = { minX: 0, maxX: COLS - 1, minY: 0, maxY: ROWS - 1 };
const inb = (p) => p.x >= 0 && p.y >= 0 && p.x < COLS && p.y < ROWS;

export function occupied(s) {
  const o = new Set();
  s.snake.forEach(c => o.add(cellKey(c.x, c.y)));
  s.foods.forEach(f => o.add(cellKey(f.x, f.y)));
  s.bombs.forEach(b => o.add(cellKey(b.x, b.y)));
  return o;
}

function rollKind(s) {
  const w = { ...s.cfg.weights, big: s.cfg.weights.big * s.stats.bigWeightMult };
  const total = w.normal + w.big + w.poison + w.lucky;
  let r = s.rng() * total;
  for (const k of ['normal', 'big', 'poison', 'lucky']) { if (r < w[k]) return k; r -= w[k]; }
  return 'normal';
}
function addFood(s) {
  const p = pickFreeCell(BOUNDS, occupied(s), s.rng);
  if (!p) return null; // papan penuh: tidak ada makanan baru (tidak pernah looping tanpa batas)
  const f = { x: p.x, y: p.y, kind: rollKind(s) };
  s.foods.push(f);
  return f;
}

export function createRound({ cfg, stats, round, rng }) {
  const c = { ...DEFAULT_CFG, ...(cfg || {}) };
  const L = stats.startLen;
  const s = {
    cfg: c, stats, rng, round, target: c.targets[round - 1], t: 0,
    snake: Array.from({ length: L }, (_, i) => ({ x: 8 - i, y: 7 })), dir: { ...DIRS.R },
    foods: [], bombs: [], effects: [], roundScore: 0, shield: stats.shield, neutral: stats.neutral, status: 'playing',
  };
  const nb = Math.min(MAX_BOMBS, c.baseBombs[round - 1] + stats.bombExtra);
  for (let i = 0; i < nb; i++) {
    const occ = occupied(s), head = s.snake[0], cand = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (occ.has(cellKey(x, y)) || Math.abs(x - head.x) + Math.abs(y - head.y) < c.minBombDist) continue;
      // jangan menutup lajur lurus depan kepala di awal ronde
      if (y === head.y && x > head.x) continue;
      cand.push({ x, y });
    }
    if (!cand.length) break;
    s.bombs.push(cand[Math.floor(rng() * cand.length)]);
  }
  for (let i = 0; i < c.foodCount; i++) addFood(s);
  return s;
}

export function expireEffects(s, t) {
  s.t = t;
  const before = s.effects.length;
  s.effects = s.effects.filter(e => t < e.endsAt);
  return before - s.effects.length;
}
export const isReversed = (s) => s.effects.some(e => e.type === 'reverse');

// Klasifikasi sel target. growingProbe: apakah target berisi makanan non-racun (menentukan nasib ekor).
function classify(s, target) {
  if (!inb(target)) return 'wall';
  const fi = s.foods.findIndex(f => sameCell(f, target));
  const growing = fi !== -1 && s.foods[fi].kind !== 'poison';
  if (bodyAfterMove(s.snake, growing).some(p => sameCell(p, target))) return 'body';
  if (s.bombs.some(b => sameCell(b, target))) return 'bomb';
  return null;
}

// Relokasi darurat: garis lurus horizontal sepanjang ular, bebas dari ranjau/makanan/dinding. null bila tidak ada.
function relocate(s) {
  const L = s.snake.length, taken = new Set();
  s.bombs.forEach(b => taken.add(cellKey(b.x, b.y))); s.foods.forEach(f => taken.add(cellKey(f.x, f.y)));
  const ys = []; for (let y = 0; y < ROWS; y++) ys.push(y);
  ys.sort((a, b) => Math.abs(a - 7) - Math.abs(b - 7) || a - b);
  for (const y of ys) for (let x = L; x < COLS - 1; x++) { // kepala di x, ekor di x-L+1; sel depan (x+1) harus bebas
    const cells = []; for (let k = -1; k < L; k++) cells.push({ x: x - k, y });
    if (cells.every(c => inb(c) && !taken.has(cellKey(c.x, c.y)))) return { snake: cells.slice(1).map(c => ({ ...c })), dir: { ...DIRS.R } };
  }
  return null;
}

// Lanjutkan rute yang sama: skor, upgrade, makanan, dan ranjau dipertahankan.
export function reviveRound(s, t) {
  if (s.status !== 'dead') return false;
  const place = relocate({ ...s, snake: Array(s.stats.startLen).fill(null) });
  if (!place) return false;
  s.snake = place.snake; s.dir = place.dir; s.status = 'playing';
  s.effects = []; s.reviveUntil = t + 3000;
  return true;
}

export function stepRound(s, dirKey, t) {
  const ev = [];
  if (s.status !== 'playing') return ev;
  expireEffects(s, t);
  let d = DIRS[dirKey] || s.dir;
  let target = { x: s.snake[0].x + d.x, y: s.snake[0].y + d.y };
  let hit = classify(s, target);
  if (hit) {
    if (s.shield > 0 || t < (s.reviveUntil || 0)) {
      if (t >= (s.reviveUntil || 0)) s.shield--;
      if (hit === 'bomb') {
        s.bombs = s.bombs.filter(b => !sameCell(b, target));
        ev.push({ type: 'shield', cause: 'bomb', action: 'destroyed' });
      } else {
        const turns = [{ x: d.y, y: -d.x }, { x: -d.y, y: d.x }]; // kiri lalu kanan relatif arah gerak
        let alt = null;
        for (const dd of turns) { const tg = { x: s.snake[0].x + dd.x, y: s.snake[0].y + dd.y }; if (!classify(s, tg)) { alt = { dd, tg }; break; } }
        if (alt) { d = alt.dd; target = alt.tg; ev.push({ type: 'shield', cause: hit, action: 'turn' }); }
        else {
          const r = relocate(s);
          if (!r) { s.status = 'dead'; ev.push({ type: 'crash', cause: hit }); return ev; }
          s.snake = r.snake; s.dir = r.dir;
          ev.push({ type: 'shield', cause: hit, action: 'relocate' });
          return ev; // relokasi menggantikan langkah ini
        }
      }
    } else { s.status = 'dead'; ev.push({ type: 'crash', cause: hit }); return ev; }
  }
  s.dir = { ...d };
  const fi = s.foods.findIndex(f => sameCell(f, target));
  const food = fi !== -1 ? s.foods[fi] : null;
  const growing = !!food && food.kind !== 'poison';
  s.snake.unshift(target);
  if (!growing) s.snake.pop();
  if (food) {
    s.foods.splice(fi, 1);
    if (food.kind === 'poison') {
      if (s.neutral > 0) { s.neutral--; ev.push({ type: 'neutralized' }); }
      else {
        s.roundScore = Math.max(0, s.roundScore + BASE.poison);
        let cut = 0; while (cut < s.cfg.poisonCut && s.snake.length > s.cfg.minLen) { s.snake.pop(); cut++; }
        ev.push({ type: 'poison', cut });
      }
    } else {
      const v = appleValue(food.kind, s.stats, s.effects);
      s.roundScore += v;
      ev.push({ type: 'eat', kind: food.kind, points: v });
      if (food.kind === 'lucky') {
        const type = rollEffect(s.stats, s.rng);
        s.effects = s.effects.filter(e => e.type !== type);
        s.effects.push({ type, endsAt: t + effectDuration(type, s.stats) });
        ev.push({ type: 'effect', effect: type, good: EFFECTS[type].good });
      }
    }
    addFood(s);
  }
  if (s.roundScore >= s.target) { s.status = 'cleared'; ev.push({ type: 'cleared' }); }
  return ev;
}
