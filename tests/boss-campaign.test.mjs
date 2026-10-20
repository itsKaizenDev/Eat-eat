import test from 'node:test';
import assert from 'node:assert/strict';
import { bossSim as B, createRng, makeBossWorld, recordsLib as R } from './helpers/env.mjs';

const mk = (seed = 913897, config) => B.createState({ arena: B.parseArena(B.ARENA_MAP, B.START, B.WEAK_TILES), config, rng: createRng(seed), interval: 140, t: 0 });
const put = (s, x, y, dir = B.DIRS.U) => { s.snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }]; s.dir = dir; };
const boss = (phase = 1, seed) => { const s = mk(seed); s.round = 10; s.phase = phase; s.phaseHp = s.cfg.phases[phase - 1].hp; s.hp = s.cfg.phases.slice(phase - 1).reduce((n, p) => n + p.hp, 0); return s; };
const go = (s, kind) => { for (let n = 0; n < 30 && s.sched.kind !== kind; n++) B.advance(s, s.sched.endAt); assert.equal(s.sched.kind, kind); };
const open = (s, targets = [0]) => { s.window = { open: true, hit: false, targets, used: [] }; s.weakIdx = targets[0]; s.sched = { kind: 'window', endAt: s.t + 6000 }; s.attack = null; s.hazard.fill(0); s.warn.fill(0); };
const strike = (s, i = 0) => { const p = s.arena.weak[i]; put(s, p.x, p.y + 1); return B.stepSim(s, null, s.t + 1); };
const healValue = s => s.heals.reduce((n, h) => n + h.amount, s.pendingHeal);

test('default produksi: ronde 1, antek dahulu, boss 18 HP tersimpan, 5 hati, 3 apel, energi maks 9', () => {
  const s = mk();
  assert.deepEqual([s.round, s.minionsLeft, s.hp, s.phaseHp, s.lives, s.energy, s.apples.length, s.cfg.energyMax], [1, 1, 18, 3, 5, 0, 3, 9]);
  assert.equal(B.isBossRound(s), false); assert.equal(B.energyNeed(s), 1);
});

test('9 gelombang berurutan: 18 antek, boss hanya di ronde 10; hadiah pasti tidak berulang', () => {
  const s = mk(123456, { healDropChance: 0 });
  for (let round = 1; round <= 9; round++) {
    const count = Math.ceil(round / 3);
    assert.equal(s.round, round); assert.equal(s.minionsLeft, count); assert.equal(B.isBossRound(s), false);
    for (let n = count; n > 0; n--) {
      go(s, 'window'); s.energy = 1;
      const target = s.window.targets[0], ev = strike(s, target);
      assert.equal(ev.filter(e => e.type === 'minionHit').length, 1);
      assert.equal(s.minionsLeft, n - 1); assert.equal(s.hp, 18); assert.equal(s.energy, 0);
      assert.ok(!s.hazard.some(Boolean) && !s.warn.some(Boolean));
    }
    assert.equal(s.sched.kind, 'round'); assert.equal(healValue(s), round);
    const at = s.sched.endAt;
    B.advance(s, at - 1); assert.equal(s.round, round);
    const ev = B.advance(s, at); assert.equal(ev.filter(e => e.type === 'round').length, 1);
    assert.deepEqual(B.advance(s, at), []); assert.equal(healValue(s), round);
  }
  assert.equal(s.round, 10); assert.equal(s.minionsDefeated, 18); assert.equal(B.isBossRound(s), true); assert.equal(B.energyNeed(s), 3);
  assert.equal(s.phase, 1); assert.equal(s.heals.length, 3, 'hadiah digabung jika sudah ada 3 pickup');
  B.advance(s, s.t + 180000); assert.equal(s.round, 10); assert.equal(healValue(s), 9, 'menunggu bukan cara farming hati');
});

