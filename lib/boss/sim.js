// Penjaga Kebun — simulasi murni dengan RNG dan jam yang diinjeksi.
// Ronde 1–9: antek bergiliran. Ronde 10: boss dengan 3 lapis HP (3/5/10).
// Tiap target bintang hanya dapat dipukul sekali per jendela. Semua bahaya berhenti
// ketika celah terbuka. Telegraph tetap mengikuti waktu tempuh, termasuk saat fase makin cepat.
import { cellKey, isOpposite, findSpawn } from '../sim/grid';

export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
export const W = 17, H = 15;
export const ARENA_MAP = [
  '??????BBBBB??????'.replace(/\?/g, '.'),
  '??????BBBBB??????'.replace(/\?/g, '.'),
  '??????BBBBB??????'.replace(/\?/g, '.'),
  ...Array.from({ length: 12 }, () => '.'.repeat(17)),
];
export const START = { snake: [[6, 12], [5, 12], [4, 12]], dir: 'R' };
export const WEAK_TILES = [{ x: 8, y: 3 }, { x: 5, y: 3 }, { x: 11, y: 3 }];

export const DEFAULT_CONFIG = {
  lives: 5, minionRounds: 9, bossHp: 18, energyNeed: 3, energyMax: 9, apples: 3, startLen: 3, shrinkOnHit: 3,
  invulnMs: 2500, transitionMs: 2200, initialGapMs: 3000, gapMs: 1600, marginSteps: 3, graceMs: 600, respawnClearRadius: 3,
  healDropChance: 0.25, maxHealPickups: 3,
  shieldGain: 10, shieldEveryMs: 5000, shieldPulses: 3, shieldMax: 100, baseDamage: 1, shieldPerDouble: 5,
  row: { teleMs: 1600, activeMs: 800, recMs: 600 },
  mines: { teleMs: 2000, activeMs: 3000, recMs: 500 },
  corridor: { teleMs: 2500, activeMs: 2000, recMs: 700, width: 3, maxTeleMs: 5000 },
  phases: [
    { hp: 3, pool: ['row', 'mines', 'corridor'], windowMs: 6000, mines: 4, gapMs: 1600, pace: 1, openings: 1, damage: 1 },
    { hp: 5, pool: ['row', 'mines', 'corridor'], windowMs: 5000, mines: 6, gapMs: 900, pace: 0.7, openings: 2, damage: 1 },
    { hp: 10, pool: ['row', 'mines', 'corridor'], windowMs: 4200, mines: 8, gapMs: 400, pace: 0.45, openings: 3, damage: 2 },
  ],
};

export const MINIONS = [
  { id: 'seed', name: 'Si Biji', color: '#e6ad56', pool: ['row', 'mines'] },
  { id: 'mushroom', name: 'Jamur Usil', color: '#cd766c', pool: ['mines', 'row'] },
  { id: 'thorn', name: 'Duri Bandel', color: '#7caa64', pool: ['corridor', 'row'] },
];
export const BOSS_VARIANTS = [
  { id: 'root', name: 'Akar Gahar', color: '#956237', favorite: 'row' },
  { id: 'spore', name: 'Raja Spora', color: '#a45d7b', favorite: 'mines' },
  { id: 'vine', name: 'Sulur Liar', color: '#4f8865', favorite: 'corridor' },
];

export function bossConfig(config) {
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  cfg.phases = DEFAULT_CONFIG.phases.map((p, i) => ({ ...p, ...((config && config.phases && config.phases[i]) || {}) }));
  cfg.bossHp = cfg.phases.reduce((n, p) => n + p.hp, 0);
  return cfg;
}
export const isBossRound = (s) => s.round > s.cfg.minionRounds;
export const energyNeed = (s) => isBossRound(s) ? s.cfg.energyNeed : 1;
export const phaseRules = (s) => isBossRound(s) ? s.cfg.phases[s.phase - 1] : {
  pool: s.minion.pool, mines: 2 + Math.ceil(s.round / 2), windowMs: 6000,
  gapMs: Math.max(700, 1600 - s.round * 100), pace: Math.max(0.65, 1 - s.round * 0.035), openings: 1, damage: 1,
};
export const weakTiles = (s) => (s.window.targets || [s.weakIdx]).map(i => ({ ...s.arena.weak[i], index: i, used: (s.window.used || []).includes(i) }));
const minionCount = (round) => Math.min(3, 1 + Math.floor((round - 1) / 3));
function nextMinion(s) {
  const choices = MINIONS.filter(m => !s.minion || m.id !== s.minion.id);
  s.minion = choices[Math.floor(s.rng() * choices.length)];
  s.lastAttack = null;
}

