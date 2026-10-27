import test from 'node:test';
import assert from 'node:assert/strict';
import { rogueUp as U, rogueSim as S, createRng, makeRogueWorld, recordsLib, grid } from './helpers/env.mjs';

const counts = (o = {}) => ({ ...U.emptyCounts(), ...o });
const cfgNorm = S.DEFAULT_CFG;
const { stepRound } = S;

// ---------- data & stacking ----------
test('upgrade: tepat enam, tiap upgrade punya manfaat DAN konsekuensi tertulis, max tingkat, ikon', () => {
  assert.deepEqual(U.UPGRADE_IDS, ['compact', 'brave', 'thick', 'antidote', 'sweet', 'breath']);
  U.UPGRADES.forEach(u => { assert.ok(u.name && u.benefit.length > 8 && u.cost.length > 8 && u.max >= 1 && u.icon, u.id); });
});

test('stacking: aditif untuk hitungan, multiplikatif untuk pengali — nilai pasti untuk tingkat 0/1/2', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  let s = U.deriveStats(counts());
  assert.deepEqual([s.startLen, s.normalMult, s.bigMult, s.scoreMult, s.intervalMult, s.shield, s.neutral, s.bigWeightMult, s.bombExtra, s.harmProb, s.durMult], [5, 1, 1, 1, 1, 0, 0, 1, 0, 0.5, 1]);
  s = U.deriveStats(counts({ compact: 1 })); assert.equal(s.startLen, 4); near(s.normalMult, 0.8);
  s = U.deriveStats(counts({ compact: 2 })); assert.equal(s.startLen, 3); near(s.normalMult, 0.64);
  s = U.deriveStats(counts({ brave: 2 })); near(s.scoreMult, 1.5625); near(s.intervalMult, 0.81);
  s = U.deriveStats(counts({ thick: 2 })); assert.equal(s.shield, 2); near(s.scoreMult, 0.7225);
  s = U.deriveStats(counts({ brave: 1, thick: 1 })); near(s.scoreMult, 1.25 * 0.85, 'multiplikatif antar upgrade');
  s = U.deriveStats(counts({ antidote: 2 })); assert.equal(s.neutral, 2); near(s.bigMult, 0.64);
  s = U.deriveStats(counts({ sweet: 2 })); near(s.bigWeightMult, 2.25); assert.equal(s.bombExtra, 4); near(s.harmProb, 0.8);
  s = U.deriveStats(counts({ breath: 2 })); near(s.durMult, 1.96);
});

test('urutan kalkulasi nilai apel: dasar -> pengali jenis -> pengali global -> Skor Ganda -> round -> clamp >= 1', () => {
  const st = (o) => U.deriveStats(counts(o)), dbl = [{ type: 'double' }];
  assert.equal(U.appleValue('normal', st({}), []), 4);
  assert.equal(U.appleValue('big', st({}), []), 10);
  assert.equal(U.appleValue('lucky', st({}), []), 4);
  assert.equal(U.appleValue('poison', st({ brave: 2 }), []), -6, 'racun tidak diskalakan');
  assert.equal(U.appleValue('normal', st({ compact: 1 }), []), Math.round(4 * 0.8)); // 3
  assert.equal(U.appleValue('big', st({ antidote: 1 }), []), 8);
  assert.equal(U.appleValue('normal', st({ brave: 1 }), []), 5);
  assert.equal(U.appleValue('normal', st({ brave: 1 }), dbl), 10, 'Skor Ganda dikalikan SETELAH pengali global, sebelum pembulatan');
  assert.equal(U.appleValue('normal', st({ compact: 1, brave: 1 }), dbl), Math.round(4 * 0.8 * 1.25 * 2));
  assert.equal(U.appleValue('big', st({ thick: 2, antidote: 2 }), []), Math.round(10 * 0.64 * 0.7225));
  for (const o of [{}, { compact: 2 }, { thick: 2 }, { compact: 2, antidote: 2, thick: 2 }]) ['normal', 'big', 'lucky'].forEach(k => assert.ok(U.appleValue(k, st(o), []) >= 1));
});

