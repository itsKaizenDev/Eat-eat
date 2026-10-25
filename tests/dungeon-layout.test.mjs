import test from 'node:test';
import assert from 'node:assert/strict';
import {root,campaign,puzzle as P,geometry as G,validation as V} from './helpers/env.mjs';
const {compactLevel}=await import(root+'/node_modules/.cache/snake-tests/puzzle/layout.mjs');
test('layout: compaction translates nested positions and retains every floor tile and obstacle',()=>{
 const l={width:9,height:8,map:['         ','         ','  #####  ','  #.C.#  ','  #...#  ','  #####  ','         ','         '],spawn:{x:3.5,y:4.5},guards:[{x:3.5,y:3.5,route:[{x:5.5,y:4.5}],post:{x:3.5,y:3.5},dx:1,dy:0}]};const before=structuredClone(l),r=compactLevel(l);
 assert.deepEqual(l,before);assert.equal(r.width,5);assert.equal(r.height,4);assert.deepEqual(r.spawn,{x:1.5,y:2.5});assert.deepEqual(r.guards[0].route,[{x:3.5,y:2.5}]);assert.equal(r.guards[0].dx,1);assert.strictEqual(compactLevel(r),r);assert.deepEqual(r.map,['#####','#.C.#','#...#','#####']);
});
test('layout: all 400 compact maps preserve growth, content, accessible objectives and non-overlapping placements',()=>{
 let removed=0,trimmed=0,previous=0;
 for(const row of campaign.CAMPAIGN_VARIANTS){let area=Infinity;for(const l of row){
  assert.deepEqual(V.validatePlan(l),[],l.variantId);assert.deepEqual(V.validateLevel(l),[],l.variantId);assert.strictEqual(compactLevel(l),l);
  const pts=[];l.map.forEach((r,y)=>[...r].forEach((c,x)=>{if('.C'.includes(c))pts.push({x,y})}));area=Math.min(area,pts.length);
  assert.equal(Math.min(...pts.map(p=>p.x)),1,l.variantId);assert.equal(Math.min(...pts.map(p=>p.y)),1,l.variantId);assert.equal(Math.max(...pts.map(p=>p.x)),l.width-2,l.variantId);assert.equal(Math.max(...pts.map(p=>p.y)),l.height-2,l.variantId);
  const props=['keys','levers','artifacts','loot','hides','plates','doors','portals','crystals','torches','bells','hazards','guards','dogs'].flatMap(g=>l[g]);for(let i=0;i<props.length;i++)for(let j=i+1;j<props.length;j++)assert.ok(G.distance(props[i],props[j])>=.95,l.variantId+' colliding props');
  const n=l.compact.sourceWidth*l.compact.sourceHeight-l.width*l.height;removed+=n;if(n)trimmed++;
 }assert.ok(area>previous);previous=area;}
 assert.equal(trimmed,221);assert.equal(removed,10306);
});
test('layout: boss arena is compact, connected, and all rune approaches fit the player body',()=>{
 const l=campaign.BOSS_LEVEL,s=P.createState(l);assert.equal(l.width,19);assert.equal(l.height,17);
 for(const p of [...l.boss.weak,l.artifacts[0]]){assert.ok(G.fits(s,p.x,p.y));assert.ok(G.findPath(s,l.spawn,p));}
 const reachable=new Set([G.tileKey(l.spawn.x,l.spawn.y)]),q=[l.spawn];for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const p={x:q[i].x+dx,y:q[i].y+dy},k=G.tileKey(p.x,p.y);if(G.fits(s,p.x,p.y)&&!reachable.has(k)){reachable.add(k);q.push(p);}}
 assert.equal(reachable.size,s.boss.floor.length);
});