export function parseArena(map, start, weak) {
  const h = map.length, w = map[0].length;
  const a = { w, h, boss: new Uint8Array(w * h), errors: [], weak: weak.map(p => ({ ...p })), start };
  map.forEach((row, y) => { if (row.length !== w) a.errors.push(`baris ${y} panjang ${row.length}`); for (let x = 0; x < row.length; x++) { if (row[x] === 'B') a.boss[y * w + x] = 1; else if (row[x] !== '.') a.errors.push(`karakter '${row[x]}' di (${x},${y})`); } });
  if (w !== W || h !== H) a.errors.push(`ukuran harus ${W}x${H}`); // cellKey() bersama memakai COLS=17
  if (!a.boss.some(v => v)) a.errors.push('area boss kosong');
  start.snake.forEach(([x, y]) => { if (x < 0 || y < 0 || x >= w || y >= h || a.boss[y * w + x]) a.errors.push(`ular awal di (${x},${y}) tidak valid`); });
  a.weak.forEach(p => { if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h || a.boss[p.y * w + p.x]) a.errors.push(`titik lemah (${p.x},${p.y}) tidak valid`); });
  if (!a.errors.length) { // titik lemah harus terjangkau dari ular awal lewat sel bebas
    const seen = new Uint8Array(w * h), q = [start.snake[0][1] * w + start.snake[0][0]]; seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) { const c = q[i], cx = c % w, cy = (c - cx) / w; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) return; const n = ny * w + nx; if (!seen[n] && !a.boss[n]) { seen[n] = 1; q.push(n); } }); }
    a.weak.forEach(p => { if (!seen[p.y * w + p.x]) a.errors.push(`titik lemah (${p.x},${p.y}) tidak terjangkau`); });
  }
  return a;
}

const idx = (x, y) => y * W + x;
const inArena = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

export function createState({ arena, config, rng, interval, t }) {
  if (arena.errors.length) throw new Error('arena tidak valid: ' + arena.errors.join('; '));
  const cfg = bossConfig(config);
  const t0 = t || 0;
  const s = {
    arena, cfg, rng, interval: interval || 140, t: t0, status: 'playing', result: null,
    snake: arena.start.snake.map(([x, y]) => ({ x, y })), dir: { ...DIRS[arena.start.dir] },
    round: 1, minionsLeft: minionCount(1), minionsTotal: minionCount(1), minionsDefeated: 0, minion: null,
    variant: BOSS_VARIANTS[Math.floor(rng() * BOSS_VARIANTS.length)], lastAttack: null, phaseHp: cfg.phases[0].hp,
    hp: cfg.bossHp, lives: cfg.lives, energy: 0, phase: 1, attacksDone: 0, damageDealt: 0,
    hazard: new Uint8Array(W * H), warn: new Uint8Array(W * H), attack: null,
    sched: { kind: 'gap', endAt: t0 + cfg.initialGapMs },
    weakIdx: 0, window: { open: false, hit: false }, invulnUntil: 0, apples: [], heals: [], pendingHeal: 0,
    shield: 0, shieldBursts: [], damageStacks: 0, damageOrbs: [], pendingDamage: 0,
    safe: null, // sel koridor aman (indeks) saat koridor tampil
  };
  nextMinion(s);
  for (let i = 0; i < cfg.apples; i++) { const a = spawnApple(s); if (a) s.apples.push(a); }
  return s;
}

export const weakTile = (s) => s.arena.weak[s.weakIdx];
export const isInvuln = (s) => s.t < s.invulnUntil;

// ---------- sel & rute ----------
function bodySet(s, skipTail) { const set = new Set(); (skipTail ? s.snake.slice(0, -1) : s.snake).forEach(p => set.add(idx(p.x, p.y))); return set; }
function blocked(s, x, y) { return !inArena(x, y) || s.arena.boss[idx(x, y)] === 1; }

