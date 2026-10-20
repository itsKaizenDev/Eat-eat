// Simulasi Snake Delivery "Kurir Apel" — MURNI: tanpa React, GSAP, storage, jam, atau RNG global.
// Waktu (`t`, ms simulasi) dan RNG diberikan pemanggil. State bersifat mutable (dimutasi in-place, dikembalikan lewat daftar event).
//
// MODEL
//  - Tubuh = tubuh dasar (`baseLen`, tetap) + segmen kargo (satu per paket yang dibawa), dicatat TERPISAH.
//    Invarian: snake.length === baseLen + cargo.length. Mengantar/membuang kargo memendekkan EKOR; kepala/tubuh dasar tidak pernah terpotong.
//  - Tujuan (site) A/B/C tetap di arena. Pesanan (maks `maxOrders`) = satu paket bertipe T yang menunggu di titik pickup,
//    diantar ke site T. Kapasitas kargo = `capacity`.
//  - Site menerima paket TERTUA yang cocok, SATU per kali kepala MASUK ke sel site (harus keluar-masuk lagi untuk kiriman berikutnya).
//  - Umur paket dihitung saat diambil: jarak rute statis terpendek (BFS) pickup -> site * interval gerak * margin + grace.
//    Paket yang melewati deadline menjadi BASI: kargo dibuang (ekor dipendekkan), skor berkurang (min 0), slot pesanan kosong.
//
// URUTAN EVENT pada satu langkah di waktu `t`:
//   1. paket yang deadline-nya < t menjadi basi (deadline == t MASIH sah: pengantaran pada t yang sama menang atas basi);
//   2. gerak kepala; tabrak tembok/rintangan/tubuh = kalah;
//   3. pickup (tumbuh +1 bila kapasitas cukup);
//   4. pengantaran (paling banyak satu paket);
//   5. pesanan baru diisi bila slot kosong dan jeda sudah lewat.
// Akhir shift: langkah/pengantaran yang jatuh tepat pada `shiftMs` diproses SEBELUM hasil dievaluasi (dilakukan pemanggil).
//
// BATASAN reachability: titik pickup dipilih dari sel yang secara STATIS dapat dicapai dari posisi awal (BFS tanpa tubuh).
// Itu bukan jaminan terhadap tubuh yang bergerak: ular panjang bisa saja menutup jalur menuju pickup/site untuk sementara.
import { sameCell, bodyAfterMove } from '../sim/grid';

export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
export const TYPES = { A: { label: 'Apel' }, B: { label: 'Surat' }, C: { label: 'Kotak' } };
export const TYPE_IDS = ['A', 'B', 'C'];

// Parameter awal (dapat diubah): maksimum pesanan aktif 2, kapasitas kargo 3, shift 120 dtk, target 5 pengantaran.
export const DEFAULT_CONFIG = {
  shiftMs: 120000, target: 5, maxOrders: 2, capacity: 3,
  margin: 2.2, graceMs: 5000, spawnDelayMs: 800, minPickupDist: 4,
  points: 10, quickBonus: 5, stalePenalty: 5,
};

export const ARENA_MAP = [
  '.................',
  '.................',
  '..A...........B..',
  '.................',
  '....##.....##....',
  '....#.......#....',
  '.................',
  '.................',
  '.................',
  '....#.......#....',
  '....##.....##....',
  '.................',
  '.................',
  '........C........',
  '.................',
];
export const START = { snake: [[8, 7], [7, 7], [6, 7]], dir: 'R' };

