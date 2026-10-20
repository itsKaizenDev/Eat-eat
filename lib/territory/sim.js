// Simulasi Snake Territory "Rebut Arena" — MURNI: tanpa React, GSAP, storage, jam, atau RNG global.
// Dua pemain berbagi satu tick. State dimutasi in-place; hasil dilaporkan lewat daftar event.
//
// MODEL
//  - Grid kepemilikan `own` (0 netral, 1 = P1, 2 = P2) dan peta jejak `trail` (0 / id pemilik). Dinding bukan wilayah dan tidak dihitung.
//  - Kepala di luar wilayah sendiri SELALU berada di sel jejaknya sendiri (invarian). Di dalam wilayah sendiri tidak ada jejak.
//  - Penyebut persentase = sel tanpa dinding (`ownable`). Persentase = sel milik / ownable; jumlah dua pemain tidak pernah > 100%.
//
// URUTAN SATU TICK (semua keputusan dari SNAPSHOT awal tick, tidak bergantung urutan P1/P2):
//   1. arah baru (berbalik arah diabaikan);  2. niat posisi kepala;
//   3. kematian: tembok/luar papan, jejak sendiri, kepala lawan menimpa jejak (pemilik jejak yang kalah), head-on, tukar kepala;
//   4. penutupan jalur (kepala masuk wilayah sendiri dengan jejak tidak kosong) — pemain yang mati TIDAK mengklaim (kematian mengalahkan klaim);
//   5. klaim dihitung dari snapshot (flood fill), sel sengketa (diklaim keduanya) mempertahankan pemilik sebelumnya;
//   6. commit: jejak yang mati dihapus, kepala bergerak, klaim diterapkan, jejak penutup dihapus;
//   7. respawn (setelah klaim, dari wilayah terkini);  8. hasil: nyawa habis > target wilayah > (waktu habis lewat finishMatch).
// Jejak lawan yang TERKURUNG dalam area klaim tidak diklaim dan tidak dipotong (hanya kepala yang memutus jejak).
// Sel tepi papan yang terhubung ke luar lewat sel bebas dianggap "luar": area yang hanya berbatas papan tidak diklaim.
import { isOpposite } from '../sim/grid';

export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
export const DEFAULT_CONFIG = { matchMs: 90000, targetPct: 60, lives: 3 };

export const ARENA_MAP = [
  '........................',
  '........................',
  '........................',
  '........................',
  '.......##......##.......',
  '........................',
  '........................',
  '........................',
  '........................',
  '...........##...........',
  '...........##...........',
  '...........##...........',
  '........................',
  '........................',
  '........................',
  '........................',
  '.......##......##.......',
  '........................',
  '........................',
  '........................',
  '........................',
];
export const START = { p1: { x: 3, y: 10, dir: 'R' }, p2: { x: 20, y: 10, dir: 'L' } };

// ---------- arena ----------
export function parseArena(map, start) {
  const h = map.length, w = map[0].length;
  const arena = { w, h, wall: new Uint8Array(w * h), start: { p1: { ...start.p1 }, p2: { ...start.p2 } }, ownable: 0, errors: [] };
  map.forEach((row, y) => {
    if (row.length !== w) arena.errors.push(`baris ${y} panjang ${row.length}, seharusnya ${w}`);
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') arena.wall[y * w + x] = 1;
      else if (row[x] !== '.') arena.errors.push(`karakter tidak dikenal '${row[x]}' di (${x},${y})`);
    }
  });
  arena.ownable = arena.wall.reduce((n, v) => n + (v ? 0 : 1), 0);
  ['p1', 'p2'].forEach(k => {
    const s = arena.start[k];
    if (!DIRS[s.dir]) arena.errors.push(`arah awal ${k} tidak valid`);
    // basis 3x3 harus utuh di dalam papan dan bebas dinding
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = s.x + dx, y = s.y + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) arena.errors.push(`basis ${k} keluar papan`);
      else if (arena.wall[y * w + x]) arena.errors.push(`basis ${k} menimpa dinding`);
    }
  });
  if (Math.abs(arena.start.p1.x - arena.start.p2.x) + Math.abs(arena.start.p1.y - arena.start.p2.y) < 6) arena.errors.push('basis P1 dan P2 terlalu dekat');
  if (!arena.errors.length) { // semua sel non-dinding harus terhubung (tidak ada kantong yang mustahil dicapai)
    const seen = new Uint8Array(w * h); let first = arena.wall.indexOf(0); const q = [first]; seen[first] = 1;
    for (let i = 0; i < q.length; i++) { const c = q[i], cx = c % w, cy = (c - cx) / w; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) return; const ni = ny * w + nx; if (!seen[ni] && !arena.wall[ni]) { seen[ni] = 1; q.push(ni); } }); }
    if (q.length !== arena.ownable) arena.errors.push('ada sel yang terpisah oleh dinding');
  }
  return arena;
}

