import test from 'node:test';
import assert from 'node:assert/strict';
import { revives as R, puzzle as P, progressLib as S, makeRogueWorld, makePuzzleWorld, bossSim as B, createRng, campaign } from './helpers/env.mjs';
import { room } from './puzzle.fixtures.mjs';

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

// Expedition's quota revival contract was replaced by checkpoint rollback; see expedition.test.mjs.

test('koin: hadiah hanya selisih rekor koleksi, undo/replay tidak menggandakan, migrasi rekor tidak menghapus saldo', () => {
  let p = S.parseProgress(null);
  let r = S.recordPuzzleResult(p, 'jk-1', 12, 3, 2); p = r.progress;
  assert.equal(r.earned, 2); assert.equal(S.appleCoins(p), 2);
  r = S.recordPuzzleResult(p, 'jk-1', 11, 3, 2); assert.equal(r.earned, 0);
  r = S.recordPuzzleResult(r.progress, 'jk-1', 15, 3, 3); assert.equal(r.earned, 1);
  p = S.parseProgress(JSON.stringify(r.progress)); assert.equal(S.appleCoins(p), 3);
  r = S.recordPuzzleResult(p, 'jk-1', 19, 4, 1); assert.equal(r.earned, 0); assert.equal(S.appleCoins(r.progress), 3);
});

// Dungeon's former undo/step contract is replaced with real-time retry and completion.
const coinLevel = () => ({ ...room(), id:'coin', guards:[],
  spawn:{x:2.5,y:2.5},exit:{x:4.5,y:2.5},artifacts:[{id:'r',x:3.5,y:2.5,kind:'artifact'}],loot:[{id:'b',x:3.5,y:2.5,kind:'loot'}] });
test('koin controller: pickup belum tersimpan; restart membatalkan; keluar sekali dan replay nol tambahan',()=>{
 const w=makePuzzleWorld({levels:[coinLevel()]});w.eng.startRun();w.eng.setDir(1,0);w.advance(350);assert.equal(w.x.world.loot,1);assert.equal(w.saves.length,0);
 w.eng.restartLevel();assert.equal(w.x.world.loot,0);w.eng.setDir(1,0);w.advance(1200);assert.equal(w.eng.getState(),'won');assert.equal(w.last('puzzleMenu').coins,1);assert.equal(w.saves.length,1);
 w.eng.startRun();w.eng.setDir(1,0);w.advance(1200);assert.equal(w.last('puzzleMenu').coins,1);assert.match(w.overlays('gameover')[1].overlay.sub,/\+0 koin/);w.eng.destroy();
});
test('real-time dungeon: bantuan membekukan waktu dan menghapus arah tertahan',()=>{
 const w=makePuzzleWorld({levels:[coinLevel()]});w.eng.startRun();w.eng.setDir(1,0);w.advance(200);w.eng.pauseRun('help');const before=w.x.world.time;w.advance(5000);assert.equal(w.x.world.time,before);assert.equal(w.rafQueue.size,0);
 w.eng.releasePause('help');w.eng.resumeRun();const x=w.x.world.player.x;w.advance(1000);assert.equal(w.x.world.player.x,x);w.eng.destroy();
});
test('campaign revision 8 keeps the small snake explorer and expands optional Apple Coin rewards',()=>{
 for(const l of campaign.CAMPAIGN_LEVELS.filter(l=>!l.special)){const s=P.createState(l);assert.ok(s.player);assert.equal(s.snake,undefined);assert.equal(l.revision,8);assert.equal(l.loot.length,l.number>=35?5:l.number>=10?4:3);assert.ok(l.loot.every(o=>o.value===5));assert.ok(l.guards.every(g=>g.route.length>=2||g.watch));assert.ok(l.artifacts.length>=1);}
});