// ---------- arena ----------
export function parseArena(map, start) {
  const h = map.length, w = map[0].length;
  const arena = { w, h, obstacle: new Uint8Array(w * h), sites: {}, start: { snake: start.snake.map(([x, y]) => ({ x, y })), dir: start.dir }, errors: [] };
  map.forEach((row, y) => {
    if (row.length !== w) arena.errors.push(`baris ${y} panjang ${row.length}, seharusnya ${w}`);
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#') arena.obstacle[y * w + x] = 1;
      else if (TYPE_IDS.includes(c)) { if (arena.sites[c]) arena.errors.push(`site ${c} muncul lebih dari sekali`); else arena.sites[c] = { x, y }; }
      else if (c !== '.') arena.errors.push(`karakter tidak dikenal '${c}' di (${x},${y})`);
    }
  });
  TYPE_IDS.forEach(t => { if (!arena.sites[t]) arena.errors.push(`site ${t} tidak ada`); });
  const inb = (p) => p.x >= 0 && p.y >= 0 && p.x < w && p.y < h;
  arena.start.snake.forEach((p, i) => {
    if (!inb(p)) arena.errors.push(`segmen awal ${i} di luar arena`);
    else if (arena.obstacle[p.y * w + p.x]) arena.errors.push(`segmen awal ${i} di atas rintangan`);
    if (i > 0 && Math.abs(p.x - arena.start.snake[i - 1].x) + Math.abs(p.y - arena.start.snake[i - 1].y) !== 1) arena.errors.push(`segmen awal ${i} tidak bersebelahan`);
  });
  const d = DIRS[start.dir];
  if (!d) arena.errors.push('arah awal tidak valid');
  else if (arena.start.snake.length >= 2 && (arena.start.snake[0].x - arena.start.snake[1].x !== d.x || arena.start.snake[0].y - arena.start.snake[1].y !== d.y)) arena.errors.push('arah awal tidak sesuai kepala-leher');
  if (!arena.errors.length) {
    const reach = bfs(arena, arena.start.snake[0]);
    TYPE_IDS.forEach(t => { const s = arena.sites[t]; if (reach[s.y * w + s.x] < 0) arena.errors.push(`site ${t} tidak terjangkau dari posisi awal`); });
  }
  return arena;
}

// Jarak langkah statis (4 arah, tanpa tubuh) dari `from` ke semua sel; -1 = tidak terjangkau.
export function bfs(arena, from) {
  const { w, h, obstacle } = arena;
  const dist = new Int16Array(w * h).fill(-1);
  const q = [from.y * w + from.x];
  dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const cur = q[i], cx = cur % w, cy = (cur - cx) / w;
    for (const k of ['U', 'D', 'L', 'R']) {
      const nx = cx + DIRS[k].x, ny = cy + DIRS[k].y;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (obstacle[ni] || dist[ni] !== -1) continue;
      dist[ni] = dist[cur] + 1; q.push(ni);
    }
  }
  return dist;
}
export const routeDistance = (arena, a, b) => bfs(arena, a)[b.y * arena.w + b.x];

// ---------- state ----------
export function createState({ arena, config, rng, interval, t }) {
  if (arena.errors.length) throw new Error('arena tidak valid: ' + arena.errors.join('; '));
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  const start = t || 0;
  const state = {
    arena, cfg, rng, interval, t: start,
    snake: arena.start.snake.map(p => ({ ...p })), dir: { ...DIRS[arena.start.dir] }, baseLen: arena.start.snake.length,
    cargo: [], orders: [], delivered: 0, stale: 0, score: 0, nextId: 1, nextSpawnAt: start,
    status: 'playing', reason: null,
    siteDist: Object.fromEntries(TYPE_IDS.map(k => [k, bfs(arena, arena.sites[k])])),
    reach: bfs(arena, arena.start.snake[0]),
  };
  spawnOrders(state, start, []);
  return state;
}

const idx = (s, p) => p.y * s.arena.w + p.x;
export const pickups = (s) => s.orders.filter(o => !o.picked);
export const siteAt = (s, p) => TYPE_IDS.find(k => sameCell(s.arena.sites[k], p)) || null;
export const lifeLeft = (c, t) => Math.max(0, c.deadline - t);

function shrinkTail(s) { while (s.snake.length > s.baseLen + s.cargo.length) s.snake.pop(); }

function makeOrder(s, t) {
  const { arena, cfg } = s;
  const head = s.snake[0];
  const taken = new Set(s.snake.map(p => idx(s, p)));
  s.orders.forEach(o => { if (!o.picked) taken.add(idx(s, o.pickup)); });
  TYPE_IDS.forEach(k => taken.add(idx(s, arena.sites[k])));
  const cand = [];
  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) {
    const i = y * arena.w + x;
    if (arena.obstacle[i] || s.reach[i] < 0 || taken.has(i)) continue;
    if (Math.abs(x - head.x) + Math.abs(y - head.y) < cfg.minPickupDist) continue;
    cand.push({ x, y });
  }
  if (!cand.length) return null; // tidak ada sel yang valid: coba lagi nanti (tidak pernah looping tanpa batas)
  const type = TYPE_IDS[Math.floor(s.rng() * TYPE_IDS.length)];
  const cell = cand[Math.floor(s.rng() * cand.length)];
  return { id: s.nextId++, type, pickup: cell, picked: false, createdAt: t };
}

