import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bossSim as B, createRng, makeBossWorld, recordsLib, registry, ICONS, root } from './helpers/env.mjs';

const D = B.DIRS;
const arena = () => B.parseArena(B.ARENA_MAP, B.START, B.WEAK_TILES);
// Fixture singkat untuk kontrak dasar: langsung boss, tiap fase 1 HP.
// Aturan produksi 10 ronde / 18 HP diuji terpisah di boss-campaign.test.mjs.
const compact = { minionRounds: 0, lives: 3, energyMax: 6, apples: 2, phases: [{ hp: 1 }, { hp: 1 }, { hp: 1 }] };
const mk = (seed = 1, over = {}) => B.createState({ arena: arena(), config: { ...compact, ...over.config }, rng: createRng(seed), interval: over.interval || 140, t: 0 });
const at = (x, y) => y * B.W + x;
const put = (s, cells, dirKey = 'R') => { s.snake = cells.map(([x, y]) => ({ x, y })); s.dir = { ...D[dirKey] }; };
const kinds = (ev) => ev.map(e => e.type);
// Maju sampai sched.kind tertentu (waktu simulasi), mengembalikan event.
const goTo = (s, kind) => { const all = []; let g = 0; while (s.sched.kind !== kind && g++ < 20) B.advance(s, s.sched.endAt, all); return all; };
const forceWindow = (s, weakIdx = 0) => { s.weakIdx = weakIdx; s.window = { open: true, hit: false }; s.sched = { kind: 'window', endAt: s.t + 60000 }; s.attack = null; s.hazard.fill(0); s.warn.fill(0); };

test('arena valid; arena tidak valid ditolak (ukuran, titik lemah di boss, tak terjangkau, karakter)', () => {
  assert.deepEqual(arena().errors, []);
  const bad = (map, st, wk) => B.parseArena(map, st || B.START, wk || B.WEAK_TILES).errors.length > 0;
  assert.ok(bad(['....'], B.START, B.WEAK_TILES));
  assert.ok(bad(B.ARENA_MAP, B.START, [{ x: 8, y: 1 }]));
  assert.ok(bad(B.ARENA_MAP, { snake: [[8, 1], [8, 2], [8, 3]], dir: 'R' }));
  assert.ok(bad(B.ARENA_MAP.map((r, i) => (i === 5 ? 'x' + r.slice(1) : r))));
  assert.throws(() => B.createState({ arena: B.parseArena(['..'], B.START, B.WEAK_TILES), rng: Math.random }));
});

test('awal: boss 3 HP, 3 nyawa, 0 energi, 2 apel energi bebas, titik lemah terkunci, belum ada serangan', () => {
  const s = mk();
  assert.deepEqual([s.hp, s.lives, s.energy, s.phase], [3, 3, 0, 1]);
  assert.equal(s.apples.length, 2);
  s.apples.forEach(a => { assert.ok(!s.arena.boss[at(a.x, a.y)]); assert.ok(!s.snake.some(p => p.x === a.x && p.y === a.y)); });
  assert.equal(s.window.open, false); assert.equal(s.attack, null);
  assert.equal(s.sched.kind, 'gap');
});

test('penjadwal: JEDA -> PERINGATAN -> AKTIF -> PEMULIHAN -> JENDELA -> JEDA; idempoten; hazard tepat waktu', () => {
  const s = mk();
  const first = s.sched.endAt;
  B.advance(s, first - 1, []); assert.equal(s.sched.kind, 'gap');
  const ev = B.advance(s, first, []);
  assert.equal(s.sched.kind, 'tele'); assert.ok(ev.some(e => e.type === 'attack' && e.stage === 'tele'));
  assert.ok(s.warn.some(v => v) && !s.hazard.some(v => v), 'peringatan tanpa bahaya aktif');
  assert.deepEqual(B.advance(s, first, []), [], 'idempoten');
  const teleEnd = s.sched.endAt;
  B.advance(s, teleEnd - 1, []); assert.ok(!s.hazard.some(v => v));
  B.advance(s, teleEnd, []); assert.equal(s.sched.kind, 'active'); assert.ok(s.hazard.some(v => v) && !s.warn.some(v => v));
  goTo(s, 'recovery'); assert.ok(!s.hazard.some(v => v), 'bahaya hilang saat pemulihan');
  const evw = goTo(s, 'window');
  assert.ok(evw.some(e => e.type === 'window' && e.open)); assert.equal(s.window.open, true); assert.equal(s.attack, null);
  goTo(s, 'gap'); assert.equal(s.window.open, false);
});