test('HP fase 3/5/10: pukulan biasa tidak mengganti fase, fase aktif sesudah transisi, final menang sekali', () => {
  const s = boss(); let hits = 0;
  for (let phase = 1; phase <= 3; phase++) {
    assert.equal(s.phase, phase); const hp = [3, 5, 10][phase - 1];
    assert.equal(s.phaseHp, hp);
    for (let n = hp; n > 0; n--) {
      open(s); s.energy = 3; const ev = strike(s); hits++;
      assert.equal(s.phaseHp, n - 1); assert.equal(s.hp, 18 - hits); assert.equal(s.damageDealt, hits);
      assert.equal(ev.filter(e => e.type === 'hit').length, 1);
      assert.equal(s.phase, phase, 'fase belum berubah saat pukulan masuk');
      if (n > 1) assert.equal(s.sched.kind, 'gap');
    }
    if (phase < 3) {
      assert.equal(s.sched.kind, 'transition'); const at = s.sched.endAt;
      B.advance(s, at - 1); assert.equal(s.phase, phase);
      B.advance(s, at); assert.equal(s.phase, phase + 1);
      assert.equal(healValue(s), phase * 2 + (phase === 2 ? 1 : 0)); assert.ok(!s.hazard.some(Boolean));
    }
  }
  assert.equal(s.status, 'won'); assert.equal(s.phase, 3); assert.equal(s.hp, 0);
  assert.deepEqual(B.advance(s, s.t + 99999), []); assert.deepEqual(B.stepSim(s, null, s.t + 100000), []);
});

test('fase 3: tiga target berbeda bisa dipukul dalam satu jendela, target sama tidak bisa difarm', () => {
  const s = boss(3); open(s, [0, 1, 2]); s.energy = 9;
  strike(s, 0); assert.equal(s.hp, 9); assert.equal(s.window.open, true);
  strike(s, 0); assert.equal(s.hp, 9); assert.equal(s.energy, 6);
  strike(s, 1); assert.equal(s.hp, 8); assert.equal(s.window.open, true);
  strike(s, 2); assert.equal(s.hp, 7); assert.equal(s.energy, 0); assert.equal(s.window.open, false);
  assert.equal(s.phase, 3); assert.equal(s.sched.kind, 'gap');
});

test('tiap fase menyediakan 1/2/3 celah, termasuk jika sebagian tertutup tubuh; bahaya selalu berhenti', () => {
  for (let phase = 1; phase <= 3; phase++) {
    const s = boss(phase); s.snake = [{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }];
    go(s, 'window'); assert.equal(s.window.targets.length, phase);
    assert.equal(new Set(s.window.targets).size, phase);
    assert.ok(!s.hazard.some(Boolean) && !s.warn.some(Boolean)); assert.equal(s.attack, null);
  }
});

test('cadence meningkat per fase untuk setiap pola; batas aman telegraph tetap, termasuk Santai', () => {
  for (const kind of ['row', 'mines', 'corridor']) {
    const durations = [];
    for (let phase = 1; phase <= 3; phase++) {
      const s = boss(phase, 5131); s.interval = 180; s.cfg.phases[phase - 1].pool = [kind];
      go(s, 'tele'); const a = s.attack, p = B.phaseRules(s);
      assert.equal(a.kind, kind); assert.ok(a.teleMs >= s.cfg[kind].teleMs);
      assert.equal(a.damage, phase === 3 ? 2 : 1);
      durations.push(p.gapMs + a.teleMs + a.activeMs + a.recMs + p.windowMs);
    }
    assert.ok(durations[0] > durations[1] && durations[1] > durations[2], `${kind}: ${durations}`);
  }
});

test('RNG: seed sama deterministik, seed berbeda mengubah varian/pola; tidak mengulang pola langsung', () => {
  const run = seed => { const s = boss(2, seed), seq = []; for (let n = 0; n < 30; n++) { go(s, 'tele'); seq.push(s.attack.kind); go(s, 'window'); B.advance(s, s.sched.endAt); } return { variant: s.variant.id, seq }; };
  assert.deepEqual(run(89191), run(89191)); assert.notDeepEqual(run(89191), run(38271));
  const variants = new Set();
  for (const seed of [99191, 219191, 391919, 491911, 782917, 1291917, 889191]) {
    const r = run(seed); variants.add(r.variant);
    r.seq.forEach((kind, i) => { if (i) assert.notEqual(kind, r.seq[i - 1]); });
  }
  assert.equal(variants.size, 3);
});