function spawnOrders(s, t, ev) {
  while (s.orders.length < s.cfg.maxOrders && t >= s.nextSpawnAt) {
    const o = makeOrder(s, t);
    if (!o) break;
    s.orders.push(o); ev.push({ type: 'orderSpawn', order: o });
  }
}

function freeSlot(s, t) { s.nextSpawnAt = Math.max(s.nextSpawnAt, t + s.cfg.spawnDelayMs); }

// Paket yang deadline-nya LEWAT (< t) menjadi basi. deadline == t masih sah.
export function expireStale(s, t, ev) {
  for (let i = s.cargo.length - 1; i >= 0; i--) {
    const c = s.cargo[i];
    if (t <= c.deadline) continue;
    s.cargo.splice(i, 1);
    s.orders = s.orders.filter(o => o.id !== c.id);
    shrinkTail(s);
    s.score = Math.max(0, s.score - s.cfg.stalePenalty);
    s.stale++;
    freeSlot(s, t);
    ev.push({ type: 'stale', cargo: c });
  }
}

// Waktu berjalan tanpa gerakan (antar-langkah): paket basi + pengisian pesanan.
export function advanceTime(s, t, ev) {
  if (s.status !== 'playing') return;
  s.t = t;
  expireStale(s, t, ev);
  spawnOrders(s, t, ev);
}

export function stepSim(s, dirKey, t) {
  const ev = [];
  if (s.status !== 'playing') return ev;
  s.t = t;
  expireStale(s, t, ev);
  const d = DIRS[dirKey] || s.dir;
  s.dir = { ...d };
  const head = s.snake[0], target = { x: head.x + d.x, y: head.y + d.y };
  const { arena, cfg } = s;
  if (target.x < 0 || target.y < 0 || target.x >= arena.w || target.y >= arena.h || arena.obstacle[idx(s, target)]) {
    s.status = 'lost'; s.reason = 'crash'; ev.push({ type: 'crash', cause: 'wall' }); return ev;
  }
  const order = s.orders.find(o => !o.picked && sameCell(o.pickup, target));
  let growing = false;
  if (order) { if (s.cargo.length < cfg.capacity) growing = true; else ev.push({ type: 'pickupBlocked', order }); }
  if (bodyAfterMove(s.snake, growing).some(p => sameCell(p, target))) {
    s.status = 'lost'; s.reason = 'crash'; ev.push({ type: 'crash', cause: 'body' }); return ev;
  }
  s.snake.unshift(target);
  if (!growing) s.snake.pop();
  if (growing) {
    order.picked = true;
    const lifeMs = Math.round(s.siteDist[order.type][idx(s, target)] * s.interval * cfg.margin + cfg.graceMs);
    const pkg = { id: order.id, type: order.type, pickedAt: t, lifeMs, deadline: t + lifeMs };
    s.cargo.push(pkg);
    ev.push({ type: 'pickup', cargo: pkg });
  }
  const site = siteAt(s, target);
  if (site) {
    // Semua paket tujuan ini diantar bersamaan; bonus tetap dihitung per paket.
    const matching = s.cargo.filter(c => c.type === site);
    for (const c of matching) {
      const quick = lifeLeft(c, t) >= c.lifeMs * 0.5;
      s.cargo = s.cargo.filter(pkg => pkg.id !== c.id);
      s.orders = s.orders.filter(o => o.id !== c.id);
      shrinkTail(s);
      const pts = cfg.points + (quick ? cfg.quickBonus : 0);
      s.score += pts; s.delivered++;
      freeSlot(s, t);
      ev.push({ type: 'deliver', cargo: c, points: pts, quick, site });
    }
  }
  spawnOrders(s, t, ev);
  return ev;
}

// Hasil akhir shift: menang bila target tercapai. Dipanggil pemanggil SETELAH semua langkah <= shiftMs diproses.
export function finishShift(s) {
  if (s.status !== 'playing') return s.status;
  s.status = s.delivered >= s.cfg.target ? 'won' : 'lost';
  s.reason = 'time';
  return s.status;
}