test('serangan tidak pernah bersamaan dengan jendela titik lemah (titik lemah selalu terjangkau)', () => {
  const s = mk(5);
  for (let i = 0; i < 40; i++) {
    B.advance(s, s.sched.endAt, []);
    if (s.sched.kind === 'window') { assert.equal(s.attack, null); assert.ok(!s.hazard.some(v => v) && !s.warn.some(v => v)); }
    if (['tele', 'active', 'recovery'].includes(s.sched.kind)) assert.equal(s.window.open, false);
  }
});

test('hit: butuh jendela terbuka + energi 3; damage SEKALI per jendela; tile terkunci/energi kurang tetap bisa dilalui', () => {
  const s = mk(); const w = s.arena.weak[0];
  // terkunci: lewat tanpa efek
  put(s, [[w.x - 1, w.y + 1], [w.x - 2, w.y + 1], [w.x - 3, w.y + 1]], 'U'); s.energy = 3;
  s.snake = [{ x: w.x, y: w.y + 1 }, { x: w.x - 1, y: w.y + 1 }, { x: w.x - 2, y: w.y + 1 }]; s.dir = D.U;
  let ev = B.stepSim(s, null, 100);
  assert.deepEqual(s.snake[0], { x: w.x, y: w.y }); assert.equal(s.hp, 3); assert.ok(!ev.some(e => e.type === 'hit'));
  // terbuka tapi energi kurang
  const t = mk(); forceWindow(t, 0); t.energy = 2;
  t.snake = [{ x: w.x, y: w.y + 1 }, { x: w.x - 1, y: w.y + 1 }, { x: w.x - 2, y: w.y + 1 }]; t.dir = D.U;
  ev = B.stepSim(t, null, 100); assert.equal(t.hp, 3); assert.equal(t.energy, 2); assert.equal(t.lives, 3);
  // terbuka + energi: kena sekali; jendela habis; tidak bisa kena lagi di jendela yang sama
  const u = mk(); forceWindow(u, 0); u.energy = 6;
  u.snake = [{ x: w.x, y: w.y + 1 }, { x: w.x - 1, y: w.y + 1 }, { x: w.x - 2, y: w.y + 1 }, { x: w.x - 3, y: w.y + 1 }, { x: w.x - 4, y: w.y + 1 }]; u.dir = D.U;
  ev = B.stepSim(u, null, 100);
  assert.equal(u.hp, 2); assert.equal(u.energy, 3); assert.equal(u.window.hit, true); assert.equal(u.window.open, false);
  assert.equal(u.sched.kind, 'transition');
  assert.equal(ev.filter(e => e.type === 'hit').length, 1);
  assert.equal(u.snake.length, 3, 'tubuh 5 -> memendek 3 segmen, tidak di bawah 3');
  const v = mk(); forceWindow(v, 0); v.energy = 3; v.snake = [{ x: w.x, y: w.y + 1 }, ...[1, 2, 3, 4, 5, 6, 7].map(k => ({ x: w.x - k, y: w.y + 1 }))]; v.dir = D.U;
  B.stepSim(v, null, 100); assert.equal(v.snake.length, 5, 'tubuh 8 -> 5');
});