test('clamp: interval dalam [70,300]; durasi efek <= 20 dtk; panjang awal >= 3', () => {
  const brave2 = U.deriveStats(counts({ brave: 2 }));
  assert.equal(U.intervalFor(100, brave2, []), 81);
  assert.equal(U.intervalFor(100, brave2, [{ type: 'rush' }]), U.MIN_INTERVAL, 'batas minimum aman 70 ms');
  assert.equal(U.intervalFor(180, U.deriveStats(counts()), [{ type: 'slow' }]), 270);
  assert.equal(U.intervalFor(200, U.deriveStats(counts()), [{ type: 'slow' }, { type: 'slow' }]), U.MAX_INTERVAL);
  assert.equal(U.effectDuration('slow', U.deriveStats(counts({ breath: 2 }))), 11760);
  assert.ok(U.effectDuration('rush', { durMult: 99 }) <= U.MAX_EFFECT_MS);
  assert.equal(U.deriveStats(counts({ compact: 99 })).startLen, 3);
  assert.ok(U.deriveStats(counts({ sweet: 99 })).harmProb <= 0.8);
});

// ---------- penawaran & kombinasi terlarang ----------
test('kombinasi terlarang: upgrade yang membuat apel normal < 3 poin TIDAK ditawarkan (properti atas semua build yang bisa terbentuk)', () => {
  assert.equal(U.canOffer(counts({ compact: 2 }), 'thick'), false, 'Tubuh ringkas x2 + Kulit tebal = apel normal 2 poin');
  assert.equal(U.canOffer(counts({ compact: 1 }), 'thick'), true);
  assert.equal(U.canOffer(counts({ compact: 2 }), 'compact'), false, 'sudah max');
  // eksplorasi menyeluruh: semua deret pilihan sah hingga 4 pengambilan (urutan apa pun)
  let builds = 0, minVal = 99;
  (function dfs(c, depth) {
    minVal = Math.min(minVal, U.normalValue(U.deriveStats(c))); builds++;
    if (depth === 4) return;
    U.UPGRADE_IDS.forEach(id => { if (U.canOffer(c, id)) dfs({ ...c, [id]: c[id] + 1 }, depth + 1); });
  })(counts(), 0);
  assert.ok(builds > 100); assert.ok(minVal >= U.MIN_NORMAL_VALUE, 'nilai apel normal minimum = ' + minVal);
});

test('penawaran: 3 pilihan berbeda, tidak ada duplikat/capped, deterministik per seed, bisa < 3 bila pool kurang, kosong bila habis', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const c = counts({ compact: seed % 3, brave: (seed >> 1) % 3, antidote: (seed >> 2) % 3 });
    const o = U.offerUpgrades(c, createRng(seed), 3);
    assert.equal(new Set(o).size, o.length, 'tanpa duplikat');
    o.forEach(id => assert.ok(U.canOffer(c, id), `${id} boleh ditawarkan`));
    assert.deepEqual(o, U.offerUpgrades(c, createRng(seed), 3), 'seed sama = tawaran sama');
  }
  assert.equal(U.offerUpgrades(counts(), createRng(1), 3).length, 3);
  const nearFull = counts({ compact: 2, brave: 2, thick: 0, antidote: 2, sweet: 2, breath: 2 });
  assert.deepEqual(U.offerUpgrades(nearFull, createRng(5), 3), ['thick'].filter(id => U.canOffer(nearFull, id)), 'pool kurang dari 3: tampilkan yang ada');
  const full = counts(Object.fromEntries(U.UPGRADE_IDS.map(id => [id, 2])));
  assert.deepEqual(U.offerUpgrades(full, createRng(1), 3), []);
  const seen = new Set(); for (let s = 1; s <= 60; s++) U.offerUpgrades(counts(), createRng(s), 3).forEach(id => seen.add(id));
  assert.equal(seen.size, 6, 'semua upgrade bisa muncul');
});

