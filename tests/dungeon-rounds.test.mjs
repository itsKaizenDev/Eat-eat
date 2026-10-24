import test from 'node:test';
import assert from 'node:assert/strict';
import {campaign,rounds,generator,makePuzzleWorld,puzzle as P,geometry as G} from './helpers/env.mjs';

test('random rounds: every replay changes footprint even when RNG repeats',()=>{
 const variants=campaign.CAMPAIGN_VARIANTS[36],base=variants[0];let previous;
 for(let i=0;i<20;i++){const next=rounds.chooseRound(base,variants,()=>0,previous);assert.ok(variants.includes(next));assert.notEqual(next.shape,previous?.shape);assert.equal(next.id,'gen-37');previous=next;}
 assert.equal(rounds.chooseRound(base,null,()=>0),base);
});
test('random rounds: pause preserves layout; restart/menu replay reroll without changing level identity',()=>{
 const w=makePuzzleWorld({levels:campaign.CAMPAIGN_LEVELS,rng:()=>0});
 w.eng.startRun();const first=w.x.world.level;assert.equal(w.last('puzzle').levelNo,1);w.advance(300);
 w.eng.pauseRun();w.eng.resumeRun();assert.equal(w.x.world.level,first);assert.ok(w.x.world.time>0);
 w.eng.setDir(1,1);w.eng.restartLevel();const second=w.x.world.level;
 assert.notEqual(second.shape,first.shape);assert.notDeepEqual(second.map,first.map);assert.equal(second.id,first.id);
 assert.equal(w.x.world.time,0);assert.equal(w.x.input.x,0);assert.equal(w.last('puzzle').levelNo,1);assert.equal(w.saves.length,0);
 w.eng.returnToMenu();w.eng.startRun();assert.notEqual(w.x.world.level.shape,second.shape);assert.equal(w.last('puzzleMenu').selected,0);w.eng.destroy();
});
test('random rounds: variants keep rewards, objective count and progression compatible',()=>{
 for(const variants of campaign.CAMPAIGN_VARIANTS)for(const l of variants){assert.equal(l.artifacts.length,variants[0].artifacts.length);assert.equal(l.loot.length,variants[0].loot.length);assert.equal(l.revision,variants[0].revision);assert.equal(l.number,variants[0].number);}
});
test('custom level injection is respected even when it reuses a campaign ID',()=>{
 const level={...campaign.CAMPAIGN_LEVELS[0],name:'Custom fixture'};
 const w=makePuzzleWorld({levels:[level]});w.eng.startRun();assert.equal(w.x.world.level,level);w.eng.restartLevel();assert.equal(w.x.world.level,level);w.eng.destroy();
});
test('random rounds: changing mission keeps the new index and also changes the previous footprint',()=>{
 const progress={v:1,puzzle:{levels:Object.fromEntries(campaign.CAMPAIGN_LEVELS.map(l=>[l.id,{best:25}]))}};
 const w=makePuzzleWorld({levels:campaign.CAMPAIGN_LEVELS,progress,rng:()=>0});w.eng.setLevel(36);w.eng.startRun();const shape=w.x.world.level.shape;
 w.eng.returnToMenu();w.eng.setLevel(37);w.eng.startRun();assert.equal(w.x.world.level.id,'gen-38');assert.equal(w.last('puzzle').levelNo,38);assert.notEqual(w.x.world.level.shape,shape);w.eng.destroy();
});
test('shaped maps: empty space outside the footprint blocks movement, sight and sound',()=>{
 for(const shape of rounds.ROUND_SHAPES){const l=campaign.CAMPAIGN_VARIANTS[0].find(v=>v.shape===shape),s=P.createState(l);
  const y=l.map.findIndex(row=>row.includes(' ')),x=l.map[y].indexOf(' '),outside={x:x+.5,y:y+.5};
  assert.equal(G.solid(s,x,y),true);assert.equal(G.fits(s,outside.x,outside.y),false);
  assert.equal(G.lineOfSight(s,s.player,outside),false);assert.equal(G.soundField(s,s.player,100).has(`${x},${y}`),false);
 }
});
test('campaign wildlife: exact unlock thresholds, fixed safe lanes, more traps and equal Apple Coin rewards across variants',()=>{
 for(const variants of campaign.CAMPAIGN_VARIANTS)for(const l of variants){
  const n=l.number;
  assert.equal(l.guards.some(g=>g.kind==='runner'),n>=20);
  assert.equal(l.beasts.length,generator.levelPlan(n).monsters.length);
  assert.equal(l.dogs.length,n>=35?2:0);
  if(n>=35){assert.equal(l.dogs.filter(d=>d.tethered).length,1);assert.equal(l.dogs.filter(d=>!d.tethered).length,1);assert.ok(l.dogs.every(d=>d.range===4.8&&d.speed>P.SPEEDS.run));}
  assert.equal(l.hazards.length,n>=35?5:n>=20?3:n>=8?1:0);
  assert.equal(l.loot.length,n>=35?5:n>=10?4:3);assert.ok(l.loot.every(o=>o.value===5));
  assert.equal(l.gadgets.cooldown,10);assert.equal(l.revision,7);
  if(n>=20){const fast=l.guards.find(g=>g.kind==='runner'),normal=l.guards.find(g=>g.kind!=='runner');assert.ok(Math.abs(fast.speed/normal.speed-1.18)<1e-8);}
 }
 for(const shape of ['cavern','ruins'])assert.ok(campaign.CAMPAIGN_VARIANTS.every(v=>v.filter(l=>l.shape===shape).length===2));
});