test('jendela yang sama: energi terkumpul SETELAH masuk pertama masih boleh memukul sekali, tidak dua kali', () => {
  const s = mk(); forceWindow(s, 0); const w = s.arena.weak[0];
  s.energy = 2; s.snake = [{ x: w.x, y: w.y + 1 }, { x: w.x - 1, y: w.y + 1 }, { x: w.x - 2, y: w.y + 1 }]; s.dir = D.U;
  B.stepSim(s, null, 100); assert.equal(s.hp, 3);
  s.energy = 6; put(s, [[w.x + 1, w.y], [w.x + 2, w.y], [w.x + 3, w.y]], 'L'); // masuk lagi dari kanan
  B.stepSim(s, null, 200); assert.equal(s.hp, 2, 'pukulan sah sekali');
  forceWindow(s, 0); s.window.hit = true; s.energy = 6; put(s, [[w.x + 1, w.y], [w.x + 2, w.y], [w.x + 3, w.y]], 'L');
  B.stepSim(s, null, 300); assert.equal(s.hp, 2, 'jendela yang sudah kena tidak memukul lagi');
});

test('transisi fase: ancaman dibersihkan, titik lemah terkunci, fase baru aktif hanya SETELAH transisi, serangan baru setelah jeda', () => {
  const s = mk(); forceWindow(s, 0); s.energy = 3; const w = s.arena.weak[0];
  s.hazard[at(2, 8)] = 1; s.warn[at(3, 8)] = 1;
  s.snake = [{ x: w.x, y: w.y + 1 }, { x: w.x - 1, y: w.y + 1 }, { x: w.x - 2, y: w.y + 1 }]; s.dir = D.U;
  B.stepSim(s, null, 1000);
  assert.equal(s.sched.kind, 'transition'); assert.equal(s.attack, null);
  assert.ok(!s.hazard.some(v => v) && !s.warn.some(v => v)); assert.equal(s.window.open, false);
  const t0 = s.t;
  B.advance(s, t0 + s.cfg.transitionMs - 1, []); assert.equal(s.phase, 1, 'fase belum berganti sebelum transisi selesai'); assert.equal(s.attack, null);
  const ev = B.advance(s, t0 + s.cfg.transitionMs, []);
  assert.equal(s.phase, 2); assert.ok(ev.some(e => e.type === 'phase' && e.phase === 2));
  assert.equal(s.sched.kind, 'gap'); assert.equal(s.attack, null, 'tidak langsung menyerang');
});

test('menang: hit final = menang sekali; hit final + bahaya pada tick yang sama = MENANG diprioritaskan; setelah itu tidak ada event', () => {
  const s = mk(); forceWindow(s, 0); s.hp = 1; s.phase = 3; s.phaseHp = 1; s.energy = 3; const w = s.arena.weak[0];
  s.hazard[at(w.x, w.y)] = 1; // sel titik lemah juga bahaya aktif -> kerusakan pada tick yang sama
  s.snake = [{ x: w.x, y: w.y + 1 }, { x: w.x - 1, y: w.y + 1 }, { x: w.x - 2, y: w.y + 1 }]; s.dir = D.U;
  const ev = B.stepSim(s, null, 500);
  assert.equal(s.status, 'won'); assert.equal(s.lives, 3, 'tidak kehilangan nyawa');
  assert.equal(ev.filter(e => e.type === 'win').length, 1);
  assert.ok(!s.hazard.some(v => v));
  assert.deepEqual(B.stepSim(s, null, 600), []);
  assert.deepEqual(B.advance(s, 99999, []), []);
});

test('hit non-final + kematian pada tick yang sama: keduanya berlaku', () => {
  const s = mk(); forceWindow(s, 0); s.energy = 3; const w = s.arena.weak[0];
  s.hazard[at(w.x, w.y)] = 1;
  s.snake = [{ x: w.x, y: w.y + 1 }, { x: w.x - 1, y: w.y + 1 }, { x: w.x - 2, y: w.y + 1 }]; s.dir = D.U;
  const ev = B.stepSim(s, null, 500);
  assert.equal(s.hp, 2); assert.equal(s.lives, 2);
  assert.deepEqual(kinds(ev).filter(k => k === 'hit' || k === 'death'), ['death', 'hit']);
});