function spawnApple(s) {
  const body = bodySet(s, false), cells = [];
  const taken = new Set([...s.apples, ...s.heals, ...s.damageOrbs].map(a => idx(a.x, a.y)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = idx(x, y);
    if (s.arena.boss[c] || body.has(c) || taken.has(c) || s.hazard[c] || s.warn[c] || s.arena.weak.some(p => p.x === x && p.y === y)) continue;
    cells.push({ x, y });
  }
  return cells.length ? cells[Math.floor(s.rng() * cells.length)] : null;
}

// Hadiah tidak kedaluwarsa. Bila papan penuh, nilai heal ditunda, tidak hilang.
function queueHeal(s, amount) { s.pendingHeal += amount; flushHeal(s); }
function flushHeal(s) {
  if (!s.pendingHeal) return;
  if (s.heals.length >= s.cfg.maxHealPickups) { s.heals[0].amount += s.pendingHeal; s.pendingHeal = 0; return; }
  const p = spawnApple(s);
  if (p) { s.heals.push({ ...p, amount: s.pendingHeal }); s.pendingHeal = 0; }
}

// Orb damage permanen selama run. Bonus shield hanya aktif setelah mengambil orb.
export function playerDamage(s) {
  const shieldStacks = s.damageStacks > 0 ? Math.floor(s.shield / s.cfg.shieldPerDouble) : 0;
  return Math.min(Number.MAX_SAFE_INTEGER, s.cfg.baseDamage * Math.pow(2, Math.min(52, s.damageStacks + shieldStacks)));
}
function flushDamage(s) {
  if (!s.pendingDamage) return;
  if (s.damageOrbs.length >= 3) { s.damageOrbs[0].amount += s.pendingDamage; s.pendingDamage = 0; return; }
  const p = spawnApple(s);
  if (p) { s.damageOrbs.push({ ...p, amount: s.pendingDamage }); s.pendingDamage = 0; }
}
function phaseThreeDrops(s) {
  queueHeal(s, 1); s.pendingDamage++; flushDamage(s);
}
function nextShieldAt(s) {
  return s.shieldBursts.reduce((t, b) => Math.min(t, b.nextAt), Infinity);
}
function grantShield(s, at, ev) {
  for (const b of s.shieldBursts) {
    if (b.nextAt > at) continue;
    const gained = Math.min(s.cfg.shieldGain, s.cfg.shieldMax - s.shield);
    s.shield += gained; b.left--; b.nextAt += s.cfg.shieldEveryMs;
    ev.push({ type: 'shieldGain', amount: gained, shield: s.shield });
  }
  s.shieldBursts = s.shieldBursts.filter(b => b.left > 0);
}

// Jarak langkah (BFS) dari kepala ke sel yang memenuhi `goal`, lewat sel bebas non-tubuh. -1 bila tidak terjangkau.
function stepsTo(s, goal, maxSteps) {
  const body = bodySet(s, true), h = s.snake[0], dist = new Map([[idx(h.x, h.y), 0]]), q = [h];
  if (goal(h.x, h.y)) return 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], d = dist.get(idx(c.x, c.y));
    if (maxSteps != null && d >= maxSteps) continue;
    for (const k of Object.values(DIRS)) {
      const nx = c.x + k.x, ny = c.y + k.y, n = idx(nx, ny);
      if (blocked(s, nx, ny) || body.has(n) || dist.has(n)) continue;
      dist.set(n, d + 1);
      if (goal(nx, ny)) return d + 1;
      q.push({ x: nx, y: ny });
    }
  }
  return -1;
}

const teleFor = (s, base, steps) => Math.max(base, (steps + s.cfg.marginSteps) * s.interval + s.cfg.graceMs);

