import test from 'node:test';
import assert from 'node:assert/strict';
import { revives as R, puzzle as P, progressLib as S, makeRogueWorld, makePuzzleWorld, bossSim as B, createRng, campaign } from './helpers/env.mjs';

function storage(fail = false) {
  const values = {};
  globalThis.localStorage = { getItem: k => values[k] || null, setItem: (k, v) => { if (fail) throw new Error('denied'); values[k] = v; } };
  return values;
}
const start = 1800000000000;
test('revive: tiga jatah persisten, batas keempat, reset tepat 72 jam tanpa menumpuk', async () => {
  const data = storage();
  assert.equal(R.loadRevives(start).left, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal((await R.consumeRevive(start + i * 5000)).ok, true);
    const loaded = R.parseRevives(data[R.REVIVE_KEY], start + i * 5000);
    assert.equal(loaded.left, 2 - i); assert.equal(loaded.resetAt, start + R.REVIVE_WINDOW_MS);
  }
  assert.equal((await R.consumeRevive(start + R.REVIVE_WINDOW_MS - 1)).ok, false);
  assert.equal(R.loadRevives(start + R.REVIVE_WINDOW_MS).left, 3);
  assert.equal((await R.consumeRevive(start + R.REVIVE_WINDOW_MS)).quota.left, 2);
  assert.equal(R.loadRevives(start + R.REVIVE_WINDOW_MS * 10).left, 3);
});

test('revive: data rusak dibatasi, storage ditolak tidak memberi revive, jam mundur tidak mereset', async () => {
  for (const bad of ['x', '{}', 'null', '{"v":1,"left":100}', '{"v":99}']) assert.equal(R.parseRevives(bad, start).left, 3);
  storage(true); assert.equal((await R.consumeRevive(start)).reason, 'storage');
  storage(); await R.consumeRevive(start);
  assert.equal(R.loadRevives(start - 86400000).left, 2);
  assert.equal((await R.consumeRevive(start - 86400000)).quota.resetAt, start + R.REVIVE_WINDOW_MS);
});

test('revive: Web Lock yang tersedia membungkus baca dan tulis jatah', async () => {
  storage(); let locks = 0;
  const old = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (key, fn) => { locks++; assert.equal(key, R.REVIVE_KEY); return fn(); } } } });
  try { await R.consumeRevive(start); assert.equal(locks, 1); assert.equal(R.loadRevives(start).left, 2); }
  finally { if (old) Object.defineProperty(globalThis, 'navigator', old); else delete globalThis.navigator; }
});

const kill = w => {
  w.x.sim.shield = 0; w.x.sim.reviveUntil = 0;
  w.x.setSnake([[16, 7], [15, 7], [14, 7]], 'R'); w.eng.setDir(1, 0); w.advance(200);
  assert.equal(w.eng.getState(), 'lost');
};
test('revive rute: lanjut skor/upgrade, menunggu arah, klik ganda hanya satu jatah, run tercatat sekali', async () => {
  storage();
  const w = makeRogueWorld({ wallNow: () => start }); w.eng.startRun();
  w.x.sim.roundScore = 12; w.x.run.upgrades.thick = 1;
  const foods = JSON.stringify(w.x.sim.foods), bombs = JSON.stringify(w.x.sim.bombs);
  kill(w);
  const first = w.eng.reviveRun(), duplicate = w.eng.reviveRun();
  assert.equal(w.eng.startRun(), false, 'retry saat penyimpanan masih berjalan ditolak');
  assert.equal(await duplicate, false); assert.equal(await first, true);
  assert.equal(R.loadRevives(start).left, 2);
  assert.equal(w.x.sim.roundScore, 12); assert.equal(w.x.run.upgrades.thick, 1);
  assert.equal(JSON.stringify(w.x.sim.foods), foods); assert.equal(JSON.stringify(w.x.sim.bombs), bombs);
  assert.equal(w.x.awaiting, true);
  const clock = w.x.simNow; w.advance(10000); assert.equal(w.x.simNow, clock);
  kill(w);
  const record = Object.values(w.x.records.records)[0]; assert.equal(record.plays, 1);
  w.eng.returnToMenu(); w.eng.startRun(); assert.equal(w.x.run.round, 1); assert.equal(R.loadRevives(start).left, 2);
  w.eng.destroy();
});

test('revive rute: habis dan kegagalan simpan tetap di layar kalah tanpa mengubah posisi', async () => {
  const w = makeRogueWorld({ reviveIO: { load: () => ({ left: 0, resetAt: start + 100 }), consume: async () => ({ ok: false, reason: 'empty', quota: { left: 0, resetAt: start + 100 } }) }, wallNow: () => start });
  w.eng.startRun(); kill(w); const before = JSON.stringify(w.x.sim.snake);
  assert.equal(await w.eng.reviveRun(), false); assert.equal(w.eng.getState(), 'lost');
  assert.equal(JSON.stringify(w.x.sim.snake), before);
  assert.match(w.last('rogueMenu').revive.error, /habis/);
  w.eng.destroy();
  storage(true); const x = makeRogueWorld({ wallNow: () => start }); x.eng.startRun(); kill(x);
  assert.equal(await x.eng.reviveRun(), false); assert.equal(x.eng.getState(), 'lost');
  assert.match(x.last('rogueMenu').revive.error, /gagal disimpan/); x.eng.destroy();
});