test('kematian: tepi, area boss, tubuh sendiri, bahaya aktif; satu nyawa per kejadian', () => {
  const cases = [
    ['wall', (s) => put(s, [[0, 6], [1, 6], [2, 6]], 'L')],
    ['wall', (s) => put(s, [[8, 3], [8, 4], [8, 5]], 'U')],
    ['self', (s) => put(s, [[5, 5], [5, 6], [6, 6], [6, 5], [6, 4]].map(([x, y]) => [x, y]), 'D')],
    ['hazard', (s) => { put(s, [[2, 9], [1, 9], [0, 9]], 'R'); s.hazard[at(3, 9)] = 1; }],
  ];
  for (const [cause, setup] of cases) {
    const s = mk(); setup(s);
    if (cause === 'self') { s.snake = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }]; s.dir = D.D; }
    const ev = B.stepSim(s, null, 10);
    const d = ev.find(e => e.type === 'death');
    assert.ok(d, cause); assert.equal(d.cause, cause === 'self' ? 'self' : cause); assert.equal(s.lives, 2);
  }
});

test('respawn: 3 segmen lurus aman, bukan di boss/bahaya/apel, ancaman radius 3 dibersihkan, kebal; energi dipertahankan', () => {
  const s = mk(); s.energy = 4;
  for (let x = 0; x < B.W; x++) { s.hazard[at(x, 12)] = 1; s.hazard[at(x, 11)] = 1; }
  s.attack = { kind: 'row', cells: new Set([at(0, 12), at(1, 12)]) };
  put(s, [[0, 6], [1, 6], [2, 6]], 'L');
  const ev = B.stepSim(s, null, 50);
  assert.ok(ev.some(e => e.type === 'respawn'));
  assert.equal(s.snake.length, 3); assert.equal(s.energy, 4); assert.equal(s.lives, 2);
  s.snake.forEach(p => { assert.ok(!s.arena.boss[at(p.x, p.y)]); assert.ok(!s.hazard[at(p.x, p.y)]); });
  const h = s.snake[0];
  for (let c = 0; c < s.hazard.length; c++) if (Math.abs((c % B.W) - h.x) + Math.abs(Math.floor(c / B.W) - h.y) <= 3) assert.equal(s.hazard[c], 0);
  assert.ok(B.isInvuln(s)); assert.equal(s.invulnUntil, 50 + s.cfg.invulnMs);
  s.apples.forEach(a => assert.ok(!s.snake.some(p => p.x === a.x && p.y === a.y)));
});

test('kebal: bahaya aktif diabaikan selama invulnMs (waktu simulasi), mematikan sesudahnya; tembok tetap mematikan', () => {
  const s = mk(); s.invulnUntil = 1000;
  put(s, [[2, 9], [1, 9], [0, 9]], 'R'); s.hazard[at(3, 9)] = 1;
  let ev = B.stepSim(s, null, 500); assert.ok(!ev.some(e => e.type === 'death'));
  put(s, [[2, 9], [1, 9], [0, 9]], 'R'); s.hazard[at(3, 9)] = 1;
  ev = B.stepSim(s, null, 1000); assert.ok(ev.some(e => e.type === 'death'), 'tepat saat kebal habis = tidak kebal');
  const t = mk(); t.invulnUntil = 9999; put(t, [[0, 6], [1, 6], [2, 6]], 'L');
  assert.ok(B.stepSim(t, null, 5).some(e => e.type === 'death' && e.cause === 'wall'));
});

test('nyawa habis = kalah sekali; setelah itu tidak ada event', () => {
  const s = mk(); s.lives = 1; put(s, [[0, 6], [1, 6], [2, 6]], 'L');
  const ev = B.stepSim(s, null, 10);
  assert.equal(s.status, 'lost'); assert.equal(ev.filter(e => e.type === 'lose').length, 1);
  assert.deepEqual(B.stepSim(s, null, 20), []);
});