// ---------- simulasi ronde ----------
const mkRound = (c = {}, round = 1, seed = 1) => S.createRound({ cfg: cfgNorm, stats: U.deriveStats(counts(c)), round, rng: createRng(seed) });
const nextCell = (s, k) => ({ x: s.snake[0].x + S.DIRS[k].x, y: s.snake[0].y + S.DIRS[k].y });

test('ronde: panjang awal = stats.startLen; arena valid (ranjau jauh dari kepala, tidak menimpa ular/makanan, lajur depan kepala bebas) — 200 seed', () => {
  for (let seed = 1; seed <= 200; seed++) for (const [c, r] of [[{}, 1], [{ compact: 2 }, 3], [{ sweet: 2 }, 5]]) {
    const s = mkRound(c, r, seed);
    assert.equal(s.snake.length, U.deriveStats(counts(c)).startLen);
    assert.equal(s.bombs.length, Math.min(U.MAX_BOMBS, cfgNorm.baseBombs[r - 1] + 2 * (c.sweet || 0)));
    assert.equal(s.foods.length, cfgNorm.foodCount);
    const all = [...s.snake, ...s.foods, ...s.bombs].map(p => p.x + ',' + p.y);
    assert.equal(new Set(all).size, all.length, 'tidak ada sel dipakai dua kali');
    s.bombs.forEach(b => { assert.ok(Math.abs(b.x - s.snake[0].x) + Math.abs(b.y - s.snake[0].y) >= cfgNorm.minBombDist); assert.ok(!(b.y === s.snake[0].y && b.x > s.snake[0].x)); });
    assert.equal(s.target, cfgNorm.targets[r - 1]); assert.deepEqual(s.effects, []);
  }
});

test('makan: nilai apel sesuai rumus, ular tumbuh 1; apel pengganti muncul di sel bebas', () => {
  const s = mkRound({ brave: 1 }); s.bombs = []; s.foods = [{ x: 9, y: 7, kind: 'normal' }];
  const len = s.snake.length;
  const ev = stepRound(s, 'R', 100);
  assert.equal(s.roundScore, 5); assert.equal(s.snake.length, len + 1); assert.equal(ev[0].type, 'eat');
  assert.equal(s.foods.length, 1); assert.ok(!s.snake.some(p => p.x === s.foods[0].x && p.y === s.foods[0].y));
});

test('racun: −6 dan ekor −2 (tidak di bawah panjang minimum), skor tidak negatif; Racikan penawar menetralkan N racun pertama per ronde', () => {
  const p = mkRound(); p.bombs = []; p.foods = [{ x: 9, y: 7, kind: 'poison' }]; p.roundScore = 3;
  const len = p.snake.length; stepRound(p, 'R', 100);
  assert.equal(p.roundScore, 0, 'tidak negatif'); assert.equal(p.snake.length, len - 2);
  const short = mkRound({ compact: 2 }); short.bombs = []; short.foods = [{ x: 9, y: 7, kind: 'poison' }]; stepRound(short, 'R', 100);
  assert.ok(short.snake.length >= cfgNorm.minLen);
  const a = mkRound({ antidote: 2 }); a.bombs = []; a.score = 0; a.roundScore = 10;
  a.foods = [{ x: 9, y: 7, kind: 'poison' }]; stepRound(a, 'R', 100);
  assert.equal(a.roundScore, 10, 'racun pertama dinetralkan'); assert.equal(a.neutral, 1);
  a.foods = [{ x: 10, y: 7, kind: 'poison' }]; stepRound(a, 'R', 200); assert.equal(a.neutral, 0); assert.equal(a.roundScore, 10);
  a.foods = [{ x: 11, y: 7, kind: 'poison' }]; stepRound(a, 'R', 300); assert.equal(a.roundScore, 4, 'racun ketiga berlaku');
});

