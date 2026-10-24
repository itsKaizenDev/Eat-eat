import test from 'node:test';
import assert from 'node:assert/strict';
import {campaign,generator,geometry as G} from './helpers/env.mjs';

test('400 variants: introduced monsters are guaranteed rather than replaced by a random slot',()=>{
 for(const variants of campaign.CAMPAIGN_VARIANTS)for(const l of variants){
  assert.deepEqual(l.beasts.map(b=>b.kind),generator.monsterSlots(l.number),l.variantId);
  assert.equal(new Set(l.beasts.map(b=>b.id)).size,l.beasts.length,l.variantId);
 }
});
test('400 variants: monsters share an active NPC room and mimics face an accessible floor tile',()=>{
 let monsters=0;
 for(const variants of campaign.CAMPAIGN_VARIANTS)for(const l of variants){
  const s={level:l,opened:new Set(),smoke:[]};
  const patrol=[...l.guards,...l.dogs].flatMap(a=>[a,...a.route,...(a.route.length>1?G.findPath(s,a.route[0],a.route[1])||[]:[])]);
  for(const b of l.beasts){
   monsters++;const at=b.kind==='mimic'?b.mouth:b;
   assert.ok(patrol.some(p=>G.distance(at,p)<=3&&G.lineOfSight(s,at,p,false)),l.variantId+' '+b.kind+' is isolated');
   assert.ok(G.distance(b,l.spawn)>=5.5,l.variantId+' unsafe spawn');
   if(b.kind==='mimic'){
    assert.equal(l.map[Math.floor(b.y)][Math.floor(b.x)],'C');assert.equal(l.map[Math.floor(b.mouth.y)][Math.floor(b.mouth.x)],'.');assert.equal(G.distance(b,b.mouth),1);
    assert.ok(G.findPath(s,l.spawn,b.mouth)!==null,l.variantId+' inaccessible mouth');
   }
  }
 }
 assert.equal(monsters,376);
});
test('400 variants: guard and dog homes do not overlap each other or important objects',()=>{
 for(const variants of campaign.CAMPAIGN_VARIANTS)for(const l of variants){
  const actors=[...l.guards,...l.dogs],props=[l.spawn,...l.keys,...l.levers,...l.artifacts,...l.loot,...l.hides,...l.plates,...l.doors,...l.portals,...l.crystals,...l.torches,...l.bells,...l.hazards];
  for(let i=0;i<actors.length;i++){
   assert.ok(props.every(p=>G.distance(p,actors[i])>=.94),l.variantId+' actor on prop');
   for(let j=i+1;j<actors.length;j++)assert.ok(G.distance(actors[i],actors[j])>=1.19,l.variantId+' overlapping posts');
  }
 }
});
test('400 variants: star targets use verified route times rather than a generation placeholder',()=>{
 for(const row of campaign.CAMPAIGN_VARIANTS)for(const level of row){assert.ok(level.par<1000,level.variantId);assert.ok(level.par>=level.placementProof.time,level.variantId);}
});