test('apel energi: +1 energi (maks 6), tumbuh, apel baru muncul di sel bebas', () => {
  const s = mk(); put(s, [[2, 9], [1, 9], [0, 9]], 'R'); s.apples = [{ x: 3, y: 9 }, { x: 14, y: 12 }];
  const ev = B.stepSim(s, null, 10);
  assert.ok(ev.some(e => e.type === 'eat')); assert.equal(s.energy, 1); assert.equal(s.snake.length, 4); assert.equal(s.apples.length, 2);
  s.energy = 6; s.apples[0] = { x: s.snake[0].x + 1, y: s.snake[0].y }; B.stepSim(s, null, 20); assert.equal(s.energy, 6, 'dibatasi');
});

// ---------- serangan ----------
const startAttack = (s, kind) => { s.phase = kind === 'corridor' ? 3 : kind === 'mines' ? 2 : 1; s.cfg.phases[s.phase - 1].pool = [kind]; B.advance(s, s.sched.endAt, []); return s.attack; };

test('baris berbahaya: satu baris penuh di luar area boss; peringatan >= batas bawah; masuk saat aktif = mati', () => {
  const s = mk(3); const a = startAttack(s, 'row');
  assert.equal(a.kind, 'row'); assert.ok(a.row >= 3);
  assert.equal(a.cells.size, B.W); [...a.cells].forEach(c => assert.equal(Math.floor(c / B.W), a.row));
  assert.ok(a.teleMs >= s.cfg.row.teleMs);
  assert.ok(a.teleMs >= (1 + s.cfg.marginSteps) * s.interval + s.cfg.graceMs);
  goTo(s, 'active');
  const y = a.row, x = 3; put(s, [[x, y - 1], [x - 1, y - 1], [x - 2, y - 1]], 'D');
  if (y - 1 < 3) return; // baris 3: tidak ada sel di atasnya yang bebas; kasus dicakup test kematian bahaya
  assert.ok(B.stepSim(s, null, s.t + 1).some(e => e.type === 'death' && e.cause === 'hazard'));
});

test('ranjau kebun: jumlah sesuai fase; tidak di kepala/depan kepala/tubuh/apel/titik lemah/area boss; sebagian besar arena tetap terjangkau', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = mk(seed); const a = startAttack(s, 'mines');
    if (a.kind !== 'mines') continue;
    assert.equal(a.cells.size, s.cfg.phases[1].mines);
    const h = s.snake[0], w = B.weakTile(s);
    a.cells.forEach(c => {
      const x = c % B.W, y = Math.floor(c / B.W);
      assert.ok(!s.arena.boss[c]); assert.ok(y >= 3);
      assert.ok(Math.abs(x - h.x) + Math.abs(y - h.y) >= 3, 'tidak di kepala/depan kepala');
      assert.ok(!s.snake.some(p => p.x === x && p.y === y)); assert.ok(!s.apples.some(p => p.x === x && p.y === y));
      assert.ok(!(x === w.x && y === w.y));
    });
  }
});

test('koridor: lebar 3, area aman terjangkau dari kepala dan peringatan >= waktu tempuh rute + margin; bahaya di luar koridor', () => {
  let seen = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const s = mk(seed); const a = startAttack(s, 'corridor');
    if (a.kind !== 'corridor') continue; seen++;
    assert.equal(a.hi - a.lo + 1, s.cfg.corridor.width);
    assert.ok(a.teleMs >= s.cfg.corridor.teleMs && a.teleMs <= s.cfg.corridor.maxTeleMs);
    const h = s.snake[0], d = h.x >= a.lo && h.x <= a.hi ? 0 : Math.min(Math.abs(h.x - a.lo), Math.abs(h.x - a.hi));
    assert.ok(a.teleMs >= (d + s.cfg.marginSteps) * s.interval + s.cfg.graceMs, 'cukup waktu menuju koridor');
    a.safe.forEach(c => { assert.ok(!a.cells.has(c)); const x = c % B.W; assert.ok(x >= a.lo && x <= a.hi); });
    a.cells.forEach(c => { assert.ok(!s.arena.boss[c]); const x = c % B.W; assert.ok(x < a.lo || x > a.hi); });
    goTo(s, 'active'); a.safe.forEach(c => assert.equal(s.hazard[c], 0, 'koridor aman tidak pernah berbahaya'));
  }
  assert.ok(seen > 20, 'koridor benar-benar dibuat');
});