const idx = (s, x, y) => y * s.arena.w + x;
const inGrid = (s, x, y) => x >= 0 && y >= 0 && x < s.arena.w && y < s.arena.h;
const isWall = (s, x, y) => s.arena.wall[y * s.arena.w + x] === 1;
const same = (a, b) => a.x === b.x && a.y === b.y;

export const targetCount = (s) => Math.ceil((s.config.targetPct / 100) * s.arena.ownable);
export const percent = (s, i) => (s.counts[i] / s.arena.ownable) * 100;

function recount(s) {
  const c = [0, 0, 0];
  for (let i = 0; i < s.own.length; i++) c[s.own[i]]++;
  s.counts = [c[1], c[2]];
}

function giveBase(s, i, cx, cy) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s.own[idx(s, cx + dx, cy + dy)] = i + 1;
}

export function createState({ arena, config, t }) {
  if (arena.errors.length) throw new Error('arena tidak valid: ' + arena.errors.join('; '));
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  const s = {
    arena, config: cfg, t: t || 0, own: new Uint8Array(arena.w * arena.h), trail: new Uint8Array(arena.w * arena.h),
    players: [], counts: [0, 0], status: 'playing', result: null,
  };
  ['p1', 'p2'].forEach((k, i) => {
    const st = arena.start[k];
    giveBase(s, i, st.x, st.y);
    s.players.push({ id: i + 1, head: { x: st.x, y: st.y }, dir: { ...DIRS[st.dir] }, trail: [], lives: cfg.lives });
  });
  recount(s);
  return s;
}

// Sel yang tertutup oleh wilayah + jejak pemain i (flood fill dari tepi papan lewat sel bebas). Mengembalikan daftar indeks sel yang diklaim.
function claimCells(s, i, aliveTrail) {
  const { w, h } = s.arena, id = i + 1, other = 2 - i;
  const n = w * h, outside = new Uint8Array(n);
  const barrier = (c) => s.own[c] === id || s.trail[c] === id || s.arena.wall[c] === 1;
  const stack = [];
  const seed = (x, y) => { const c = y * w + x; if (!outside[c] && !barrier(c)) { outside[c] = 1; stack.push(c); } };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (stack.length) {
    const c = stack.pop(), cx = c % w, cy = (c - cx) / w;
    if (cx > 0) seed(cx - 1, cy); if (cx < w - 1) seed(cx + 1, cy); if (cy > 0) seed(cx, cy - 1); if (cy < h - 1) seed(cx, cy + 1);
  }
  const out = [];
  for (let c = 0; c < n; c++) {
    if (s.trail[c] === id) { out.push(c); continue; }
    if (barrier(c) || outside[c]) continue;
    if (s.trail[c] === other && aliveTrail[1 - i]) continue; // jejak lawan yang masih hidup tidak diklaim
    out.push(c);
  }
  return out;
}

function findRespawn(s, i) {
  const { w, h } = s.arena, id = i + 1, me = s.players[i], opp = s.players[1 - i];
  const home = s.arena.start[i ? 'p2' : 'p1'];
  const dist = (x, y) => Math.abs(x - home.x) + Math.abs(y - home.y);
  const nearOpp = (x, y) => Math.abs(x - opp.head.x) + Math.abs(y - opp.head.y) < 2;
  const okCell = (x, y) => inGrid(s, x, y) && !isWall(s, x, y) && !nearOpp(x, y) && s.trail[idx(s, x, y)] !== opp.id;
  const pickDir = (x, y) => {
    const dx = (w - 1) / 2 - x, dy = (h - 1) / 2 - y;
    const pref = Math.abs(dx) >= Math.abs(dy) ? [{ x: Math.sign(dx) || 1, y: 0 }, { x: 0, y: Math.sign(dy) || 1 }] : [{ x: 0, y: Math.sign(dy) || 1 }, { x: Math.sign(dx) || 1, y: 0 }];
    const all = [...pref, { x: -pref[0].x, y: -pref[0].y }, { x: -pref[1].x, y: -pref[1].y }];
    return all.find(d => { const nx = x + d.x, ny = y + d.y; return inGrid(s, nx, ny) && !isWall(s, nx, ny) && !same({ x: nx, y: ny }, opp.head); }) || null;
  };
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (s.own[y * w + x] === id && okCell(x, y)) cells.push({ x, y });
  cells.sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y) || a.y - b.y || a.x - b.x);
  for (const c of cells) { const d = pickDir(c.x, c.y); if (d) return { head: c, dir: d, base: false }; }
  // Wilayah habis: base darurat 3x3 terdekat dari titik awal (boleh mengambil sel lawan, tidak menyentuh jejak/kepala lawan); lalu 1x1.
  const blocks = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) ok = okCell(x + dx, y + dy);
    if (ok) blocks.push({ x, y });
  }
  blocks.sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y) || a.y - b.y || a.x - b.x);
  for (const c of blocks) { const d = pickDir(c.x, c.y); if (d) { giveBase(s, i, c.x, c.y); return { head: c, dir: d, base: true }; } }
  const singles = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (okCell(x, y)) singles.push({ x, y });
  singles.sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y) || a.y - b.y || a.x - b.x);
  for (const c of singles) { const d = pickDir(c.x, c.y); if (d) { s.own[idx(s, c.x, c.y)] = id; return { head: c, dir: d, base: true }; } }
  return null; // praktis mustahil pada arena ini
}

