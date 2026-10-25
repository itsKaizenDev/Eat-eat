import test from 'node:test';
import assert from 'node:assert/strict';
import { root, campaign, puzzle as P, geometry as G, createRng } from './helpers/env.mjs';
const B = await import(root + '/node_modules/.cache/snake-tests/puzzle/boss.mjs');
const level = () => campaign.BOSS_LEVEL;
const effects = { note: P.note, lose(s, reason) { s.status = 'lost'; s.lossReason = reason; } };
const key = p => `${Math.floor(p.x)},${Math.floor(p.y)}`;
function plan(kind, pos = level().spawn, phase = 5) {
 const s = P.createState(level()); Object.assign(s.player, pos); Object.assign(s.boss, { phase, phaseHp: B.BOSS_RULES.phases[phase-1].hp, bag: [kind], until: 0 });
 P.step(s); return s;
}
function until(s, state, seconds = 20) { for (let n=0; s.boss.state!==state && n<seconds*60 && s.status==='playing'; n++) P.step(s); assert.equal(s.boss.state,state); }
function forceWindow(phase, targets) {
 const s=P.createState(level());Object.assign(s.boss,{phase,phaseHp:B.BOSS_RULES.phases[phase-1].hp,state:'WINDOW',targets,used:[],until:30});return s;
}
function stand(s, i, seconds = .02) { Object.assign(s.player, s.level.boss.weak[i]);for(let n=0;n<seconds*60;n++)P.step(s); }

