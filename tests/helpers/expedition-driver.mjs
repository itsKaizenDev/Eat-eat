import assert from 'node:assert/strict';
// Deterministic agent uses only movement, inventory actions and real attack windows.
export function replayExpedition({W,S,C,G,P}){
 const s=S.createJourney(),log=[];let lastLog=0;
 function step(input={}){S.stepJourney(s,input);s.events=[];if(s.player.hp<48&&s.inventory.food)S.action(s,'food');if(s.player.poisonUntil>s.time&&s.inventory.antidote)S.action(s,'antidote');if(s.offer.length){log.push({event:'defeat',id:s.rewardId,time:s.time,hp:s.player.hp});S.chooseAbility(s,s.offer.includes('fang')?'fang':s.offer.includes('herbal')?'herbal':s.offer[0]);s.events=[];}if(s.status==='dead')throw Error('dead '+JSON.stringify({region:s.region,active:s.active,hp:s.player.hp,time:s.time,inv:s.inventory}));}
 function travel(goal){let n=0,path=[];while(G.distance(s.player,goal)>.85&&n++<24000){if(!path.length||n%30===0)path=G.findPath(W.bindGeometry(s),s.player,goal)||[];while(path.length&&G.distance(s.player,path[0])<.12)path.shift();const q=path[0]||goal,d=G.distance(s.player,q),input={x:(q.x-s.player.x)/Math.max(.001,d),y:(q.y-s.player.y)/Math.max(.001,d)};step(input);}assert.ok(n<24000,'path timeout '+JSON.stringify(goal));}
 function fight(e){let n=0;while(e.stage!=='dead'&&n++<36000){const pods=s.pods.filter(p=>p.hp>0),target=pods.sort((a,b)=>G.distance(a,s.player)-G.distance(b,s.player))[0]||e;
   const unsafe=p=>s.hazards.some(h=>h.region===s.region&&h.end>s.time&&h.start<s.time+.6&&C.hazardContains(h,p,.38));
   let best=null;
   for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]]){
    const p={x:s.player.x+dx*.65,y:s.player.y+dy*.65};if(!G.fits(W.bindGeometry(s),p.x,p.y,.25))continue;
    const danger=unsafe(p)?50:0,d=G.distance(p,target),vuln=pods.length||C.vulnerable(s,e),range=vuln?1.1:3.5;
    const score=danger+Math.abs(d-range)*2+(unsafe(s.player)&&!dx&&!dy?20:0);if(!best||score<best.score)best={x:dx,y:dy,score};
   }
   if((C.vulnerable(s,e)||pods.length)&&G.distance(s.player,target)<2.8)S.action(s,'skill');
   const input=best||{x:0,y:0};
   // Face the target on arrival; tiny real movement sets heading without teleporting.
   if(Math.hypot(input.x,input.y)<.01&&G.distance(s.player,target)<1.65){const d=G.distance(s.player,target);input.x=(target.x-s.player.x)/d*.05;input.y=(target.y-s.player.y)/d*.05;}
   step(input);
  }assert.ok(n<36000,'fight timeout '+e.id);}
  for(let region=0;region<3;region++){
   const world=W.WORLDS[region];assert.equal(s.region,region);
   for(const def of world.encounters){travel(def.shrine);assert.ok(S.interact(s),'start '+def.id);const e=s.enemies.find(e=>e.id===def.id);assert.equal(s.active,e.id);fight(e);assert.ok(s.defeated.includes(def.id));log.push({event:'battle-end',id:def.id,hp:s.player.hp,time:s.time});}
   travel(world.exit);assert.ok(S.interact(s),'exit '+region);
  }
  assert.equal(s.status,'won');assert.equal(s.defeated.length,9);assert.ok(P.validJourney(s));
 return {state:s,log};
}
