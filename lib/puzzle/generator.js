// Generator level "Dungeon" — MURNI dan deterministik: (seedRun, nomorLevel) -> level yang sama persis.
// Tanpa Math.random / jam. Hanya memakai createRng(seed) dan solver BFS/A* dari sim.js.
//
// Level 1..5 = tutorial buatan tangan (levels.js). Level 6..50 dibuat sistem:
//   1. Papan dibagi menjadi 2..4 "ruang" oleh dinding pembatas. Tiap pembatas punya SATU penghalang wajib:
//      celah terbuka, portal berpasangan (pembatas utuh), duri (butuh Perisai), tembok retak (butuh Palu), atau jeruji bertuas.
//      Jadi tiap penghalang pasti harus dilewati; pickup yang dibutuhkan selalu ditaruh di ruang SEBELUM penghalangnya.
//   2. Ular mulai di ruang pertama, pintu keluar di ruang terakhir. Kunci, makanan, pilar dan semak disebar dengan RNG; combat memakai template aman yang dicerminkan.
//      Tier akhir menambah satu penjaga, lalu dua jenis penjaga dengan rute patroli.
//   3. Solver BFS/A* memutuskan: level yang tidak bisa diselesaikan DITOLAK; par = panjang solusi optimum.
//   4. Puzzle membandingkan par beberapa kandidat; combat meningkatkan HP/jenis/jumlah musuh, bukan hanya panjang rute.
//   5. Tidak menurunkan tier diam-diam. Build menolak level cadangan; jumlah musuh sesuai tier wajib terpenuhi.
import { createRng } from '../sim/rng';
import { buildLevel, solve, DIRS } from './sim';
import { LEVELS } from './levels';

export const MAX_LEVEL = 50;
export const TUTORIAL_COUNT = 5;
const SOLVE_BUDGET = 12000;   // batas state solver per kandidat
const WORK_BUDGET = 80000;   // batas total state solver per level pada tier-nya (setelah itu: ambil kandidat terbaik)
const CANDIDATES = 3;         // kandidat valid yang dibandingkan per level
const MAX_ATTEMPTS = 40;      // percobaan pembuatan per tier pada tier yang sama

// Tier: elemen baru muncul bertahap. `intro` = elemen yang diperkenalkan pada level pertama tier itu (untuk kartu pengantar UI).
export const TIERS = [
  { id: 't1', name: 'Lorong Kunci', from: 6, to: 12, W: [11, 13], H: [7, 9], sections: [2, 3], barriers: ['gap'], keys: [1, 1], foods: [1, 1], pillars: [1, 3], plate: false, guards: [0, 0], intro: null },
  { id: 't2', name: 'Lompatan Portal', from: 13, to: 19, W: [12, 14], H: [7, 9], sections: [3, 3], barriers: ['gap', 'portal'], keys: [1, 2], foods: [1, 2], pillars: [2, 4], plate: true, guards: [0, 0], intro: 'portal' },
  { id: 't3', name: 'Duri dan Retak', from: 20, to: 27, W: [13, 15], H: [7, 9], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack'], keys: [1, 2], foods: [1, 2], pillars: [2, 4], plate: true, guards: [0, 0], intro: 'duri' },
  { id: 't4', name: 'Ruang Tuas', from: 28, to: 34, W: [14, 16], H: [7, 11], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 2], foods: [1, 2], pillars: [3, 5], plate: true, guards: [0, 0], intro: 'gerbang' },
  { id: 't5', name: 'Penjaga Dungeon', from: 35, to: 42, guards: [1, 1], intro: 'penjaga' },
  { id: 't6', name: 'Penjaga Ganda', from: 43, to: 50, guards: [2, 2], intro: null },
];

export const tierOf = (n) => TIERS.find(t => n >= t.from && n <= t.to) || null;

// Kurva par target: naik pelan sepanjang level 6..50 (rata-rata makin sulit).
export const targetPar = (n) => Math.round(14 + (n - 6) * 0.85);