function clearTrail(s, p) { p.trail.forEach(c => { s.trail[c] = 0; }); p.trail = []; }

// dirs: [dirP1, dirP2] (objek {x,y} atau null). Mengembalikan event: death, claim, respawn, end.
export function stepSim(s, dirs, t) {
  const ev = [];
  if (s.status !== 'playing') return ev;
  s.t = t;
  const P = s.players;
  P.forEach((p, i) => { const d = dirs && dirs[i]; if (d && !isOpposite(p.dir, d) && (d.x || d.y)) p.dir = { x: d.x, y: d.y }; });
  const np = P.map(p => ({ x: p.head.x + p.dir.x, y: p.head.y + p.dir.y }));

  const dead = [null, null];
  const mark = (i, cause) => { if (!dead[i]) dead[i] = cause; };
  P.forEach((p, i) => {
    const n = np[i];
    if (!inGrid(s, n.x, n.y) || isWall(s, n.x, n.y)) { mark(i, 'wall'); return; }
    const tr = s.trail[idx(s, n.x, n.y)];
    if (tr === p.id) mark(i, 'self');
    else if (tr === P[1 - i].id) mark(1 - i, 'cut');
  });
  if (same(np[0], np[1])) { mark(0, 'headon'); mark(1, 'headon'); }
  else if (same(np[0], P[1].head) && same(np[1], P[0].head)) { mark(0, 'swap'); mark(1, 'swap'); }

  // klaim dari snapshot
  const closing = P.map((p, i) => !dead[i] && p.trail.length > 0 && inGrid(s, np[i].x, np[i].y) && s.own[idx(s, np[i].x, np[i].y)] === p.id);
  const aliveTrail = P.map((p, i) => !dead[i] && p.trail.length > 0);
  const claims = closing.map((c, i) => (c ? claimCells(s, i, aliveTrail) : []));
  const claimed = new Map(); // sel -> jumlah pengklaim
  claims.forEach(list => list.forEach(c => claimed.set(c, (claimed.get(c) || 0) + 1)));

  // commit
  P.forEach((p, i) => { if (dead[i]) clearTrail(s, p); });
  P.forEach((p, i) => {
    if (dead[i]) return;
    p.head = { x: np[i].x, y: np[i].y };
    const c = idx(s, p.head.x, p.head.y);
    if (s.own[c] !== p.id) { p.trail.push(c); s.trail[c] = p.id; }
  });
  const gained = [[], []];
  claims.forEach((list, i) => list.forEach(c => { if (claimed.get(c) === 1) { s.own[c] = i + 1; gained[i].push(c); } }));
  P.forEach((p, i) => { if (closing[i]) clearTrail(s, p); });
  P.forEach((p, i) => { // invarian: kepala di luar wilayah sendiri harus berada di jejak sendiri
    if (dead[i]) return;
    const c = idx(s, p.head.x, p.head.y);
    if (s.own[c] !== p.id && s.trail[c] !== p.id) { p.trail.push(c); s.trail[c] = p.id; }
  });
  gained.forEach((g, i) => { if (closing[i]) ev.push({ type: 'claim', player: i, cells: g.length, list: g }); });

  // respawn / nyawa
  P.forEach((p, i) => {
    if (!dead[i]) return;
    p.lives -= 1;
    ev.push({ type: 'death', player: i, cause: dead[i], lives: p.lives });
  });
  P.forEach((p, i) => {
    if (!dead[i] || p.lives <= 0) return;
    const r = findRespawn(s, i);
    if (!r) { p.lives = 0; return; }
    p.head = r.head; p.dir = r.dir;
    ev.push({ type: 'respawn', player: i, base: r.base });
  });
  recount(s);

  // hasil
  const out = P.map(p => p.lives <= 0);
  if (out[0] && out[1]) end(s, ev, 0, 'nyawa');
  else if (out[0]) end(s, ev, 2, 'nyawa');
  else if (out[1]) end(s, ev, 1, 'nyawa');
  else {
    const need = targetCount(s);
    if (s.counts[0] >= need) end(s, ev, 1, 'wilayah');
    else if (s.counts[1] >= need) end(s, ev, 2, 'wilayah');
  }
  return ev;
}

function end(s, ev, winner, reason) {
  if (s.status !== 'playing') return;
  s.status = winner ? 'won' : 'draw';
  s.result = { winner, reason };
  ev.push({ type: 'end', winner, reason });
}

// Dipanggil pemanggil saat waktu habis (setelah langkah yang jatuh tepat di akhir diproses). Idempoten.
export function finishMatch(s) {
  const ev = [];
  if (s.status !== 'playing') return ev;
  recount(s);
  end(s, ev, s.counts[0] > s.counts[1] ? 1 : s.counts[1] > s.counts[0] ? 2 : 0, 'waktu');
  return ev;
}
