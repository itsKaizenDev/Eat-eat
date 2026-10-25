// Campaign contract now validates time-dependent executable routes, not a step-count BFS.
import test from 'node:test';
import assert from 'node:assert/strict';
import {campaign,generator,rounds,validation as V,makePuzzleWorld,progressLib as R,puzzle as P} from './helpers/env.mjs';
import { createCampaignJobs } from './helpers/campaign-pool.mjs';
import { root } from './helpers/env.mjs';
import {room,pt} from './puzzle.fixtures.mjs';

test('campaign: 50 stable IDs, 400 reproducible variants, six nonrectangular footprints per level',()=>{
 const levels=campaign.CAMPAIGN_LEVELS.filter(l=>!l.special);assert.equal(campaign.CAMPAIGN_LEVELS.length,51);assert.equal(campaign.CAMPAIGN_LEVELS[50].special,true);assert.equal(levels.length,50);assert.equal(campaign.CAMPAIGN_SPECS.length,45);
 assert.deepEqual(levels.slice(0,5).map(l=>l.id),['jk-1','jk-2','jk-3','jk-4','jk-5']);assert.deepEqual(levels.slice(5).map(l=>l.id),Array.from({length:45},(_,i)=>`gen-${i+6}`));
 assert.equal(new Set(levels.map(l=>JSON.stringify([l.map,l.spawn,l.keys,l.levers,l.guards]))).size,50);
 for(const [i,l] of levels.entries()){
  const variants=campaign.CAMPAIGN_VARIANTS[i];assert.equal(variants.length,8);assert.deepEqual(l,variants[0]);
  assert.equal(new Set(variants.map(v=>v.variantId)).size,8);assert.equal(new Set(variants.map(v=>JSON.stringify([v.map,v.spawn,v.keys,v.guards]))).size,8);
  assert.deepEqual([...new Set(variants.map(v=>v.shape))].sort(),[...rounds.ROUND_SHAPES].sort());
  for(const v of variants){assert.equal(v.id,l.id);if(!v.polished)assert.deepEqual({...v,par:0},{...rounds.generateRound(generator.missionSpec(i+1),v.roundSeed,v.shape,{grow:v.width>generator.levelPlan(i+1).width?1:0}),par:0});assert.deepEqual(V.validatePlan(v),[],v.variantId);assert.deepEqual(V.validateLevel(v),[],v.variantId);assert.ok(v.map.some(row=>row.includes(' ')));}
 }
});
const replayCases = Array.from({length:50},(_,i)=>({id:'mission-'+(i+1),number:i+1,delayed:false,name:`campaign ${i+1}: all eight variants replay the mission without alarms or gadgets (bonus through level 15)`}));
const delayedCases = [2,10,16,20,27,30,36,40,45,50].map(n=>({id:'delayed-'+n,number:n,delayed:true,name:`campaign ${n}: delayed start also has a valid temporal route`}));
const campaignJob = createCampaignJobs([...replayCases,...delayedCases],root+'/node_modules/.cache/snake-tests');
for(const c of [...replayCases,...delayedCases])test(c.name,async()=>{
 const result=await campaignJob(c);assert.ok(result?.ok,result?.error||'Missing campaign result');
});
test('campaign: mechanics introduced progressively, capped roster and second relic reserved for finale',()=>{
 const a=campaign.CAMPAIGN_LEVELS;assert.equal(a[0].guards.length,1);assert.equal(a[1].guards.length,1);assert.equal(a[3].doors.length,1);assert.equal(a[4].gadgets.stone,1);assert.ok(a[15].levers.length);assert.ok(a[19].plates.length);assert.ok(a[25].torches.length);assert.ok(a[9].crystals.length);assert.ok(a[39].portals.length);assert.equal(a[49].artifacts.length,2);assert.equal(a[49].guards.length,6);
});
test('progress: historical clears retain unlocks and steps, new times are isolated',()=>{
 const p={v:1,puzzle:{levels:Object.fromEntries(campaign.CAMPAIGN_LEVELS.slice(0,37).map(l=>[l.id,{best:25,revision:4,coins:2}]))},otherMode:{achievement:'keep'}};
 const w=makePuzzleWorld({levels:campaign.CAMPAIGN_LEVELS,progress:p});assert.equal(w.last('puzzleMenu').selected,37);assert.ok(w.last('puzzleMenu').levels[37].unlocked);w.eng.destroy();
 const r=R.recordHeistResult(p,'gen-37',{time:90,stars:3,loot:3,alerts:0});assert.equal(r.progress.puzzle.levels['gen-37'].best,25);assert.equal(r.progress.puzzle.levels['gen-37'].heist.bestTimeMs,90000);assert.equal(r.earned,1);assert.deepEqual(r.progress.otherMode,p.otherMode);assert.equal(R.parseProgress(JSON.stringify(r.progress)).puzzle.levels['gen-37'].best,25);
});
test('mission completion unlocks next level once; replay never duplicates rewards',()=>{
 const l=room({spawn:pt(2,2),exit:pt(4,2),artifacts:[{id:'r',...pt(3,2),kind:'artifact'}],loot:[{id:'b',...pt(3,2),kind:'loot'}]});const w=makePuzzleWorld({levels:[l,{...l,id:'next'}]});w.eng.startRun();w.eng.setDir(1,0);w.advance(1200);assert.equal(w.eng.getState(),'won');assert.equal(w.saves.length,1);assert.equal(w.last('puzzleMenu').selected,1);assert.ok(w.last('puzzleMenu').levels[1].unlocked);assert.equal(w.progress.puzzle.levels[l.id].best,undefined);
 w.advance(1000);assert.equal(w.saves.length,1);w.eng.returnToMenu();w.eng.setLevel(0);w.eng.startRun();w.eng.setDir(1,0);w.advance(1200);assert.equal(R.appleCoins(w.progress),1);w.eng.destroy();
});
test('progress merge/retry protects new mission records and unrelated fields',()=>{
 const base={v:1,puzzle:{levels:{}},delivery:{saved:true}};
 const a=R.recordHeistResult(base,'jk-1',{time:70,stars:2,loot:1,alerts:0}).progress;
 const b=R.recordHeistResult(base,'jk-1',{time:60,stars:3,loot:2,alerts:0}).progress;
 const c=R.recordHeistResult(b,'jk-2',{time:80,stars:1,loot:1,alerts:2}).progress;
 const m=R.mergeProgress(a,c);assert.equal(m.puzzle.levels['jk-1'].heist.bestTimeMs,60000);assert.equal(m.puzzle.levels['jk-1'].heist.stars,3);assert.equal(R.appleCoins(m),3);assert.deepEqual(m.delivery,{saved:true});
});

test('campaign: wider forecast still proves the level-11 bonus route within par',()=>{
 const level=campaign.CAMPAIGN_VARIANTS[10][1],before=JSON.stringify(campaign.CAMPAIGN_VARIANTS[10][1]);
 const result=V.verifyMission(level,{horizon:170,maxNodes:1000,bonus:true,wait:level.qualityProof?.initialWait||0});
 assert.ok(result.ok,JSON.stringify({...result,trace:undefined}));assert.equal(result.stars,3);assert.ok(result.time<=level.par);
 assert.ok(result.checkpoints.every(c=>c.alerts===0));assert.equal(JSON.stringify(level),before);
});
