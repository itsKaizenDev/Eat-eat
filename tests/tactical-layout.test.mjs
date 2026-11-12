import test from 'node:test';
import assert from 'node:assert/strict';
import {campaign,geometry as G,progressLib as R,root} from './helpers/env.mjs';
const {mapQuality}=await import(root+'/node_modules/.cache/snake-tests/puzzle/quality.mjs');
test('tactical layout: distinct exits and portals stay away from every relic',()=>{
 let extraction=0;
 for(const l of campaign.CAMPAIGN_VARIANTS.flat()){
  const s={level:l,opened:new Set(l.doors.map(d=>d.id)),smoke:[]};
  if(l.flow==='extraction'){extraction++;assert.ok(G.distance(l.spawn,l.exit)>=4,l.variantId);for(const r of l.artifacts)assert.ok(G.findPath(s,r,l.exit).length>=8,l.variantId);}
  else assert.deepEqual(l.exit,l.spawn,l.variantId);
  for(const p of l.portals)for(const r of l.artifacts)assert.ok(G.findPath(s,p,r).length>=8,l.variantId);
  if(l.portals.length)assert.ok(G.findPath(s,...l.portals).length>=8,l.variantId);
 }
 assert.equal(extraction,120);
});
test('quality rejects portals beside the second relic',()=>{
 const l=structuredClone(campaign.CAMPAIGN_VARIANTS[49][0]);Object.assign(l.artifacts[1],{x:l.portals[0].x,y:l.portals[0].y});assert.ok(mapQuality(l).errors.includes('portal-too-close'));
});
test('tactical revision preserves clears and coins while separating old times',()=>{
 const old=R.recordHeistResult({v:1,puzzle:{levels:{}}},'jk-1',{time:10,stars:3,loot:15,alerts:0},8).progress;
 const next=R.recordHeistResult(old,'jk-1',{time:30,stars:2,loot:5,alerts:0},9);
 assert.equal(next.progress.puzzle.levels['jk-1'].heist.bestTimeMs,30000);assert.equal(R.appleCoins(next.progress),R.appleCoins(old));assert.equal(next.earned,0);
});