// ---------- generator serangan (semua mengembalikan {kind, cells:Set, teleMs, activeMs, recMs, safe?}) ----------
function genRow(s) {
  const c = s.cfg.row, h = s.snake[0], rows = [];
  for (let y = 3; y < H; y++) rows.push(y);
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(s.rng() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
  const tele = teleFor(s, c.teleMs, 1);
  let y = rows.find(r => r !== h.y || stepsTo(s, (x, yy) => yy !== r, 2) !== -1);
  if (y == null) y = rows[0]; // kepala terkurung di baris itu (praktis mustahil); baris tetap sah, ada telegraph panjang
  const cells = new Set(); for (let x = 0; x < W; x++) cells.add(idx(x, y));
  return { kind: 'row', cells, teleMs: tele, activeMs: c.activeMs, recMs: c.recMs, row: y };
}

function reachableRatio(s, mines) {
  const body = bodySet(s, true), h = s.snake[0], seen = new Set([idx(h.x, h.y)]), q = [h];
  let free = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = idx(x, y); if (!s.arena.boss[c] && !body.has(c) && !mines.has(c)) free++; }
  for (let i = 0; i < q.length; i++) for (const k of Object.values(DIRS)) { const nx = q[i].x + k.x, ny = q[i].y + k.y, n = idx(nx, ny); if (blocked(s, nx, ny) || body.has(n) || mines.has(n) || seen.has(n)) continue; seen.add(n); q.push({ x: nx, y: ny }); }
  return seen.size / Math.max(1, free);
}

function genMines(s) {
  const c = s.cfg.mines, n = phaseRules(s).mines, h = s.snake[0], body = bodySet(s, false), w = weakTile(s);
  const apples = new Set([...s.apples, ...s.heals, ...s.damageOrbs].map(a => idx(a.x, a.y)));
  const cand = [];
  for (let y = 3; y < H; y++) for (let x = 0; x < W; x++) {
    const k = idx(x, y);
    if (body.has(k) || apples.has(k) || (x === w.x && y === w.y)) continue;
    if (Math.abs(x - h.x) + Math.abs(y - h.y) < 3) continue; // tidak di kepala / depan kepala
    cand.push(k);
  }
  for (let attempt = 0; attempt < 12 && n > 0 && cand.length >= n; attempt++) {
    const pool = cand.slice(), cells = new Set();
    for (let i = 0; i < n; i++) { const j = Math.floor(s.rng() * pool.length); cells.add(pool[j]); pool.splice(j, 1); }
    if (reachableRatio(s, cells) >= 0.7) return { kind: 'mines', cells, teleMs: teleFor(s, c.teleMs, 1), activeMs: c.activeMs, recMs: c.recMs };
  }
  return null;
}

function genCorridor(s) {
  const c = s.cfg.corridor, half = Math.floor(c.width / 2), opts = [];
  for (let cx = half; cx <= W - 1 - half; cx++) {
    const lo = cx - half, hi = cx + half;
    const d = stepsTo(s, (x) => x >= lo && x <= hi, 40);
    if (d < 0) continue;
    const tele = teleFor(s, c.teleMs, d);
    if (tele <= c.maxTeleMs) opts.push({ lo, hi, tele });
  }
  if (!opts.length) return null;
  const o = opts[Math.floor(s.rng() * opts.length)];
  const cells = new Set(), safe = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = idx(x, y); if (s.arena.boss[k]) continue;
    if (x >= o.lo && x <= o.hi) safe.add(k); else cells.add(k);
  }
  return { kind: 'corridor', cells, safe, teleMs: o.tele, activeMs: c.activeMs, recMs: c.recMs, lo: o.lo, hi: o.hi };
}

function pickAttack(s) {
  const rules = phaseRules(s);
  // RNG berbobot + larangan pengulangan langsung. Favorit boss memengaruhi peluang,
  // bukan urutan tetap. Posisi bahaya tetap diacak oleh generator yang sama.
  const allowed = rules.pool.filter(k => k !== s.lastAttack);
  const pool = allowed.length ? allowed.slice() : rules.pool.slice();
  if (isBossRound(s) && pool.includes(s.variant.favorite)) pool.push(s.variant.favorite);
  const kind = pool[Math.floor(s.rng() * pool.length)];
  const gen = { row: genRow, mines: genMines, corridor: genCorridor }[kind];
  const attack = (gen && gen(s)) || genRow(s);
  s.lastAttack = attack.kind;
  // Percepat jeda dan durasi aktif, JANGAN memotong batas aman telegraph.
  attack.activeMs = Math.round(attack.activeMs * rules.pace);
  attack.recMs = Math.round(attack.recMs * rules.pace);
  attack.damage = rules.damage;
  return attack;
}