test('revive boss: HP/fase/shield/buff tetap, 3 hati dan aman; menang tidak bisa di-revive', () => {
  const s = B.createState({ arena: B.parseArena(B.ARENA_MAP, B.START, B.WEAK_TILES), rng: createRng(12) });
  Object.assign(s, { status: 'lost', lives: 0, round: 10, phase: 3, hp: 6, phaseHp: 6, shield: 40, energy: 5, damageStacks: 2 });
  s.shieldBursts = [{ nextAt: 5000, left: 2 }]; s.hazard.fill(1);
  assert.equal(B.reviveBattle(s, 1000), true);
  assert.deepEqual([s.round, s.phase, s.phaseHp, s.hp, s.shield, s.damageStacks, s.energy, s.lives], [10, 3, 6, 6, 40, 2, 5, 3]);
  assert.equal(s.invulnUntil, 4000); assert.equal(s.hazard.some(Boolean), false); assert.equal(s.shieldBursts[0].left, 2);
  const cells = new Set(s.snake.map(p => p.x + ',' + p.y));
  for (const p of [...s.apples, ...s.heals, ...s.damageOrbs]) assert.ok(!cells.has(p.x + ',' + p.y));
  s.status = 'won'; assert.equal(B.reviveBattle(s, 1001), false);
});

test('revive controller di kebun melanjutkan boss yang sama dan tetap membeku sampai arah pertama', async () => {
  storage(); const w = makeRogueWorld({ wallNow: () => start, config: { rounds: 1, targets: [4], baseBombs: [0] } });
  w.eng.startRun(); w.x.sim.foods = [{ x: 9, y: 7, kind: 'normal' }]; w.eng.setDir(1, 0); w.advance(150);
  w.eng.chooseUpgrade(w.last('roguelite').offer[0].id);
  const s = w.x.battle; Object.assign(s, { round: 10, phase: 3, hp: 6, phaseHp: 6, shield: 30, damageStacks: 2, lives: 1 });
  w.x.setSnake([[16, 7], [15, 7], [14, 7]], 'R'); w.eng.setDir(1, 0); w.advance(200);
  assert.equal(w.eng.getState(), 'lost'); assert.equal(await w.eng.reviveRun(), true);
  assert.deepEqual([w.x.battle.phase, w.x.battle.phaseHp, w.x.battle.shield, w.x.battle.damageStacks, w.x.battle.lives], [3, 6, 30, 2, 3]);
  const time = w.x.simNow; w.advance(20000); assert.equal(w.x.simNow, time); assert.equal(w.x.awaiting, true);
  w.eng.destroy();
});

test('koin: hadiah hanya selisih rekor koleksi, undo/replay tidak menggandakan, migrasi rekor tidak menghapus saldo', () => {
  let p = S.parseProgress(null);
  let r = S.recordPuzzleResult(p, 'jk-1', 12, 3, 2); p = r.progress;
  assert.equal(r.earned, 2); assert.equal(S.appleCoins(p), 2);
  r = S.recordPuzzleResult(p, 'jk-1', 11, 3, 2); assert.equal(r.earned, 0);
  r = S.recordPuzzleResult(r.progress, 'jk-1', 15, 3, 3); assert.equal(r.earned, 1);
  p = S.parseProgress(JSON.stringify(r.progress)); assert.equal(S.appleCoins(p), 3);
  r = S.recordPuzzleResult(p, 'jk-1', 19, 4, 1); assert.equal(r.earned, 0); assert.equal(S.appleCoins(r.progress), 3);
});

const coinLevel = () => P.buildLevel({ id: 'coin', name: 'Koin', par: 4, map: ['########', '#.FK.E.#', '########'], snake: [[1, 1]], dir: 'R', exit: { keys: 1, plates: [] } }).level;
test('koin controller: belum disimpan saat pickup; undo membatalkan, keluar menyimpan sekali, replay nol tambahan', () => {
  const w = makePuzzleWorld({ levels: [coinLevel()] }); w.eng.startRun(); w.play('R');
  assert.equal(w.last('puzzle').apples, 1); assert.equal(w.saves.length, 0);
  w.eng.undo(); assert.equal(w.last('puzzle').apples, 0);
  w.play('RRRR'); assert.equal(w.eng.getState(), 'won'); assert.equal(w.last('puzzleMenu').coins, 1);
  assert.equal(w.saves.length, 1); w.eng.startRun(); w.play('RRRR'); assert.equal(w.last('puzzleMenu').coins, 1);
  assert.match(w.overlays('gameover')[1].overlay.sub, /\+0 koin/);
});

test('animasi puzzle: input beruntun antre, pause membekukan antrean, undo tidak menyisakan input', () => {
  const w = makePuzzleWorld({ levels: [coinLevel()], animate: true }); w.eng.startRun();
  w.play('RR'); assert.equal(w.last('score'), 1);
  w.frame(130); assert.equal(w.last('score'), 2);
  w.eng.pauseRun('help'); w.frame(5000); assert.equal(w.last('score'), 2); assert.equal(w.rafQueue.length, 0);
  w.eng.releasePause('help'); w.eng.resumeRun(); w.frame(130);
  w.play('R'); w.play('R'); w.eng.undo(); w.frame(400);
  assert.equal(w.last('score'), 2); assert.equal(w.eng.getState(), 'playing'); w.eng.destroy();
});

test('kampanye baru: semua penjaga punya rute 3+ petak, semua apel opsional, maskot satu petak', () => {
  for (const lv of campaign.CAMPAIGN_LEVELS) {
    assert.equal(P.initialState(lv).snake.length, 1);
    assert.equal(lv.revision, 4);
    assert.ok(lv.foods.length <= 3);
    for (const g of lv.guards) assert.ok(g.patrol.length >= 3);
    assert.equal(P.solve({ ...lv, foods: [] }, 60000).length, lv.par, lv.id);
  }
});