// Hash kecil (mulberry-gaya) untuk menurunkan seed per level / per percobaan.
export function mixSeed(a, b) {
  let h = (a >>> 0) ^ Math.imul((b >>> 0) + 0x9E3779B9, 0x85EBCA6B);
  h = Math.imul(h ^ (h >>> 15), 0xC2B2AE35);
  h = Math.imul(h ^ (h >>> 13), 0x27D4EB2F);
  return (h ^ (h >>> 16)) >>> 0;
}
export const levelSeed = (runSeed, n) => mixSeed(mixSeed(runSeed >>> 0, 0x51ED), n);

const ri = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Satu percobaan membuat spec level (peta + ular + penjaga) untuk tier tertentu. Mengembalikan null bila tata letak gagal.
function buildSpec(rng, tier, n) {
  if (n >= 35) return dungeonRoom(rng, n);
  const W = ri(rng, tier.W), H = ri(rng, tier.H);
  const innerW = W - 2;
  const k = Math.min(ri(rng, tier.sections), Math.floor((innerW + 1) / 4)); // tiap ruang >= 3 sel + pembatas
  const free = innerW - (k - 1);
  if (free < 3 * k) return null;
  const widths = Array(k).fill(3);
  for (let r = free - 3 * k; r > 0; r--) widths[Math.floor(rng() * k)]++;
  const grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? '#' : '.'));
  const secs = []; // { x0, x1 } inklusif
  const divs = [];
  let x = 1;
  for (let i = 0; i < k; i++) {
    secs.push({ x0: x, x1: x + widths[i] - 1 });
    x += widths[i];
    if (i < k - 1) { divs.push(x); x += 1; }
  }
  const barriers = divs.map(() => pick(rng, tier.barriers));
  // pastikan tier baru benar-benar memakai elemen barunya sedikitnya sekali pada level pertama tier itu
  if (tier.intro && n === tier.from) {
    const want = { portal: 'portal', duri: 'spike', gerbang: 'gate' }[tier.intro];
    if (want && !barriers.includes(want)) barriers[0] = want;
  }
  const gapRows = [];
  const needs = []; // { kind, sec } pickup yang harus ada di ruang <= sec
  const portals = [];
  const links = [], gateNeeds = [];
  divs.forEach((dx, i) => {
    const gy = 1 + Math.floor(rng() * (H - 2));
    gapRows.push(gy);
    for (let y = 1; y < H - 1; y++) grid[y][dx] = '#';
    const b = barriers[i];
    if (b === 'gap') grid[gy][dx] = '.';
    else if (b === 'spike') { grid[gy][dx] = '^'; needs.push({ kind: 'S', sec: i }); }
    else if (b === 'crack') { grid[gy][dx] = 'x'; needs.push({ kind: 'P', sec: i }); }
    else if (b === 'gate') { grid[gy][dx] = 'G'; gateNeeds.push({ x: dx, y: gy, sec: i }); }
    else if (b === 'portal') portals.push({ i, id: String(portals.length + 1) });
  });
  if (portals.length > 3) return null;

  const taken = new Set();
  const tk = (x, y) => x + ',' + y;
  // sel yang dilarang diisi objek: di sekitar celah pembatas (supaya jalur lintas tidak tertutup)
  divs.forEach((dx, i) => { for (const [ox, oy] of [[-1, 0], [1, 0], [0, 0]]) taken.add(tk(dx + ox, gapRows[i] + oy)); });

  // kantong pintu keluar + plate di ruang terakhir
  const last = secs[k - 1];
  let exit = null, plate = null;
  const lastW = last.x1 - last.x0 + 1;
  if (tier.plate && n % 2 === 1 && lastW >= 4) {
    const d = ri(rng, [2, Math.min(4, lastW - 2)]);
    const r = 1 + Math.floor(rng() * (H - 2));
    const ex = last.x1, xa = ex - d;
    for (let xx = xa; xx <= ex; xx++) { for (const yy of [r - 1, r + 1]) if (yy >= 1 && yy <= H - 2) grid[yy][xx] = '#'; taken.add(tk(xx, r)); }
    // pembatas di kiri kantong tidak boleh menutup mulut kantong
    taken.add(tk(xa - 1, r));
    exit = { x: ex, y: r }; plate = { x: xa, y: r };
    grid[r][ex] = 'E'; grid[r][xa] = 'a';
  }
  const cellsIn = (si) => { const out = []; for (let yy = 1; yy < H - 1; yy++) for (let xx = secs[si].x0; xx <= secs[si].x1; xx++) if (grid[yy][xx] === '.' && !taken.has(tk(xx, yy))) out.push({ x: xx, y: yy }); return out; };
  const take = (si, ch) => {
    const c = cellsIn(si);
    if (!c.length) return null;
    const p = pick(rng, c);
    grid[p.y][p.x] = ch; taken.add(tk(p.x, p.y));
    return p;
  };
  // pilar acak (hanya sel yang tidak mengganggu apa pun)
  const pillars = ri(rng, tier.pillars);
  for (let i = 0; i < pillars; i++) { const si = Math.floor(rng() * k); const c = cellsIn(si); if (c.length > 6) { const p = pick(rng, c); grid[p.y][p.x] = '#'; taken.add(tk(p.x, p.y)); } }

  if (!exit) { exit = take(k - 1, 'E'); if (!exit) return null; }

  // Maskot di ruang pertama; satu petak tetangga disisakan untuk langkah awal.
  const head0 = cellsIn(0).filter(p => { const dirs = Object.values(DIRS); return dirs.some(d => grid[p.y - d.y] && grid[p.y - d.y][p.x - d.x] === '.' && !taken.has(tk(p.x - d.x, p.y - d.y))); });
  if (!head0.length) return null;
  const hp = pick(rng, head0);
  const dkeys = ['U', 'D', 'L', 'R'].filter(dk => { const d = DIRS[dk]; const nx = hp.x - d.x, ny = hp.y - d.y; return grid[ny] && grid[ny][nx] === '.' && !taken.has(tk(nx, ny)); });
  const dk = pick(rng, dkeys), dd = DIRS[dk];
  const neck = { x: hp.x - dd.x, y: hp.y - dd.y };
  taken.add(tk(hp.x, hp.y)); taken.add(tk(neck.x, neck.y));

  // kunci
  const keys = ri(rng, tier.keys);
  for (let i = 0; i < keys; i++) if (!take(Math.floor(rng() * k), 'K')) return null;
  // pickup yang dibutuhkan penghalang: di ruang <= pembatasnya
  for (const nd of needs) if (!take(Math.floor(rng() * (nd.sec + 1)), nd.kind)) return null;
  for (const nd of gateNeeds) {
    const lever = take(nd.sec, '!');
    if (!lever) return null;
    links.push({ gate: [nd.x, nd.y], lever: [lever.x, lever.y] });
  }
  // portal: ujung A di ruang i, ujung B di ruang i+1
  for (const p of portals) { if (!take(p.i, p.id) || !take(p.i + 1, p.id)) return null; }
  // Koin bonus opsional, terpisah dari syarat pintu keluar.
  const foods = ri(rng, tier.foods);
  for (let i = 0; i < foods; i++) if (!take(Math.floor(rng() * k), 'F')) return null;
  // semak + penjaga
  const guardSpecs = [];
  const gcount = ri(rng, tier.guards);
  for (let gi = 0; gi < gcount; gi++) {
    const si = 1 + Math.floor(rng() * (k - 1)); // bukan ruang awal
    const c = cellsIn(si).filter(p => Math.abs(p.x - hp.x) + Math.abs(p.y - hp.y) >= 5);
    if (!c.length) return null;
    const gp = pick(rng, c);
    // Setiap penjaga benar-benar berpatroli 3–5 petak, bukan menatap satu lorong.
    const path = [[gp.x, gp.y]], used = new Set([tk(gp.x, gp.y)]);
    for (let step = 0; step < 4; step++) {
      const [x, y] = path[path.length - 1];
      const options = Object.entries(DIRS).map(([name, d]) => ({ name, x: x + d.x, y: y + d.y }))
        .filter(p => grid[p.y] && grid[p.y][p.x] === '.' && !taken.has(tk(p.x, p.y)) && !used.has(tk(p.x, p.y)));
      if (!options.length) break;
      const next = pick(rng, options); path.push([next.x, next.y]); used.add(tk(next.x, next.y));
    }
    if (path.length < 3) return null;
    const delta = { x: path[1][0] - gp.x, y: path[1][1] - gp.y };
    const g = { x: gp.x, y: gp.y, dir: Object.keys(DIRS).find(k => DIRS[k].x === delta.x && DIRS[k].y === delta.y), range: 3, patrol: path };
    path.slice(1).forEach(([x, y]) => taken.add(tk(x, y)));
    taken.add(tk(gp.x, gp.y));
    guardSpecs.push(g);
  }
  if (tier.bushes && gcount > 0) { const bn = ri(rng, tier.bushes); for (let i = 0; i < bn; i++) take(1 + Math.floor(rng() * (k - 1)), 'v'); }

  const exitSpec = { keys, plates: plate ? ['a'] : [] };
  return {
    map: grid.map(r => r.join('')),
    snake: [[hp.x, hp.y]], dir: dk, exit: exitSpec,
    guards: guardSpecs, links,
    features: { barriers: [...new Set(barriers)], keys, plate: !!plate, guards: guardSpecs.length, patrol: guardSpecs.some(g => g.patrol) },
  };
}