test('dungeon boss: all eight skills warn without damage and leave reachable escape routes',()=>{
 for(const kind of Object.keys(B.BOSS_RULES.attacks))for(const pos of [level().spawn,{x:9.5,y:9.5},{x:2.5,y:6.5},{x:16.5,y:12.5},{x:9.5,y:1.5}]){
  const s=plan(kind,pos), b=s.boss;assert.equal(b.state,'TELE',kind);assert.ok(b.danger.size>0,kind);assert.ok(b.danger.size<b.floor.length,kind+' fills every floor');
  let shortest=Infinity;
  for(const f of b.floor.filter(f=>!b.danger.has(`${f.x},${f.y}`))){const goal={x:f.x+.5,y:f.y+.5},path=G.findPath(s,s.player,goal);if(path){let d=0,at=s.player;for(const p of path){d+=G.distance(at,p);at=p;}shortest=Math.min(shortest,d);}}
  assert.ok(b.until-s.time>=shortest/P.SPEEDS.walk+.6,kind+' insufficient escape time');
  const frozen=new Set(b.danger);Object.assign(s.player,{x:9.5,y:14.5});for(let n=0;n<20;n++)P.step(s);
  assert.deepEqual(b.danger,frozen,kind+' mark tracked player during warning');assert.equal(b.lives,5);
 }
});
test('dungeon boss: phase bags cover every skill before repeating and avoid adjacent repeats',()=>{
 for(let phase=1;phase<=5;phase++){
  const s=P.createState(level()),r=B.BOSS_RULES.phases[phase-1];s.boss.phase=phase;s.boss.rng=createRng(phase+42);let seen=[];
  for(let n=0;n<r.pool.length*2;n++){s.boss.state='GAP';s.boss.until=0;P.step(s);seen.push(s.boss.attack.kind);}
  assert.equal(new Set(seen.slice(0,r.pool.length)).size,r.pool.length);for(let n=1;n<seen.length;n++)assert.notEqual(seen[n],seen[n-1]);
 }
});
test('dungeon boss: chained skills warn again before each of their separate impacts',()=>{
 for(const kind of ['sweep','pursuit','quake','cage']){
  const s=plan(kind),b=s.boss;const lives=b.lives;b.invulnUntil=999;
  for(let beat=0;beat<B.BOSS_RULES.attacks[kind].beats;beat++){
   assert.equal(b.state,'TELE');assert.equal(b.attack.beat,beat);until(s,'ACTIVE');until(s,'RECOVER');
   if(beat+1<b.attack.beats)until(s,'TELE');
  }
  assert.equal(b.lives,lives);
 }
});
test('dungeon boss: hold rune charges continuously, resets on exit, and cannot double-hit',()=>{
 const s=forceWindow(2,[1]),hp=s.boss.hp;stand(s,1,.4);assert.equal(s.boss.hp,hp);assert.ok(s.boss.charge>.35);
 Object.assign(s.player,level().spawn);P.step(s);assert.equal(s.boss.charge,0);stand(s,1,.4);assert.equal(s.boss.hp,hp);stand(s,1,.32);assert.equal(s.boss.hp,hp-1);stand(s,1,.1);assert.equal(s.boss.hp,hp-1);
});
test('dungeon boss: ordered runes ignore the wrong rune, chains require both sides before the core',()=>{
 const s=forceWindow(3,[2,1]);const hp=s.boss.hp;stand(s,1);assert.equal(s.boss.hp,hp);stand(s,2);assert.equal(s.boss.hp,hp-1);stand(s,1);assert.equal(s.boss.hp,hp-2);
 const c=forceWindow(4,[1,2,0]),before=c.boss.hp;stand(c,0);stand(c,2);assert.equal(c.boss.hp,before);assert.deepEqual(c.boss.used,[2]);stand(c,0);assert.equal(c.boss.hp,before);stand(c,1);assert.equal(c.boss.hp,before);stand(c,0);assert.equal(c.boss.hp,before-3);
});
test('dungeon boss: finale executes two attacks before opening, and last rune needs a hold',()=>{
 const s=plan('row'),b=s.boss;b.invulnUntil=999;until(s,'RECOVER');until(s,'TELE');assert.equal(b.combo,1);assert.equal(b.targets.length,0);until(s,'WINDOW',30);assert.equal(b.combo,2);
 const w=forceWindow(5,[1,0,2]),hp=w.boss.hp;stand(w,1);stand(w,0);stand(w,2,.3);assert.equal(w.boss.hp,hp-2);stand(w,2,.42);assert.equal(w.boss.hp,hp-3);
});
test('dungeon boss: aimed stone counter uses actual endpoint, opens a window and keeps cooldown',()=>{
 const s=plan('pursuit');const c=s.boss.counter;Object.assign(s.player,{x:c.x,y:c.y+3.5,facing:-Math.PI/2});assert.equal(P.action(s,'gadget'),true);P.step(s);assert.equal(s.boss.state,'WINDOW');assert.ok(P.gadgetWait(s)>9);assert.equal(P.action(s,'gadget'),false);
 const miss=plan('pursuit');Object.assign(miss.player,{x:9.5,y:12.5,facing:0});P.action(miss,'gadget');P.step(miss);assert.equal(miss.boss.state,'TELE');
});
test('dungeon boss: smoke freezes perceived position; trap buys time without damaging boss',()=>{
 const s=plan('pursuit'),b=s.boss;const old={...b.lastSeen};s.smoke.push({...s.player,radius:2,until:20});s.player.x+=.8;P.step(s);assert.deepEqual(b.lastSeen,old);
 b.invulnUntil=999;until(s,'ACTIVE');const [k]=b.danger,[x,y]=k.split(',').map(Number);s.traps.push({x:x+.5,y:y+.5,armedAt:0,until:99,spent:false});const hp=b.hp;P.step(s);assert.equal(b.dampened,true);assert.equal(b.hp,hp);until(s,'RECOVER');until(s,'TELE');assert.ok(b.until-s.time>=b.teleDuration+.7);
});
test('dungeon boss: gallery and entrance belong to the hazard domain; heals remain reachable and usable',()=>{
 const s=P.createState(level());assert.ok(s.boss.floor.some(p=>p.x===Math.floor(level().spawn.x)&&p.y===Math.floor(level().spawn.y)));assert.ok(s.boss.floor.some(p=>p.x===9&&p.y===1));
 Object.assign(s.boss,{state:'WINDOW',targets:[0],used:[],phaseHp:1,until:30});stand(s,0);assert.equal(s.boss.phase,2);assert.equal(s.boss.heals.length,1);const heart=s.boss.heals[0];assert.ok(G.findPath(s,s.player,heart));Object.assign(s.player,heart);P.step(s);assert.equal(s.boss.heals.length,1,'full health does not waste heart');s.boss.lives=3;P.step(s);assert.equal(s.boss.lives,4);assert.equal(s.boss.heals.length,0);
});

import {playBoss} from './helpers/dungeon-boss.mjs';
test('dungeon boss: twelve seeded runs beat all five phases by ordinary movement, collect relic and exit',()=>{
 const covered=new Set();let max=0;
 for(let seed=1;seed<=12;seed++){
  const {s,skills,phases}=playBoss(level(),{seed,limit:420});
  assert.equal(s.status,'won',`seed ${seed}: ${s.boss.phase}/${s.boss.hp}/${s.boss.state} ${s.lossReason||''}`);
  assert.equal(s.coins,50);assert.equal(s.boss.hits,B.bossHp());assert.equal(s.boss.lives,5,'clean dodge script loses health seed '+seed);assert.equal(phases.size,5);
  skills.forEach(k=>covered.add(k));max=Math.max(max,s.time);
 }
 assert.deepEqual([...covered].sort(),Object.keys(B.BOSS_RULES.attacks).sort());
 console.log('12 boss replays, max time',Math.round(max*100)/100);
});