test('efek: apel keberuntungan memicu efek; Skor Ganda ×2; Napas panjang memperpanjang efek; peluang merugikan naik dengan Bekal manis', () => {
  const s = mkRound({ breath: 1 }); s.bombs = []; s.foods = [{ x: 9, y: 7, kind: 'lucky' }];
  const ev = stepRound(s, 'R', 1000);
  const e = ev.find(x => x.type === 'effect'); assert.ok(e);
  assert.equal(s.effects.length, 1); assert.equal(s.effects[0].endsAt, 1000 + 8400, '6000 × 1,4');
  const d = mkRound(); d.bombs = []; d.effects = [{ type: 'double', endsAt: 99999 }]; d.foods = [{ x: 9, y: 7, kind: 'normal' }];
  stepRound(d, 'R', 100); assert.equal(d.roundScore, 8);
  const harmFrac = (c) => { let h = 0, n = 2000; const st = U.deriveStats(counts(c)); const r = createRng(42); for (let i = 0; i < n; i++) if (!U.EFFECTS[U.rollEffect(st, r)].good) h++; return h / n; };
  const base = harmFrac({}), sweet = harmFrac({ sweet: 2 });
  assert.ok(Math.abs(base - 0.5) < 0.05, 'dasar ~50%: ' + base); assert.ok(sweet > 0.75, 'Bekal manis x2 ~80%: ' + sweet);
  // efek habis tepat saat endsAt dan tidak dibawa ke ronde baru
  const x = mkRound(); x.effects = [{ type: 'slow', endsAt: 500 }]; S.expireEffects(x, 499); assert.equal(x.effects.length, 1); S.expireEffects(x, 500); assert.equal(x.effects.length, 0);
  assert.deepEqual(mkRound({}, 2).effects, []);
});

test('tabrakan tanpa perisai: dinding, tubuh, dan ranjau mengakhiri ronde; sesudahnya tidak ada event', () => {
  const w = mkRound(); w.bombs = []; w.snake = [{ x: 16, y: 7 }, { x: 15, y: 7 }, { x: 14, y: 7 }]; w.dir = { x: 1, y: 0 };
  assert.equal(stepRound(w, 'R', 100)[0].cause, 'wall'); assert.equal(w.status, 'dead'); assert.deepEqual(stepRound(w, 'R', 200), []);
  const b = mkRound(); b.bombs = [{ x: 9, y: 7 }]; assert.equal(stepRound(b, 'R', 100)[0].cause, 'bomb'); assert.equal(b.status, 'dead');
  const t = mkRound(); t.bombs = []; t.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 }]; t.dir = { x: 0, y: -1 };
  assert.equal(stepRound(t, 'R', 100)[0].cause, 'body');
});

test('Kulit tebal: menahan 1 tabrakan per tingkat; dinding/tubuh -> belok aman (kepala tidak pernah di tembok/tubuh/ranjau); ranjau -> hancur dan lanjut', () => {
  const s = mkRound({ thick: 1 }); s.bombs = []; s.foods = []; s.snake = [{ x: 16, y: 7 }, { x: 15, y: 7 }, { x: 14, y: 7 }]; s.dir = { x: 1, y: 0 };
  const ev = stepRound(s, 'R', 100);
  assert.equal(s.status, 'playing'); assert.equal(s.shield, 0); assert.equal(ev[0].action, 'turn');
  const h = s.snake[0]; assert.ok(h.x >= 0 && h.x <= 16 && h.y >= 0 && h.y <= 14); assert.deepEqual(h, { x: 16, y: 6 }, 'kiri relatif arah timur = utara');
  assert.equal(stepRound(Object.assign(s, { snake: [{ x: 16, y: 6 }, { x: 15, y: 6 }, { x: 14, y: 6 }] }), 'U', 200).length >= 0, true);
  // tabrakan kedua pada ronde yang sama (perisai habis) = gagal
  const t = mkRound({ thick: 1 }); t.bombs = []; t.foods = []; t.snake = [{ x: 16, y: 0 }, { x: 15, y: 0 }, { x: 14, y: 0 }]; t.dir = { x: 1, y: 0 };
  stepRound(t, 'R', 100); assert.equal(t.status, 'playing');
  t.snake = [{ x: 0, y: 14 }, { x: 1, y: 14 }, { x: 2, y: 14 }]; t.dir = { x: -1, y: 0 };
  stepRound(t, 'L', 200); assert.equal(t.status, 'dead', 'perisai sudah terpakai');
  // ranjau: perisai habis, ranjau hancur, ular maju ke sel itu
  const bm = mkRound({ thick: 1 }); bm.foods = []; bm.bombs = [{ x: 9, y: 7 }];
  const e2 = stepRound(bm, 'R', 100);
  assert.equal(bm.status, 'playing'); assert.equal(bm.bombs.length, 0); assert.equal(e2[0].action, 'destroyed'); assert.deepEqual(bm.snake[0], { x: 9, y: 7 });
  // dua tingkat = dua tabrakan
  const two = mkRound({ thick: 2 }); two.bombs = []; two.foods = []; two.snake = [{ x: 16, y: 7 }, { x: 15, y: 7 }, { x: 14, y: 7 }]; two.dir = { x: 1, y: 0 };
  stepRound(two, 'R', 100); two.snake = [{ x: 16, y: 6 }, { x: 15, y: 6 }, { x: 14, y: 6 }]; two.dir = { x: 1, y: 0 };
  stepRound(two, 'R', 200); assert.equal(two.status, 'playing'); assert.equal(two.shield, 0);
});