// Ruangan combat memakai fondasi yang teruji, lalu dicerminkan dan diberi variasi.
// Kunci, tuas, dan peti dijaga di jalur yang berarti; jumlah musuh tidak diturunkan diam-diam.
function dungeonRoom(rng, n) {
  const w = n >= 43 ? 13 : 11, h = 9, divider = Math.floor(w / 2);
  const map = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.'));
  for (let y = 1; y < h - 1; y++) map[y][divider] = '#';
  const flipX = rng() < .5, flipY = rng() < .5;
  const turn = (x, y) => [flipX ? w - 1 - x : x, flipY ? h - 1 - y : y];
  const gate = [divider, 4], lever = [2, 2], keyY = rng() < .5 ? 2 : 6;
  map[gate[1]][gate[0]] = 'G'; map[lever[1]][lever[0]] = '!';
  map[6][3] = 'K'; map[keyY][w - 3] = 'K'; map[4][w - 2] = 'E';
  map[2][3] = 'F'; map[7 - keyY][w - 3] = 'F';
  if (n % 3 === 0) map[1][w - 3] = 'F';
  map[6][2] = 'H'; map[2][divider - 1] = 'v';
  if (n % 2) map[6][w - 4] = '#'; else map[2][w - 4] = '#';
  const right = divider + 2;
  const guards = [{ x: right, y: 3, kind: n < 39 ? 'slime' : 'warden', dir: 'D', patrol: [[right, 3], [right, 4], [right, 5]] }];
  if (n >= 43) guards.push({ x: 3, y: 5, kind: 'slime', dir: 'U', patrol: [[3, 5], [3, 4], [2, 4], [2, 5]] });
  const rows = Array.from({ length: h }, () => Array(w).fill('.'));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [a, b] = turn(x, y); rows[b][a] = map[y][x]; }
  return { map: rows.map(r => r.join('')), snake: [turn(1, 4)], dir: flipX ? 'L' : 'R', exit: { keys: 2, plates: [] },
    links: [{ gate: turn(...gate), lever: turn(...lever) }],
    guards: guards.map(g => { const [x, y] = turn(g.x, g.y); return { ...g, x, y, dir: flipY ? (g.dir === 'U' ? 'D' : 'U') : g.dir, patrol: g.patrol.map(p => turn(...p)) }; }),
    features: { barriers: ['gate'], keys: 2, plate: false, guards: guards.length, patrol: true } };
}