test('serangan berat −2 hati, collision −1, invuln mencegah double damage; hati tidak negatif', () => {
  const s = boss(3); go(s, 'active');
  const cell = [...s.attack.cells].find(c => c % B.W > 2 && Math.floor(c / B.W) > 3);
  const x = cell % B.W, y = Math.floor(cell / B.W);
  put(s, x, y + (y === 14 ? -1 : 1), y === 14 ? B.DIRS.D : B.DIRS.U);
  let ev = B.stepSim(s, null, s.t + 1); assert.equal(s.lives, 3); assert.equal(ev.find(e => e.type === 'death').damage, 2);
  put(s, 3, 9, B.DIRS.R); s.hazard[9 * B.W + 4] = 1;
  ev = B.stepSim(s, null, s.t + 1); assert.ok(!ev.some(e => e.type === 'death')); assert.equal(s.lives, 3);
  s.snake = [{ x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }]; s.dir = B.DIRS.L;
  B.stepSim(s, null, s.t + 1); assert.equal(s.lives, 2, 'tepi tetap −1 saat kebal');
  s.lives = 1; s.invulnUntil = 0; put(s, 3, 9, B.DIRS.R); s.hazard[9 * B.W + 4] = 1;
  B.stepSim(s, null, s.t + 1); assert.equal(s.lives, 0); assert.equal(s.status, 'lost');
});

test('heal dapat stack di atas hati awal; sekali ambil sekali heal, tidak menambah energi atau panjang', () => {
  const s = mk(); put(s, 3, 9, B.DIRS.R); s.heals = [{ x: 4, y: 9, amount: 4 }]; s.apples = [];
  const ev = B.stepSim(s, null, 1); assert.equal(s.lives, 9); assert.equal(s.energy, 0); assert.equal(s.snake.length, 3);
  assert.equal(ev.filter(e => e.type === 'heal').length, 1); assert.equal(s.heals.length, 0);
  put(s, 3, 9, B.DIRS.R); B.stepSim(s, null, 2); assert.equal(s.lives, 9);
});

test('drop RNG hanya saat antek kalah; posisi heal tidak di tubuh, apel, boss, atau titik lemah', () => {
  const s = mk(82192, { healDropChance: 1 }); s.round = 4; s.minionsLeft = 2; s.minionsTotal = 2;
  open(s); s.energy = 1; strike(s); assert.equal(healValue(s), 1);
  s.heals.forEach(h => { assert.ok(!s.arena.boss[h.y * B.W + h.x]); assert.ok(![...s.snake, ...s.apples, ...s.arena.weak].some(p => p.x === h.x && p.y === h.y)); });
  B.advance(s, s.t + 60000); assert.equal(healValue(s), 1);
});

test('pause membekukan transisi fase; restart/menu membersihkan ronde, heal, HP dan target', () => {
  const w = makeBossWorld(); w.eng.startRun(); const s = w.h.sim;
  s.round = 10; s.hp = 10; s.phaseHp = 1; s.energy = 3; open(s); const p = s.arena.weak[0]; put(s, p.x, p.y + 1);
  w.advance(150); assert.equal(s.sched.kind, 'transition');
  w.eng.pauseRun(); const left = s.sched.endAt - w.h.simNow; w.advance(30000);
  assert.equal(s.phase, 1); assert.equal(s.sched.endAt - w.h.simNow, left);
  w.eng.resumeRun(); w.advance(left + 1); assert.equal(s.phase, 2);
  w.eng.returnToMenu(); const fresh = w.h.sim;
  assert.equal(fresh.round, 1); assert.equal(fresh.hp, 18); assert.equal(fresh.lives, 5); assert.deepEqual(fresh.heals, []);
  assert.equal(fresh.window.open, false); assert.equal(fresh.attack, null);
});

test('controller: kemenangan 18 HP tersimpan sekali; rekor v1 utuh dan terpisah', () => {
  const old = 'boss|hp:3|lives:3|speed:normal';
  const records = R.recordBoss({ v: 1, records: {} }, old, { damage: 3, won: true, secs: 45 }).records;
  const w = makeBossWorld({ records }); w.eng.startRun(); const s = w.h.sim;
  s.round = 10; s.phase = 3; s.phaseHp = 1; s.hp = 1; s.damageDealt = 17; s.energy = 3; open(s); const p = s.arena.weak[0]; put(s, p.x, p.y + 1);
  w.advance(150); assert.equal(w.eng.getState(), 'won'); assert.equal(w.saves.length, 1);
  const rec = R.getBossRecord(w.saves[0], R.bossConfigKey('normal'));
  assert.equal(rec.best, 18); assert.equal(rec.bestRounds, 10); assert.equal(rec.wins, 1);
  assert.deepEqual(w.saves[0].records[old], records.records[old]);
  w.advance(5000); assert.equal(w.saves.length, 1);
});