function openWindow(s, at, ev) {
  const cand = s.arena.weak.map((p, i) => i).filter(i => !s.snake.some(b => b.x === s.arena.weak[i].x && b.y === s.arena.weak[i].y));
  const list = cand.slice();
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(s.rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  s.arena.weak.forEach((p, i) => { if (!list.includes(i)) list.push(i); });
  const targets = list.slice(0, phaseRules(s).openings);
  s.weakIdx = targets[0];
  s.window = { open: true, hit: false, targets, used: [] };
  // Minimum waktu untuk mencapai salah satu celah yang tidak tertutup tubuh.
  const d = stepsTo(s, (x, y) => targets.some(i => s.arena.weak[i].x === x && s.arena.weak[i].y === y));
  const duration = Math.max(phaseRules(s).windowMs, (Math.max(0, d) + s.cfg.marginSteps) * s.interval + s.cfg.graceMs);
  s.sched = { kind: 'window', endAt: at + duration };
  ev.push({ type: 'window', open: true });
}

// ---------- penjadwal (menunggu `t`; idempoten, aman dipanggil tiap frame) ----------
export function advance(s, t, ev) {
  ev = ev || [];
  if (s.status !== 'playing') return ev;
  let guard = 0;
  while (s.status === 'playing' && Math.min(s.sched.endAt, nextShieldAt(s)) <= t && guard++ < 200) {
    const at = Math.min(s.sched.endAt, nextShieldAt(s));
    s.t = at;
    // Jadwal shield dan serangan diproses berurutan; tidak bergantung pada FPS.
    if (nextShieldAt(s) <= at) { grantShield(s, at, ev); continue; }
    const k = s.sched.kind;
    if (k === 'gap') {
      s.attack = pickAttack(s);
      s.attack.cells.forEach(c => { s.warn[c] = 1; });
      if (s.attack.safe) s.safe = s.attack.safe;
      s.sched = { kind: 'tele', endAt: at + s.attack.teleMs };
      ev.push({ type: 'attack', kind: s.attack.kind, stage: 'tele', damage: s.attack.damage });
    } else if (k === 'tele') {
      s.attack.cells.forEach(c => { s.warn[c] = 0; s.hazard[c] = 1; });
      s.sched = { kind: 'active', endAt: at + s.attack.activeMs };
      ev.push({ type: 'attack', kind: s.attack.kind, stage: 'active' });
    } else if (k === 'active') {
      if (isBossRound(s) && s.phase === 3) {
        s.shieldBursts.push({ nextAt: at + s.cfg.shieldEveryMs, left: s.cfg.shieldPulses });
        phaseThreeDrops(s);
      }
      s.attack.cells.forEach(c => { s.hazard[c] = 0; });
      s.sched = { kind: 'recovery', endAt: at + s.attack.recMs };
    } else if (k === 'recovery') {
      s.attack = null; s.safe = null; s.attacksDone++;
      openWindow(s, at, ev);
    } else if (k === 'window') {
      s.window = { ...s.window, open: false };
      s.sched = { kind: 'gap', endAt: at + phaseRules(s).gapMs };
      ev.push({ type: 'window', open: false });
    } else if (k === 'transition') {
      s.phase += 1; s.phaseHp = s.cfg.phases[s.phase - 1].hp; s.lastAttack = null;
      if (s.phase === 3) phaseThreeDrops(s);
      s.sched = { kind: 'gap', endAt: at + phaseRules(s).gapMs };
      ev.push({ type: 'phase', phase: s.phase });
    } else if (k === 'round') {
      s.round++; s.minionsLeft = minionCount(s.round); s.minionsTotal = s.minionsLeft;
      nextMinion(s);
      s.sched = { kind: 'gap', endAt: at + s.cfg.initialGapMs };
      ev.push({ type: 'round', round: s.round, boss: isBossRound(s) });
    }
    flushHeal(s); flushDamage(s);
  }
  s.t = t;
  return ev;
}

function clearThreats(s) {
  s.hazard.fill(0); s.warn.fill(0); s.attack = null; s.safe = null;
}

// ---------- tick ----------
// dirKey: arah baru (objek {x,y}) atau null. Mengembalikan daftar event.
export function stepSim(s, dir, t) {
  const ev = [];
  if (s.status !== 'playing') return ev;
  advance(s, t, ev);
  if (s.status !== 'playing') return ev;
  s.t = t;
  if (dir && !isOpposite(s.dir, dir) && (dir.x || dir.y)) s.dir = { x: dir.x, y: dir.y };
  const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
  const hk = inArena(head.x, head.y) ? idx(head.x, head.y) : -1;
  const appleI = hk < 0 ? -1 : s.apples.findIndex(a => a.x === head.x && a.y === head.y);
  const growing = appleI >= 0;
  const healI = hk < 0 ? -1 : s.heals.findIndex(a => a.x === head.x && a.y === head.y);
  const orbI = hk < 0 ? -1 : s.damageOrbs.findIndex(a => a.x === head.x && a.y === head.y);

  let cause = null;
  if (hk < 0 || s.arena.boss[hk]) cause = 'wall';
  else if (bodySet(s, !growing).has(hk)) cause = 'self';
  else if (s.hazard[hk] && !isInvuln(s)) cause = 'hazard';

  const target = weakTiles(s).find(w => head.x === w.x && head.y === w.y && !w.used);
  const hit = hk >= 0 && !!target && s.window.open && !s.window.hit && s.energy >= energyNeed(s);

  if (hit && isBossRound(s) && s.phase === 3 && playerDamage(s) >= s.shield + s.phaseHp) { // pukulan terakhir menang; tubuh tetap valid walau bersamaan dengan tabrakan
    if (!cause) { s.snake.unshift(head); s.snake.pop(); }
    applyHit(s, ev, target.index);
    finish(s, ev, 'won');
    return ev;
  }

  if (cause) {
    const damage = cause === 'hazard' && s.attack ? (s.attack.damage || 1) : 1;
    s.lives = Math.max(0, s.lives - damage);
    ev.push({ type: 'death', cause, lives: s.lives, damage });
    if (hit) applyHit(s, ev, target.index); // hit non-final tetap sah pada tick yang sama
    if (s.lives <= 0) { finish(s, ev, 'lost'); return ev; }
    respawn(s, ev);
    return ev;
  }

  s.snake.unshift(head);
  if (growing) {
    s.apples.splice(appleI, 1);
    s.energy = Math.min(s.cfg.energyMax, s.energy + 1);
    const a = spawnApple(s); if (a) s.apples.push(a);
    ev.push({ type: 'eat', energy: s.energy });
  } else s.snake.pop();
  if (healI >= 0) {
    const heal = s.heals.splice(healI, 1)[0]; s.lives += heal.amount;
    ev.push({ type: 'heal', amount: heal.amount, lives: s.lives });
  }
  if (orbI >= 0) {
    const orb = s.damageOrbs.splice(orbI, 1)[0]; s.damageStacks += orb.amount;
    ev.push({ type: 'damageOrb', amount: orb.amount, stacks: s.damageStacks, damage: playerDamage(s) });
  }
  if (hit) applyHit(s, ev, target.index);
  flushHeal(s); flushDamage(s);
  return ev;
}

function applyHit(s, ev, target) {
  s.energy -= energyNeed(s);
  const keep = Math.max(s.cfg.startLen, s.snake.length - s.cfg.shrinkOnHit);
  s.snake.length = Math.min(s.snake.length, keep);
  if (!isBossRound(s)) {
    s.minionsLeft--; s.minionsDefeated++;
    s.window = { open: false, hit: true }; clearThreats(s);
    ev.push({ type: 'minionHit', left: s.minionsLeft });
    if (s.minionsLeft === 0) {
      queueHeal(s, 1); // satu hadiah pasti per ronde, menunggu tidak menghasilkan hadiah lagi
      s.sched = { kind: 'round', endAt: s.t + s.cfg.transitionMs };
    } else {
      if (s.rng() < s.cfg.healDropChance) queueHeal(s, 1);
      nextMinion(s); s.sched = { kind: 'gap', endAt: s.t + phaseRules(s).gapMs };
    }
    return;
  }
  const damage = playerDamage(s), absorbed = Math.min(s.shield, damage);
  s.shield -= absorbed;
  const hpDamage = Math.min(s.phaseHp, damage - absorbed);
  s.hp -= hpDamage; s.phaseHp -= hpDamage; s.damageDealt += hpDamage;
  s.window.used = [...(s.window.used || []), target];
  const exhausted = s.window.used.length >= (s.window.targets || [s.weakIdx]).length;
  s.window.hit = exhausted; s.window.open = !exhausted;
  ev.push({ type: 'hit', hp: s.hp, damage, absorbed, hpDamage, shield: s.shield });
  if (s.phaseHp <= 0) {
    s.window = { open: false, hit: true }; clearThreats(s);
    if (s.phase < 3) { queueHeal(s, 2); s.sched = { kind: 'transition', endAt: s.t + s.cfg.transitionMs }; }
    else finish(s, ev, 'won');
  } else if (exhausted) {
    clearThreats(s); s.sched = { kind: 'gap', endAt: s.t + phaseRules(s).gapMs };
  }
}

function respawn(s, ev) {
  const b = { minX: 0, maxX: W - 1, minY: 3, maxY: H - 1 };
  const base = new Set(); for (let c = 0; c < s.arena.boss.length; c++) if (s.arena.boss[c]) base.add(cellKey(c % W, Math.floor(c / W)));
  const withSet = (...layers) => { const o = new Set(base); layers.forEach(l => l.forEach(c => o.add(cellKey(c % W, Math.floor(c / W))))); return o; };
  const haz = []; for (let c = 0; c < s.hazard.length; c++) if (s.hazard[c] || s.warn[c]) haz.push(c);
  const apples = [...s.apples, ...s.heals, ...s.damageOrbs].map(a => idx(a.x, a.y));
  const dirs = [DIRS.R, DIRS.L, DIRS.U, DIRS.D];
  const sp = findSpawn(b, withSet(haz, apples), dirs, 8, 12) || findSpawn(b, withSet(haz), dirs, 8, 12) || findSpawn(b, withSet([]), dirs, 8, 12);
  if (!sp) { finish(s, ev, 'lost'); return; } // praktis mustahil
  s.snake = sp.snake; s.dir = sp.dir;
  const r = s.cfg.respawnClearRadius, h = sp.snake[0];
  const near = (c) => Math.abs((c % W) - h.x) + Math.abs(Math.floor(c / W) - h.y) <= r;
  for (let c = 0; c < s.hazard.length; c++) if (near(c)) { s.hazard[c] = 0; s.warn[c] = 0; if (s.attack) s.attack.cells.delete(c); }
  s.apples = s.apples.filter(a => !sp.snake.some(p => p.x === a.x && p.y === a.y));
  s.heals = s.heals.filter(a => {
    if (!sp.snake.some(p => p.x === a.x && p.y === a.y)) return true;
    s.pendingHeal += a.amount; return false;
  });
  s.damageOrbs = s.damageOrbs.filter(a => {
    if (!sp.snake.some(p => p.x === a.x && p.y === a.y)) return true;
    s.pendingDamage += a.amount; return false;
  });
  flushHeal(s); flushDamage(s);
  while (s.apples.length < s.cfg.apples) { const a = spawnApple(s); if (!a) break; s.apples.push(a); }
  s.invulnUntil = s.t + s.cfg.invulnMs;
  ev.push({ type: 'respawn' });
}

export function reviveBattle(s, t) {
  if (s.status !== 'lost') return false;
  s.t = t; s.status = 'playing'; s.result = null; s.lives = 3;
  clearThreats(s); s.window = { open: false, hit: false };
  s.sched = { kind: isBossRound(s) && s.phaseHp <= 0 ? 'transition' : !isBossRound(s) && s.minionsLeft <= 0 ? 'round' : 'gap', endAt: t + 3000 };
  respawn(s, []);
  s.invulnUntil = t + Math.max(3000, s.cfg.invulnMs);
  return s.status === 'playing';
}

function finish(s, ev, status) {
  if (s.status !== 'playing') return;
  s.window.open = false;
  if (status === 'won') s.shieldBursts = [];
  s.status = status; s.result = { status, hp: s.hp, lives: Math.max(0, s.lives), damage: s.damageDealt, round: s.round, minions: s.minionsDefeated };
  clearThreats(s);
  ev.push({ type: status === 'won' ? 'win' : 'lose' });
}