function goalText(f) {
  const bits = ['Capai pintu keluar.'];
  if (f.keys) bits.push(f.keys === 1 ? 'Ambil kunci dulu.' : `Ambil ${f.keys} kunci dulu.`);
  if (f.plate) bits.push('Injak sakelar; tetap aktif sampai level selesai.');
  if (f.barriers.includes('portal')) bits.push('Pakai portal untuk pindah ruang.');
  if (f.barriers.includes('spike')) bits.push('Duri butuh Perisai.');
  if (f.barriers.includes('crack')) bits.push('Tembok retak butuh Palu.');
  if (f.barriers.includes('gate')) bits.push('Injak tuas untuk membuka gerbang permanen.');
  if (f.guards) bits.push('Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan.');
  bits.push('Koin apel opsional, disimpan setelah keluar.');
  return bits.join(' ');
}

// Satu percobaan penuh: spec -> buildLevel -> solver. Mengembalikan { level, spec, par } atau null.
export const DIAG = { nospec: 0, invalid: 0, unsolved: 0, ok: 0 };
function attempt(seed, tier, n, stats) {
  const rng = createRng(seed);
  const spec = buildSpec(rng, tier, n);
  if (!spec) { DIAG.nospec++; return null; }
  const features = spec.features;
  const base = { id: `g${n}-${seed.toString(16)}`, name: tier.name, goal: goalText(features), par: 1, map: spec.map, snake: spec.snake, dir: spec.dir, exit: spec.exit, guards: spec.guards, links: spec.links || [] };
  const first = buildLevel(base);
  if (!first.level) { DIAG.invalid++; return null; }
  const path = solve(first.level, n >= 35 ? 60000 : SOLVE_BUDGET, stats);
  if (!path) { DIAG.unsolved++; return null; }
  DIAG.ok++;
  const built = buildLevel({ ...base, par: path.length });
  if (!built.level) return null;
  return { level: built.level, spec: { ...base, par: path.length }, par: path.length, solution: path, features };
}