test('Kulit tebal: buntu total -> relokasi ke garis lurus bebas; kepala tidak pernah di dalam tembok/tubuh/ranjau (properti, banyak situasi)', () => {
  // sudut kiri atas dikelilingi ranjau dan tubuh: tidak ada belokan aman
  const s = mkRound({ thick: 1 }); s.foods = [];
  s.snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]; s.dir = { x: -1, y: 0 };
  s.bombs = [{ x: 0, y: 1 }]; // belok kanan-relatif (selatan) = ranjau; belok kiri-relatif (utara) = dinding
  const ev = stepRound(s, 'L', 100);
  assert.equal(s.status, 'playing'); assert.equal(ev[0].action, 'relocate');
  const cells = s.snake.map(p => p.x + ',' + p.y); assert.equal(new Set(cells).size, cells.length);
  s.snake.forEach(p => { assert.ok(p.x >= 0 && p.x <= 16 && p.y >= 0 && p.y <= 14); assert.ok(!s.bombs.some(b => b.x === p.x && b.y === p.y)); assert.ok(!s.foods.some(f => f.x === p.x && f.y === p.y)); });
  const front = { x: s.snake[0].x + 1, y: s.snake[0].y }; assert.ok(front.x <= 16 && !s.bombs.some(b => b.x === front.x && b.y === front.y), 'sel depan kepala bebas');
  // properti: dari awal acak, dorong ke dinding dengan perisai max; kepala selalu valid sepanjang waktu selama status playing
  for (let seed = 1; seed <= 150; seed++) {
    const r = mkRound({ thick: 2 }, 1 + (seed % 5), seed); const rng = createRng(seed * 31);
    for (let i = 0; i < 400 && r.status === 'playing'; i++) {
      stepRound(r, 'UDLR'[Math.floor(rng() * 4)], i * 100);
      if (r.status !== 'playing') break;
      const h = r.snake[0]; assert.ok(h.x >= 0 && h.x <= 16 && h.y >= 0 && h.y <= 14, 'kepala di dalam arena');
      assert.ok(!r.bombs.some(b => b.x === h.x && b.y === h.y), 'kepala tidak di ranjau');
      assert.equal(new Set(r.snake.map(p => p.x + ',' + p.y)).size, r.snake.length, 'tidak ada segmen bertumpuk');
    }
  }
});

test('target ronde: status cleared tepat saat poin >= target, lalu simulasi berhenti', () => {
  const s = mkRound(); s.bombs = []; s.roundScore = s.target - 1; s.foods = [{ x: 9, y: 7, kind: 'normal' }];
  const ev = stepRound(s, 'R', 100);
  assert.equal(s.status, 'cleared'); assert.ok(ev.some(e => e.type === 'cleared'));
  const pos = JSON.stringify(s.snake); assert.deepEqual(stepRound(s, 'R', 200), []); assert.equal(JSON.stringify(s.snake), pos);
});


// Score-round math is retained as legacy utility coverage. The shipping continuous
// campaign controller, checkpoints and combat are covered by expedition.test.mjs.