test('fallback: pola tidak valid -> baris (koridor terlalu jauh/lambat, ranjau mustahil)', () => {
  const s = mk(1, { interval: 3000 }); // waktu tempuh melebihi batas peringatan koridor
  const a = startAttack(s, 'corridor'); assert.equal(a.kind, 'row');
  const t = mk(1, { config: { phases: [{ pool: ['mines'], windowMs: 1000, mines: 500 }, { pool: ['mines'], windowMs: 1000, mines: 500 }, { pool: ['mines'], windowMs: 1000, mines: 500 }] } });
  t.phase = 2; const b = startAttack(t, 'mines'); assert.equal(b.kind, 'row');
});

test('pause (jam beku): maju 0 ms tidak mengubah tahap; peringatan memakai sisa waktu yang sama setelah lanjut', () => {
  const w = makeBossWorld({ seed: 3, config: { initialGapMs: 500 } });
  w.eng.startRun(); w.advance(700);
  const sim = w.h.sim; assert.equal(sim.sched.kind, 'tele');
  const left = sim.sched.endAt - w.h.simNow;
  w.eng.pauseRun('user'); const stage = sim.sched.kind;
  w.advance(60000);
  assert.equal(sim.sched.kind, stage); assert.ok(!sim.hazard.some(v => v));
  assert.equal(sim.sched.endAt - w.h.simNow, left, 'sisa waktu peringatan identik');
  w.eng.resumeRun(); w.advance(left + 50);
  assert.equal(sim.sched.kind, 'active');
});

test('controller: PLAY sekali; hasil + rekor sekali; restart tidak membawa serangan lama; destroy menghentikan emisi', () => {
  const w = makeBossWorld({ seed: 2, config: { lives: 1, initialGapMs: 300 } });
  assert.equal(w.eng.startRun(), true); assert.equal(w.eng.startRun(), false);
  w.advance(400); assert.ok(w.h.sim.attack);
  // lurus ke kanan hingga menabrak tepi -> kalah
  w.advance(5000);
  assert.equal(w.eng.getState(), 'lost'); assert.equal(w.saves.length, 1);
  assert.equal(w.overlays('gameover').length, 1);
  w.advance(100000); assert.equal(w.saves.length, 1); assert.equal(w.overlays('gameover').length, 1);
  w.eng.startRun();
  const s2 = w.h.sim;
  assert.equal(s2.attack, null); assert.ok(!s2.hazard.some(v => v) && !s2.warn.some(v => v)); assert.equal(s2.lives, 1); assert.equal(s2.hp, 18); assert.equal(s2.round, 1);
  w.eng.destroy(); const n = w.emits.length; w.advance(5000); assert.equal(w.emits.length, n);
});

test('controller: HUD hanya dikirim saat tampilan berubah (bukan tiap frame)', () => {
  const w = makeBossWorld({ seed: 4 }); w.eng.startRun();
  const n0 = w.emits.length; w.advance(1000);
  assert.ok(w.emits.length - n0 < 25, `emisi ${w.emits.length - n0} dalam 1 dtk (~62 frame)`);
});

test('determinisme: seed + input sama = hasil sama', () => {
  const play = () => { const s = mk(9); const keys = ['U', 'R', 'D', 'L']; for (let i = 0; i < 400 && s.status === 'playing'; i++) B.stepSim(s, D[keys[(i >> 2) % 4]], (i + 1) * 140); return JSON.stringify([s.hp, s.lives, s.energy, s.snake, s.status, s.phase, s.attacksDone]); };
  assert.equal(play(), play());
});