// Level cadangan: koridor + kunci. Selalu valid dan bisa diselesaikan; dipakai hanya bila generator gagal total.
const FALLBACK_SPEC = {
  id: 'fallback', name: 'Lorong Kunci', goal: 'Ambil kunci, lalu masuk ke pintu keluar.', par: 1,
  map: ['#########', '#.......#', '#E..#..K#', '#.......#', '#########'], snake: [[3, 1], [4, 1]], dir: 'L', exit: { keys: 1, plates: [] },
};
function fallbackLevel(n) {
  const base = { ...FALLBACK_SPEC, id: `fallback-${n}` };
  const path = solve(buildLevel(base).level);
  return { level: buildLevel({ ...base, par: path.length }).level, par: path.length, solution: path, features: { barriers: ['gap'], keys: 1, plate: false, guards: 0, patrol: false } };
}

const cache = new Map();

// Level ke-n (1..50) untuk run `runSeed`. Deterministik; hasil di-cache per (runSeed, n).
export function getLevel(n, runSeed = 0) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_LEVEL) throw new RangeError(`level harus 1..${MAX_LEVEL}`);
  if (n <= TUTORIAL_COUNT) {
    const lv = LEVELS[n - 1];
    return { n, level: lv, par: lv.par, tutorial: true, tier: 'tutorial', seed: 0, attempts: 0, fallback: false, features: null };
  }
  const ck = (runSeed >>> 0) + ':' + n;
  if (cache.has(ck)) return cache.get(ck);
  const seed0 = levelSeed(runSeed, n);
  let tierIdx = TIERS.findIndex(t => n >= t.from && n <= t.to);
  const target = targetPar(n);
  let result = null, attempts = 0;
  for (let ti = tierIdx; ti === tierIdx && !result; ti--) {
    const tier = TIERS[ti];
    const budget = WORK_BUDGET;
    const stats = { states: 0 };
    const cands = [], weak = [];
    for (let a = 0; a < MAX_ATTEMPTS && cands.length < (n >= 35 ? 1 : CANDIDATES) && stats.states < budget; a++) {
      attempts++;
      const sd = mixSeed(seed0, ti * 1000 + a);
      const r = attempt(sd, tier, n, stats);
      if (!r) continue;
      (n >= 35 || r.par >= Math.round(target * 0.6) ? cands : weak).push({ ...r, seed: sd });
    }
    const pool = cands.length ? cands : weak; // tidak ada yang cukup sulit: ambil yang paling sulit di antara yang valid
    if (pool.length) {
      if (cands.length) pool.sort((p, q) => Math.abs(p.par - target) - Math.abs(q.par - target) || p.seed - q.seed);
      else pool.sort((p, q) => q.par - p.par || p.seed - q.seed);
      result = { ...pool[0], tier: tier.id };
    }
  }
  let fallback = false;
  if (!result) { fallback = true; result = { ...fallbackLevel(n), tier: 'fallback', seed: 0 }; }
  const out = { n, level: result.level, par: result.par, tutorial: false, tier: result.tier, seed: result.seed, attempts, fallback, features: result.features, solution: result.solution, spec: result.spec || null };
  cache.set(ck, out);
  return out;
}

export function clearLevelCache() { cache.clear(); }
