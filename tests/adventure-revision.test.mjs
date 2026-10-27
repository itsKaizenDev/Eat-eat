import test from 'node:test';
import assert from 'node:assert/strict';
import { bossSim as B, rogueSim as S, rogueUp as U, createRng, makeBossWorld, makeRogueWorld, progressLib as P } from './helpers/env.mjs';
const mk = () => {
  const s = B.createState({ arena: B.parseArena(B.ARENA_MAP, B.START, B.WEAK_TILES), rng: createRng(98765), interval: 140, t: 0 });
  s.round = 10; s.phase = 3; s.phaseHp = 10; s.hp = 10;
  return s;
};
const open = s => { s.window = { open: true, hit: false, targets: [0], used: [] }; s.sched = { kind: 'window', endAt: s.t + 100000 }; s.attack = null; s.warn.fill(0); s.hazard.fill(0); };
const hit = s => { open(s); s.energy = 3; s.snake = [{x:8,y:4},{x:7,y:4},{x:6,y:4}]; s.dir = B.DIRS.U; return B.stepSim(s, null, s.t + 1); };
const finishAttack = s => { s.attack = { cells: new Set(), recMs: 100000 }; s.sched = { kind: 'active', endAt: s.t + 100 }; B.advance(s, s.sched.endAt); return s.t; };

test('fase 3: satu serangan menghasilkan tepat tiga shield +10 pada detik 5/10/15; bukan sebelum atau setelahnya', () => {
  const s = mk(), at = finishAttack(s);
  assert.equal(s.damageOrbs.length, 1); assert.equal(s.heals.length, 1);
  B.advance(s, at + 4999); assert.equal(s.shield, 0);
  for (let i=1; i<=3; i++) { const ev = B.advance(s, at+i*5000); assert.equal(s.shield, i*10); assert.equal(ev.filter(e=>e.type==='shieldGain').length, 1); assert.deepEqual(B.advance(s, at+i*5000), []); }
  B.advance(s, at+25000); assert.equal(s.shield, 30); assert.deepEqual(s.shieldBursts, []);
});

test('shield bertumpuk antar serangan tetapi tidak melewati 100; jadwal independen dari FPS', () => {
  const a=mk(), b=mk(); finishAttack(a); finishAttack(b); a.shield=95; b.shield=95;
  for(let t=101;t<=16000;t+=13) B.advance(a,t);
  B.advance(a,16000); B.advance(b,16000);
  assert.equal(a.shield,100); assert.equal(b.shield,100); assert.deepEqual(a.shieldBursts,b.shieldBursts);
  const c=mk(); const t1=finishAttack(c); c.t+=1000; const t2=finishAttack(c);
  B.advance(c,t2+15000); assert.equal(c.shield,60); assert.equal(c.shieldBursts.length,0); assert.ok(t2>t1);
});

test('damage ×2: stack orb dan tiap 5 shield, bonus shield hanya jika orb sudah dimiliki', () => {
  const s=mk(); s.shield=100; assert.equal(B.playerDamage(s),1);
  s.damageStacks=1;
  for(const [shield, damage] of [[0,2],[4,2],[5,4],[9,4],[10,8],[100,2097152]]) {s.shield=shield;assert.equal(B.playerDamage(s),damage);}
  s.shield=10;s.damageStacks=2;assert.equal(B.playerDamage(s),16);
  const ev=hit(s);const e=ev.find(e=>e.type==='hit');
  assert.deepEqual([e.absorbed,e.hpDamage,s.shield,s.phaseHp],[10,6,0,4]);
  assert.equal(s.damageStacks,2,'orb tidak habis setelah serangan');
});

test('shield menyerap pukulan sebelum HP, base damage tanpa orb tidak mendapat bonus', () => {
  const s=mk();s.shield=10;hit(s);
  assert.equal(s.shield,9);assert.equal(s.phaseHp,10);assert.equal(s.damageDealt,0);
});