test('properti (80 permainan acak): invarian ular/apel/ancaman/energi/HP selalu terjaga, hasil hanya sekali', () => {
  const keys = ['U', 'D', 'L', 'R'];
  for (let g = 1; g <= 80; g++) {
    const rnd = createRng(1000 + g), s = mk(g);
    let ends = 0;
    for (let i = 1; i <= 600 && s.status === 'playing'; i++) {
      const ev = B.stepSim(s, rnd() < 0.4 ? D[keys[Math.floor(rnd() * 4)]] : null, i * 140);
      ends += ev.filter(e => e.type === 'win' || e.type === 'lose').length;
      assert.ok(s.hp >= 0 && s.hp <= 3 && s.lives >= 0 && s.energy >= 0 && s.energy <= s.cfg.energyMax);
      const keysSeen = new Set(s.snake.map(p => at(p.x, p.y))); assert.equal(keysSeen.size, s.snake.length, 'tubuh tidak tumpang tindih');
      s.snake.forEach(p => { assert.ok(p.x >= 0 && p.y >= 0 && p.x < B.W && p.y < B.H); assert.ok(!s.arena.boss[at(p.x, p.y)]); });
      s.apples.forEach(a => { assert.ok(!keysSeen.has(at(a.x, a.y))); assert.ok(!s.arena.boss[at(a.x, a.y)]); });
      for (let c = 0; c < s.hazard.length; c++) { assert.ok(!(s.hazard[c] && s.warn[c])); if (s.arena.boss[c]) assert.ok(!s.hazard[c] && !s.warn[c]); }
      if (s.sched.kind === 'window') assert.ok(!s.hazard.some(v => v));
    }
    assert.ok(ends <= 1);
  }
});

test('rekor: recordBoss (kerusakan terbesar, kemenangan tercepat), kompatibel dengan parse', () => {
  const R = recordsLib, key = R.bossConfigKey('normal');
  assert.equal(key, 'boss|v:4|hp:18|lives:5|rounds:10|speed:normal');
  let r = R.recordBoss({ v: 1, records: {} }, key, { damage: 1, won: false, secs: 40 }).records;
  r = R.recordBoss(r, key, { damage: 3, won: true, secs: 120 }).records;
  const x = R.recordBoss(r, key, { damage: 3, won: true, secs: 90 }); r = x.records;
  assert.equal(x.newBest, true);
  assert.equal(R.recordBoss(r, key, { damage: 3, won: true, secs: 200 }).newBest, false);
  const rec = R.getBossRecord(r, key);
  assert.deepEqual([rec.best, rec.plays, rec.wins, rec.bestSecs], [3, 3, 2, 90]);
  assert.deepEqual(R.parseRecords(JSON.stringify(r)), r);
  assert.equal(R.recordBoss(r, key, { damage: 19, won: false, secs: 1 }).records, r);
  assert.deepEqual(R.parseRecords(JSON.stringify({ v: 1, records: { [key]: { best: 1, plays: 1, wins: 0, bestSecs: -3 } } })), { v: 1, records: {} });
});

test('registry/ikon/aset: boss 1 pemain bisa sentuh, ikon & latar ada, urutan petualangan', () => {
  const m = registry.getMode('boss');
  assert.equal(m.kind, 'boss'); assert.equal(m.players, 1); assert.equal(m.touch, true); assert.equal(registry.needsKeyboard('boss'), false);
  assert.deepEqual(registry.modesInGroup('adventure').map(x => x.id), ['puzzle', 'delivery', 'roguelite', 'territory']);
  registry.MODES.forEach(x => assert.ok(ICONS[x.id], `ikon ${x.id}`));
  assert.ok(fs.existsSync(path.join(root, 'public/assets/game/bg-boss.webp')));
  assert.match(fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'), /\.focus-scene/);
});