test('orb damage dan heal dapat ditumpuk, pickup tidak menambah panjang/energi dan tidak tumpang tindih', () => {
  const s=mk(); finishAttack(s);
  const occupied=[...s.apples,...s.heals,...s.damageOrbs,...s.snake,...s.arena.weak].map(p=>`${p.x},${p.y}`);
  assert.equal(new Set(occupied).size, occupied.length);
  s.damageOrbs=[{x:4,y:9,amount:2}];s.snake=[{x:3,y:9},{x:2,y:9},{x:1,y:9}];s.dir=B.DIRS.R;
  B.stepSim(s,null,s.t+1);assert.equal(s.damageStacks,2);assert.equal(s.energy,0);assert.equal(s.snake.length,3);
  s.heals=[{x:5,y:9,amount:4}];B.stepSim(s,null,s.t+1);assert.equal(s.lives,9);
});

test('pukulan besar tidak melompati fase; fase 2 diisi 5 HP, fase 3 diisi 10 HP dan orb', () => {
  const s=mk();s.phase=1;s.phaseHp=3;s.hp=18;s.damageStacks=4;hit(s);
  assert.equal(s.phase,1);assert.equal(s.phaseHp,0);assert.equal(s.hp,15);assert.equal(s.status,'playing');
  B.advance(s,s.sched.endAt);assert.equal(s.phase,2);assert.equal(s.phaseHp,5);
  hit(s);B.advance(s,s.sched.endAt);assert.equal(s.phase,3);assert.equal(s.phaseHp,10);assert.equal(s.hp,10);assert.equal(s.damageOrbs.length,1);
  const ev=hit(s);assert.equal(s.status,'won');assert.equal(s.hp,0);assert.equal(s.damageDealt,18);assert.equal(ev.filter(e=>e.type==='win').length,1);
});

test('pause membekukan jadwal shield; retry/menu menghapus shield dan stack orb', () => {
  const w=makeBossWorld();w.eng.startRun();const s=w.h.sim;s.round=10;s.phase=3;s.phaseHp=10;s.hp=10;
  s.shieldBursts=[{nextAt:5000,left:3}];s.damageStacks=2;
  w.eng.pauseRun('help');w.advance(20000);assert.equal(s.shield,0);assert.equal(s.shieldBursts[0].nextAt,5000);
  w.eng.releasePause('help');w.eng.resumeRun();
  // Simulasi waktu murni sudah diuji; lifecycle reset tidak membawa buff lama.
  w.eng.returnToMenu();w.eng.startRun();assert.equal(w.h.sim.damageStacks,0);assert.equal(w.h.sim.shield,0);assert.deepEqual(w.h.sim.shieldBursts,[]);
});

test('lima apel Ekspedisi terpisah dari 2..9 bom, posisi unik, refill tidak mengurangi bom', () => {
  for(let seed=1;seed<=30;seed++)for(let round=1;round<=5;round++) {
    const stats=U.deriveStats({...U.emptyCounts(),sweet:2});const s=S.createRound({stats,round,rng:createRng(seed)});
    assert.equal(s.foods.length,5);assert.equal(s.bombs.length,S.DEFAULT_CFG.baseBombs[round-1]+4);
    const keys=[...s.foods,...s.bombs,...s.snake].map(p=>`${p.x},${p.y}`);assert.equal(new Set(keys).size,keys.length);
    const before=s.bombs.length;s.foods[0]={x:9,y:7,kind:'normal'};S.stepRound(s,'R',140);
    assert.equal(s.foods.length,5);assert.equal(s.bombs.length,before);
  }
});

test('Ekspedisi entry point now owns a continuous saved journey and no quota revive', () => {
 const w=makeRogueWorld();w.eng.startRun();assert.equal(w.last('roguelite').expedition,true);assert.equal(w.last('rogueMenu').revive,undefined);assert.equal(w.x.world.region,0);w.eng.returnToMenu();w.eng.startRun();assert.equal(w.x.world.region,0);w.eng.destroy();
});

test('revisi level: buka-kunci lama tetap, rekor baru tidak dibandingkan dengan peta lama', () => {
  let p=P.parseProgress(JSON.stringify({v:1,puzzle:{levels:{'gen-38':{best:10}}}}));
  const result=P.recordPuzzleResult(p,'gen-38',40,2);
  assert.equal(result.newBest,true);assert.equal(result.firstClear,false);
  assert.deepEqual(result.progress.puzzle.levels['gen-38'],{best:40,revision:2});
  p=P.parseProgress(JSON.stringify(result.progress));assert.equal(p.puzzle.levels['gen-38'].revision,2);
  assert.equal(P.recordPuzzleResult(p,'gen-38',45,2).progress.puzzle.levels['gen-38'].best,40);
});
