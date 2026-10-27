import test from 'node:test';import assert from 'node:assert/strict';
import {root,createRng}from'./helpers/env.mjs';
const load=n=>import(root+'/node_modules/.cache/snake-tests/expedition/'+n+'.mjs');
const W=await load('world'),S=await load('sim'),C=await load('combat'),P=await load('progress'),{createExpeditionGame,EXPEDITION_RECORD_KEY}=await load('controller');
const G=await import(root+'/node_modules/.cache/snake-tests/puzzle/geometry.mjs');
const setPos=(s,x,y)=>{s.player.x=x;s.player.y=y;S.resetTail(s);};
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)S.stepJourney(s,input);};
function world(options={}){
 let clock=1000,id=0;const raf=new Map(),emits=[],writes=[],rs={v:1,records:{}},noop=()=>{};let hook,saved=options.saved||null,fail=!!options.fail;
 const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
 const api=createExpeditionGame({canvas:{width:780,height:1688,getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:844})},now:()=>clock,raf:cb=>{raf.set(++id,cb);return id;},caf:i=>raf.delete(i),
  onUpdate:p=>emits.push(p),io:{load:()=>rs,save:v=>{Object.assign(rs,v);return true;}},journeyIO:{load:()=>saved,save:v=>{writes.push(JSON.stringify(v));if(fail)return false;saved=JSON.parse(JSON.stringify(v));return true;}},inspect:h=>hook=h});
 return {api,hook,emits,writes,raf,rs,get saved(){return saved;},setFail:v=>{fail=v;},last:key=>emits.findLast(p=>key in p)?.[key],advance(ms){const end=clock+ms;while(clock<end){clock=Math.min(end,clock+1000/60);const entries=[...raf];raf.clear();entries.forEach(([,cb])=>cb(clock));}}};
}
test('expedition world: three connected regions, six distinct minibosses and three independent phase bosses',()=>{
 assert.equal(W.WORLDS.length,3);const all=W.WORLDS.flatMap(w=>w.encounters);assert.equal(all.length,9);assert.equal(new Set(all.map(e=>e.type)).size,9);assert.equal(all.filter(e=>e.kind==='mini').length,6);
 for(const w of W.WORLDS){const s=S.createJourney();s.region=w.region;s.defeated=W.WORLDS.slice(0,w.region).flatMap(w=>w.encounters.map(e=>e.id));setPos(s,w.start.x,w.start.y);
  for(let i=0;i<2;i++){const shrine=w.encounters[i].shrine;
   if(i===1&&w.region!==1)s.defeated.push(w.encounters[0].id);
   assert.ok(G.findPath(W.bindGeometry(s),s.player,shrine),`${w.id}/${i} shrine reachable`);
  }
  s.defeated=[...new Set([...s.defeated,...w.encounters.slice(0,2).map(e=>e.id)])];assert.ok(G.findPath(W.bindGeometry(s),s.player,w.encounters[2].shrine));
 }
});
test('trap authoring: full rows/columns, safe staging on both sides, and enough off time for the complete tail',()=>{
 for(const w of W.WORLDS)for(const trap of w.traps){for(const m of w.mobs)assert.ok(Math.min(...trap.tiles.map(q=>Math.hypot(m.x-q.x-.5,m.y-q.y-.5)))>4,'mob stays outside trap staging');assert.equal(trap.tiles.length,trap.hi-trap.lo+1);assert.ok(trap.warning>=1.25);assert.ok(trap.rest>(1+2.16+.48)/(3*.78)+1);
  for(const q of trap.tiles){assert.equal(w.map[q.y][q.x],'.');const neighbours=trap.axis==='row'?[[q.x,q.y-1],[q.x,q.y+1]]:[[q.x-1,q.y],[q.x+1,q.y]];for(const [x,y]of neighbours)assert.equal(w.map[y][x],'.');}
  assert.equal(W.trapStage(trap,trap.period*2-trap.offset+.1),'safe');assert.equal(W.trapStage(trap,trap.period*2-trap.offset+trap.rest+.1),'warning');assert.equal(W.trapStage(trap,trap.period*2-trap.offset+trap.rest+trap.warning+.1),'active');
 }
});
test('movement: free diagonal, analog strength, stop on release, reverse, body overlap and swept wall collision',()=>{
 const a=S.createJourney(),b=S.createJourney();setPos(a,10,33);setPos(b,10,33);tick(a,30,{x:1,y:0});tick(b,30,{x:1,y:1});assert.ok(Math.abs(G.distance(a.player,{x:10,y:33})-G.distance(b.player,{x:10,y:33}))<.001);
 const p={...a.player};tick(a,30);assert.equal(a.player.x,p.x);assert.equal(a.player.y,p.y);tick(a,30,{x:-1,y:0});assert.ok(a.player.x<p.x);assert.equal(a.status,'playing');assert.ok(a.player.hp>0);
 setPos(a,4.5,33);tick(a,240,{x:-1,y:0});assert.ok(a.player.x>=4.23);assert.ok(G.fits(W.bindGeometry(a),a.player.x,a.player.y,.24));
});
test('trap damage: tail is included and one full line does not multiply damage per overlapping tile',()=>{
 const s=S.createJourney(),trap=W.WORLDS[0].traps[0];s.player.shield=0;s.time=trap.rest+trap.warning+.05;setPos(s,7.5,30.8);s.trail=[{x:7.5,y:30.8},{x:7.5,y:29.5},{x:7.5,y:28.6}];const hp=s.player.hp;
 tick(s,30);assert.equal(s.player.hp,hp-trap.damage);assert.equal(s.status,'playing');
});
for(const w of W.WORLDS)test(`boss ${w.id}: zero HP enters the next phase once, refills separately, never carries overflow or restores the player`,()=>{
 const s=S.createJourney();s.region=w.region;s.defeated=W.WORLDS.slice(0,w.region).flatMap(w=>w.encounters.map(e=>e.id));s.defeated.push(...w.encounters.slice(0,2).map(e=>e.id));const e=s.enemies.find(e=>e.id===w.encounters[2].id);setPos(s,e.x,e.y+1);s.player.hp=63;assert.ok(C.beginEncounter(s,e));
 for(let phase=1;phase<=3;phase++){
  e.stage='recover';const hp=s.player.hp;assert.equal(C.hitEnemy(s,e,99999),true);
  if(phase<3){assert.equal(e.phase,phase+1);assert.equal(e.hp,0);assert.equal(e.stage,'transition');assert.equal(C.hitEnemy(s,e,99999,true),false);assert.equal(s.active,e.id);s.player.biteAt=s.time+10;tick(s,97);assert.equal(e.hp,e.phaseHp[phase]);assert.equal(e.maxHp,e.phaseHp[phase]);assert.equal(s.player.hp,hp);s.pods=[];}
  else{assert.equal(e.stage,'dead');assert.ok(s.defeated.includes(e.id));assert.equal(s.active,null);}
 }
});
test('combat: all nine encounters have a readable windup, hazards and recovery rather than instant attacks',()=>{
 for(const def of W.WORLDS.flatMap(w=>w.encounters)){
  const s=S.createJourney();s.region=def.region;s.defeated=W.WORLDS.slice(0,s.region).flatMap(w=>w.encounters.map(e=>e.id));if(def.index===2)s.defeated.push(...W.WORLDS[s.region].encounters.slice(0,2).map(e=>e.id));
  const e=s.enemies.find(e=>e.id===def.id);setPos(s,def.arena.x+2,def.arena.y+def.arena.h-2);C.beginEncounter(s,e);s.pods=[];e.until=0;S.stepJourney(s);assert.equal(e.stage,'windup');assert.ok(e.until-s.time>=1);assert.ok(s.hazards.length>0);assert.ok(s.hazards.every(h=>h.start>s.time));assert.equal(s.player.hp,100);
 }
});
test('combat: auto bite respects distance, facing, line of sight, armour and node shields',()=>{
 const s=S.createJourney(),e=s.enemies.find(e=>e.type==='boar');setPos(s,e.x-1,e.y);s.player.angle=0;C.beginEncounter(s,e);s.time=1;const hp=e.hp;C.bite(s);assert.equal(e.hp,hp-12);e.stage='windup';s.time=2;C.bite(s);assert.equal(e.hp,hp-12);e.stage='recover';s.player.angle=Math.PI;s.time=3;C.bite(s);assert.equal(e.hp,hp-12);
 const c=s.enemies.find(e=>e.type==='cocoon');s.active=null;s.region=2;setPos(s,c.x-1,c.y);C.beginEncounter(s,c);s.player.angle=0;s.time=4;const before=c.hp;C.bite(s);assert.equal(c.hp,before);assert.ok(s.pods.length===2);
});
test('actions: food, antidote, dash, and venom have real costs/cooldowns and cannot act during upgrade/death',()=>{
 const s=S.createJourney();s.player.hp=40;assert.equal(S.action(s,'food'),true);assert.equal(s.inventory.food,1);assert.equal(s.player.hp,70);assert.equal(S.action(s,'antidote'),false);s.player.poisonUntil=5;assert.equal(S.action(s,'antidote'),true);assert.equal(s.inventory.antidote,0);
 assert.equal(S.action(s,'dash'),true);assert.equal(S.action(s,'dash'),false);assert.equal(S.action(s,'skill'),true);assert.equal(S.action(s,'skill'),false);s.offer=['fang'];assert.equal(S.action(s,'food'),false);s.offer=[];s.status='dead';assert.equal(S.action(s,'food'),false);
});
test('world interaction: loot/lever cannot duplicate; miniboss gates and boss shrine need both seals',()=>{
 const s=S.createJourney(),w=W.WORLDS[0];setPos(s,w.loot[0].x,w.loot[0].y);const coins=s.inventory.coins;S.interact(s);assert.ok(s.inventory.coins>coins);const after=s.inventory.coins;S.interact(s);assert.equal(s.inventory.coins,after);
 setPos(s,w.lever.x,w.lever.y);assert.equal(S.interact(s),true);assert.ok(s.levers.includes(w.lever.id));assert.equal(S.interact(s),false);
 setPos(s,w.encounters[2].shrine.x,w.encounters[2].shrine.y);assert.equal(S.interact(s),false);assert.equal(s.active,null);
});
test('checkpoint: restore rewinds loot, inventory, enemies, phases and upgrades together without touching other mode keys',()=>{
 const save=P.freshSave();const s=save.current;s.player.hp=17;S.activateCamp(s,W.WORLDS[0].camps[0]);assert.equal(s.player.hp,50);save.checkpoint=S.checkpointCopy(s);
 s.looted.push('root-cache');s.inventory.food=0;s.upgrades.fang=2;s.enemies[0].hp=1;s.region=0;s.player.hp=0;s.status='dead';const restored=P.restoreCheckpoint(save);
 assert.equal(restored.current.player.hp,50);assert.equal(restored.current.inventory.food,2);assert.equal(restored.current.upgrades.fang,0);assert.equal(restored.current.enemies[0].hp,90);assert.deepEqual(restored.current.looted,[]);assert.equal(restored.deaths,1);
 const storage={foreign:'keep'};const old=globalThis.localStorage;globalThis.localStorage={getItem:k=>storage[k],setItem:(k,v)=>{storage[k]=v}};try{assert.ok(P.saveJourney(restored));assert.equal(storage.foreign,'keep');assert.ok(P.loadJourney());}finally{globalThis.localStorage=old;}
});
test('save schema: valid journey roundtrips; damaged, impossible, oversized or incompatible state is rejected',()=>{
 const save=P.freshSave();assert.ok(P.parseSave(JSON.stringify(save)));for(const raw of ['oops','{}','null','x'.repeat(250001)])assert.equal(P.parseSave(raw),null);
 for(const mutate of [s=>s.current.player.hp=NaN,s=>s.current.player.x=-1,s=>s.current.region=2,s=>s.current.upgrades.fang=99,s=>s.current.version=20,s=>s.checkpoint.active='root-0']){const copy=JSON.parse(JSON.stringify(save));mutate(copy);assert.equal(P.parseSave(JSON.stringify(copy)),null);}
});
test('save schema: incomplete active charge, mob route and shield nodes cannot crash a resumed fight',()=>{
 const save=P.freshSave(),s=save.current,e=s.enemies[0];setPos(s,e.x,e.y+1);C.beginEncounter(s,e);e.until=0;S.stepJourney(s);s.time=e.until;S.stepJourney(s);assert.equal(e.stage,'active');assert.ok(P.parseSave(JSON.stringify(save)));
 for(const mutate of [s=>delete s.enemies[0].chargeDir,s=>delete s.enemies[0].mark,s=>delete s.enemies[0].until,s=>delete s.enemies.find(e=>e.kind==='mob').anchor,s=>s.pods.push({owner:'root-0',region:0,x:5,y:5,hp:20}),s=>s.hazards.push({owner:'root-0',region:0,shape:'ring',x:10,y:20,radius:2,start:1,end:2,damage:5})]){const copy=JSON.parse(JSON.stringify(save));mutate(copy.current);assert.equal(P.parseSave(JSON.stringify(copy)),null);}
});
test('controller: start once, free held input, release, pause blockers, no idle motion and one RAF owner',()=>{
 const w=world();assert.equal(w.api.getState(),'menu');w.api.setDir(1,0);assert.deepEqual(w.hook.input,{x:0,y:0});assert.ok(w.api.startRun());assert.equal(w.api.startRun(),false);assert.equal(w.raf.size,1);
 const x=w.hook.world.player.x;w.advance(500);assert.equal(w.hook.world.player.x,x);w.api.setDir(.6,-.6,{source:'pad'});w.advance(400);assert.ok(w.hook.world.player.x>x);w.api.cancelHeldInput('pad');const pos=w.hook.world.player.x;w.advance(500);assert.equal(w.hook.world.player.x,pos);
 w.api.pauseRun('hidden');const t=w.hook.world.time;w.advance(5000);assert.equal(w.hook.world.time,t);assert.equal(w.raf.size,0);assert.equal(w.api.resumeRun(),false);w.api.releasePause('hidden');assert.ok(w.api.resumeRun());assert.equal(w.raf.size,1);w.api.destroy();assert.equal(w.raf.size,0);
});
test('controller: checkpoint retry is unlimited, upgrade choice is modal/idempotent and survives reload',()=>{
 const w=world();w.api.startRun();const e=w.hook.world.enemies[0];C.beginEncounter(w.hook.world,e);e.stage='recover';C.hitEnemy(w.hook.world,e,9999);w.advance(20);assert.equal(w.api.getState(),'choosingUpgrade');assert.equal(w.raf.size,0);const before=w.hook.world.time;w.advance(4000);assert.equal(w.hook.world.time,before);
 const saved=w.saved;w.api.destroy();const r=world({saved});assert.equal(r.last('roguelite').choosingUpgrade,false);r.api.startRun();assert.equal(r.last('roguelite').choosingUpgrade,true);assert.equal(r.api.getState(),'choosingUpgrade');const choice=r.last('roguelite').offer[0].id;assert.ok(r.api.chooseUpgrade(choice));assert.equal(r.api.chooseUpgrade(choice),false);assert.ok(r.saved.checkpoint.defeated.includes('root-0'));
 for(let i=0;i<5;i++){r.hook.world.status='dead';r.hook.world.player.hp=0;r.advance(20);assert.equal(r.api.getState(),'lost');assert.ok(r.api.startRun());assert.equal(r.hook.world.upgrades[choice],1);assert.equal(r.hook.envelope.deaths,i+1);}r.api.destroy();
});
test('controller: rejected storage is visible, retry works, continue resumes position without advancing offline time',()=>{
 const w=world({fail:true});w.api.startRun();assert.equal(w.last('recordSave').pending,true);w.setFail(false);assert.ok(w.api.retrySave());assert.equal(w.last('recordSave').pending,false);w.api.setDir(1,0,{source:'key:d'});w.advance(300);w.api.pauseRun();const save=w.saved,x=w.hook.world.player.x,t=w.hook.world.time;w.api.destroy();
 const r=world({saved:save});assert.equal(r.last('rogueMenu').hasSave,true);r.api.startRun();assert.equal(r.hook.world.player.x,x);assert.equal(r.hook.world.time,t);r.advance(100);assert.equal(r.hook.world.player.x,x);r.api.destroy();
});
test('fuzz: continuous positions, health, state/save bounds and one global damage window remain valid',()=>{
 for(let seed=1;seed<=8;seed++){const rng=createRng(seed),s=S.createJourney();for(let i=0;i<1200&&s.status==='playing';i++){S.stepJourney(s,{x:rng()*2-1,y:rng()*2-1});if(i%120===0)S.action(s,'dash');assert.ok(G.fits(W.bindGeometry(s),s.player.x,s.player.y,.23));assert.ok(s.player.hp>=0&&s.player.hp<=100);assert.equal(s.tail.length,7);s.events=[];}assert.ok(P.validJourney(s));}
});


test('full campaign: real continuous inputs and actions defeat all six minibosses and nine boss phases without teleporting or changing HP',async()=>{
 const {replayExpedition}=await import('./helpers/expedition-driver.mjs');const result=replayExpedition({W,S,C,G,P});assert.equal(result.state.status,'won');assert.equal(result.state.defeated.length,9);assert.equal(result.log.filter(e=>e.event==='defeat').length,9);assert.ok(result.state.player.hp>0);assert.ok(P.validJourney(result.state));
});
test('trap crossing: every authored strip can be cleared by the entire snake during its safe interval',()=>{
 for(const w of W.WORLDS)for(const trap of w.traps){const s=S.createJourney();s.region=w.region;s.defeated=W.WORLDS.flatMap(w=>w.encounters.map(e=>e.id));s.time=trap.period*3-trap.offset;
  const mid=(trap.lo+trap.hi+1)/2;
  if(trap.axis==='row')setPos(s,mid,trap.at+3.5);else setPos(s,trap.at+3.5,mid);
  s.player.angle=trap.axis==='row'?-Math.PI/2:Math.PI;S.resetTail(s);s.player.shield=0;tick(s,180,trap.axis==='row'?{x:0,y:-1}:{x:-1,y:0});assert.equal(s.player.hp,100,w.id+'/'+trap.id);assert.ok(s.tail.every(p=>trap.axis==='row'?p.y<trap.at-.2:p.x<trap.at-.2),w.id+'/'+trap.id+' whole tail clears');assert.equal(W.trapStage(trap,s.time),'safe');
 }
});


test('controller: a real completed simulation records one campaign victory; starting anew preserves its record',async()=>{
 const {replayExpedition}=await import('./helpers/expedition-driver.mjs'),result=replayExpedition({W,S,C,G,P}),w=world();w.api.startRun();Object.assign(w.hook.world,result.state);w.advance(20);assert.equal(w.api.getState(),'won');const record=w.rs.records[EXPEDITION_RECORD_KEY];assert.equal(record.plays,1);assert.equal(record.wins,1);w.advance(2000);assert.equal(w.rs.records[EXPEDITION_RECORD_KEY].plays,1);w.api.startRun();assert.equal(w.hook.world.defeated.length,0);assert.equal(w.rs.records[EXPEDITION_RECORD_KEY].wins,1);w.api.destroy();
});

function clearEncounter(s,def){
 const e=s.enemies.find(e=>e.id===def.id);setPos(s,def.shrine.x,def.shrine.y);assert.ok(C.beginEncounter(s,e));
 while(e.stage!=='dead'){s.pods=[];e.stage='recover';C.hitEnemy(s,e,99999,true);}assert.ok(S.chooseAbility(s,s.offer[0]));s.events=[];
}
test('return portal: a real pursuing crawler warning is retired and autosave/checkpoint remain valid across the round trip',()=>{
 const env=P.freshSave(),s=env.current;for(const def of W.WORLDS[0].encounters)clearEncounter(s,def);setPos(s,27.5,4.5);assert.ok(S.interact(s));env.checkpoint=S.checkpointCopy(s);s.events=[];
 const step=input=>{S.stepJourney(s,input);if(s.player.hp<40)S.action(s,'food');s.events=[];};
 function travel(x,y){let n=0;while(Math.hypot(s.player.x-x,s.player.y-y)>.07&&n++<600){const d=Math.hypot(s.player.x-x,s.player.y-y);step({x:(x-s.player.x)/d*.35,y:(y-s.player.y)/d*.35});}assert.ok(n<600);}
 travel(11.5,35.5);step({x:-.05,y:0});for(let i=0;i<240;i++)step();travel(5.5,35.5);travel(5.5,34.5);let n=0;while(!s.hazards.length&&n++<500)step();
 assert.ok(s.hazards.length,'real crawler attack is pending');assert.equal(S.nearby(s)?.type,'back');assert.ok(P.parseSave(JSON.stringify(env)));
 const w=world({saved:env});w.api.startRun();assert.ok(w.api.action('interact'));assert.equal(w.hook.world.region,0);assert.deepEqual(w.hook.world.hazards,[]);assert.equal(w.last('recordSave').pending,false);assert.ok(P.parseSave(JSON.stringify(w.saved)));assert.equal(w.hook.world.enemies.find(e=>e.id==='spore-scout0').stage,'idle');
 assert.ok(w.api.action('interact'));assert.equal(w.hook.world.region,1);assert.ok(P.parseSave(JSON.stringify(w.saved)));assert.ok(P.parseSave(JSON.stringify(P.restoreCheckpoint(w.saved))));w.api.destroy();
});
test('phase transition save: all three bosses resume a partially elapsed transition once, preserving player HP',()=>{
 for(let region=0;region<3;region++){
  const env=P.freshSave(),s=env.current;for(let r=0;r<=region;r++){s.region=r;for(const def of W.WORLDS[r].encounters.slice(0,r<region?3:2))clearEncounter(s,def);}
  env.checkpoint=S.checkpointCopy(s);const def=W.WORLDS[region].encounters[2],e=s.enemies.find(e=>e.id===def.id);setPos(s,def.shrine.x,def.shrine.y);s.player.hp=61;C.beginEncounter(s,e);e.stage='recover';C.hitEnemy(s,e,99999);tick(s,30);s.events=[];assert.ok(P.parseSave(JSON.stringify(env)));
  const w=world({saved:env});w.api.startRun();const boss=w.hook.world.enemies.find(e=>e.id===def.id);assert.equal(boss.stage,'transition');assert.equal(boss.hp,0);w.advance(800);assert.equal(boss.hp,0);w.api.pauseRun();const saved=w.saved;w.api.destroy();const resumed=world({saved});resumed.api.startRun();resumed.advance(400);const next=resumed.hook.world.enemies.find(e=>e.id===def.id);assert.equal(next.phase,2);assert.equal(next.stage,'recover');assert.equal(next.hp,next.phaseHp[1]);assert.equal(resumed.hook.world.player.hp,61);resumed.api.destroy();
 }
});
test('pending upgrade: return to menu preserves the choice but only continue can reopen and apply it',()=>{
 const w=world();w.api.startRun();const e=w.hook.world.enemies[0];C.beginEncounter(w.hook.world,e);e.stage='recover';C.hitEnemy(w.hook.world,e,99999);w.advance(20);const offer=w.hook.world.offer.slice();w.api.returnToMenu();assert.equal(w.last('roguelite').choosingUpgrade,false);assert.equal(w.api.chooseUpgrade(offer[0]),false);assert.deepEqual(w.hook.world.offer,offer);w.api.startRun();assert.equal(w.api.getState(),'choosingUpgrade');assert.ok(w.api.chooseUpgrade(offer[0]));assert.equal(w.hook.world.upgrades[offer[0]],1);w.api.destroy();
});

// Enemy regressions: these exercise real simulation timing and movement rather than changing outcomes.
test('leap impact: telegraph and flight cannot hurt before the monster reaches its landing point',()=>{
 const s=S.createJourney(),def=W.WORLDS[0].encounters[1],e=s.enemies.find(e=>e.id===def.id);setPos(s,def.shrine.x,def.shrine.y);s.player.shield=0;s.player.biteAt=999;C.beginEncounter(s,e);let landed=false;
 for(let i=0;i<400;i++){const hp=s.player.hp;S.stepJourney(s);if(s.player.hp<hp){assert.ok(G.distance(e,e.mark)<.1,'impact follows landing');landed=true;break;}}
 assert.ok(landed,'a stationary player is struck on landing');
});
test('leap destination: a distant legal target is reached before recovery without passing through stone',()=>{
 const s=S.createJourney(),e=s.enemies.find(e=>e.type==='mantis');setPos(s,41.5,25.5);s.player.biteAt=999;C.beginEncounter(s,e);let flying=false,done=false;
 for(let i=0;i<500;i++){S.stepJourney(s);assert.ok(G.fits(W.bindGeometry(s),e.x,e.y,.49));if(e.stage==='active'&&e.pattern==='leap')flying=true;if(flying&&e.stage==='recover'){assert.ok(G.distance(e,e.mark)<.1,'land on the announced point');done=true;break;}}
 assert.ok(done);
});
test('charge impact: a warning lane cannot hurt a distant player before the charging body reaches it',()=>{
 const s=S.createJourney(),e=s.enemies.find(e=>e.type==='boar');setPos(s,16.5,21.5);s.player.shield=0;s.player.biteAt=999;C.beginEncounter(s,e);let hit=false;
 for(let i=0;i<400;i++){const hp=s.player.hp;S.stepJourney(s);if(s.player.hp<hp){assert.ok(s.tail.some(p=>G.distance(p,e)<1),'contact follows the moving body');hit=true;break;}}
 assert.ok(hit);
});
test('enemy navigation: route around an available camp to pursue a player outside its safe radius',()=>{
 const s=S.createJourney(),e=s.enemies.find(e=>e.id==='root-scout0');setPos(s,5.5,34.5);s.player.angle=Math.PI;s.player.biteAt=999;e.x=9.5;e.y=34.5;let hit=false;
 for(let i=0;i<900;i++){S.stepJourney(s);assert.ok(G.distance(e,W.WORLDS[0].camps[0])>=1.5-1e-6);if(s.player.shield===0||s.player.hp<100){hit=true;break;}}
 assert.ok(hit,'the enemy must take the available bypass rather than freeze');assert.ok(P.validJourney(s));
});
test('enemy traffic: two returning crawlers pass each other in a wide corridor without overlap or deadlock',()=>{
 const s=S.createJourney(),a=s.enemies.find(e=>e.id==='root-scout0'),b=s.enemies.find(e=>e.id==='root-scout1');a.x=20.5;a.y=32.5;b.x=18.5;b.y=32.5;
 for(let i=0;i<1500;i++){S.stepJourney(s);assert.ok(G.distance(a,b)>=.57,'bodies do not overlap');}
 assert.ok(G.distance(a,a.anchor)<.2,'first returns home');assert.ok(G.distance(b,b.anchor)<.2,'second returns home');
});
test('encounter isolation: starting a miniboss cancels a regular enemy windup already aimed at the shrine',()=>{
 const s=S.createJourney(),boss=s.enemies.find(e=>e.type==='boar'),mob=s.enemies.find(e=>e.id==='root-scout0');setPos(s,10.5,26);s.player.shield=0;s.player.biteAt=999;mob.x=11.3;mob.y=26;C.combatStep(s,0,S.hurt);assert.ok(s.hazards.some(h=>h.owner===mob.id));C.beginEncounter(s,boss);tick(s,65);assert.equal(s.player.hp,100);assert.ok(!s.hazards.some(h=>h.owner===mob.id));
});
test('body hit visibility: hiding the head does not protect an exposed tail from a line attack',()=>{
 const s=S.createJourney(),mob=s.enemies.find(e=>e.type==='spitter');s.player.x=23.25;s.player.y=6.05;s.player.shield=0;s.player.biteAt=999;s.trail=[{x:23.25,y:6.05},{x:23.25,y:5.75},{x:21.75,y:5.75},{x:21.75,y:6.05}];s.tail=[...s.trail];mob.x=20.5;mob.y=6.05;mob.stage='recover';mob.until=10;
 s.hazards=[{owner:mob.id,region:0,shape:'line',from:{x:20.5,y:6.05},to:{x:21.75,y:6.05},radius:.22,start:0,end:1,damage:8}];assert.equal(G.lineOfSight(W.bindGeometry(s),mob,s.player),false);S.stepJourney(s);assert.equal(s.player.hp,92);
});

test('legacy save: unfinished v21 leap gets a fresh landing warning without losing progress or HP',()=>{
 const env=P.freshSave(),s=env.current,e=s.enemies.find(e=>e.type==='mantis');setPos(s,35.5,26);s.player.hp=67;s.inventory.coins=25;C.beginEncounter(s,e);tick(s,220);assert.equal(e.stage,'active');
 delete s.combatRevision;delete env.checkpoint.combatRevision;delete e.leapAt;delete e.leapUntil;delete e.landed;for(const h of s.hazards){delete h.motion;h.start=s.time-.1;h.end=s.time+.3;}
 const loaded=P.parseSave(JSON.stringify(env));assert.ok(loaded);assert.equal(loaded.current.combatRevision,2);assert.equal(loaded.current.player.hp,67);assert.equal(loaded.current.inventory.coins,25);assert.equal(loaded.current.active,e.id);assert.ok(loaded.current.hazards.every(h=>h.start>loaded.current.time));assert.ok(P.parseSave(JSON.stringify(loaded)));S.stepJourney(loaded.current);assert.equal(loaded.current.player.hp,67);
});
test('midair save: flight resumes at the same position and lands once with the same damage',()=>{
 const env=P.freshSave(),s=env.current,e=s.enemies.find(e=>e.type==='mantis');setPos(s,35.5,26);s.player.shield=0;s.player.biteAt=999;C.beginEncounter(s,e);tick(s,220);assert.equal(e.stage,'active');assert.equal(e.landed,false);const loaded=P.parseSave(JSON.stringify(env));assert.ok(loaded);
 tick(s,60);tick(loaded.current,60);const resumed=loaded.current.enemies.find(n=>n.id===e.id);assert.equal(resumed.x,e.x);assert.equal(resumed.y,e.y);assert.equal(loaded.current.player.hp,s.player.hp);assert.equal(resumed.stage,e.stage);
});
test('camp unlock: a living enemy already inside a newly available camp can leave safely',()=>{
 const s=S.createJourney(),def=W.WORLDS[0].encounters[0],boss=s.enemies.find(e=>e.id===def.id),mob=s.enemies.find(e=>e.id==='root-scout0'),camp=W.WORLDS[0].camps[1];boss.stage='dead';boss.hp=0;s.defeated.push(def.id);mob.x=camp.x;mob.y=camp.y;
 for(let i=0;i<1500;i++)S.stepJourney(s);assert.ok(G.distance(mob,camp)>1.5);assert.ok(G.distance(mob,mob.anchor)<.2);assert.ok(P.validJourney(s));
});
test('moving attacks: a wall stops a diagonal charge without sliding along it',()=>{
 const s=S.createJourney(),e=s.enemies.find(e=>e.type==='boar');setPos(s,12.5,23.5);C.beginEncounter(s,e);e.x=6.4;e.y=20.5;e.stage='active';e.pattern='charge';e.chargeDir={x:Math.SQRT1_2,y:Math.SQRT1_2};e.until=10;s.hazards=[];let stopped=false;
 for(let i=0;i<180;i++){const before={x:e.x,y:e.y};C.combatStep(s,1/60,S.hurt);s.time+=1/60;assert.ok(Math.abs((e.x-6.4)-(e.y-20.5))<.000001,'charge follows its fixed line');if(e.stage==='recover'){stopped=true;break;}}
 assert.ok(stopped);
});

test('legacy encounter isolation: loading an old boss save retires regular attacks without resurrecting dead mobs',()=>{
 const env=P.freshSave(),s=env.current,boss=s.enemies.find(e=>e.type==='boar'),mob=s.enemies.find(e=>e.id==='root-scout0'),dead=s.enemies.find(e=>e.id==='root-scout1');setPos(s,10.5,26);s.player.shield=0;C.beginEncounter(s,boss);delete s.combatRevision;delete env.checkpoint.combatRevision;mob.stage='windup';mob.until=.8;mob.x=11.3;mob.y=26;dead.stage='dead';dead.hp=0;s.hazards=[{owner:mob.id,region:0,shape:'circle',x:s.player.x,y:s.player.y,radius:.65,start:.8,end:1.1,damage:8}];
 const loaded=P.parseSave(JSON.stringify(env));assert.ok(loaded);assert.deepEqual(loaded.current.hazards,[]);assert.equal(loaded.current.enemies.find(e=>e.id===dead.id).stage,'dead');tick(loaded.current,65);assert.equal(loaded.current.player.hp,100);
});
test('short leap: even a hop at the current position has a visible flight interval before impact',()=>{
 const s=S.createJourney(),e=s.enemies.find(e=>e.type==='mantis');setPos(s,e.x,e.y);s.player.shield=0;s.player.biteAt=999;C.beginEncounter(s,e);while(e.stage!=='active')S.stepJourney(s);const launch=s.time;tick(s,5);assert.equal(s.player.hp,100);assert.equal(e.landed,false);tick(s,5);assert.equal(s.player.hp,90);assert.ok(s.time-launch>=.12);
});

test('node shield: thorns cannot bypass live protection nodes, and damaging the nodes still opens the enemy',()=>{
 const s=S.createJourney(),e=s.enemies.find(e=>e.type==='fungus');s.region=1;for(const d of W.WORLDS[0].encounters){s.defeated.push(d.id);const a=s.enemies.find(a=>a.id===d.id);a.hp=0;a.stage='dead';}setPos(s,e.x+1,e.y);s.player.shield=0;s.upgrades.thorns=3;C.beginEncounter(s,e);s.player.invulnUntil=0;const hp=e.hp;assert.ok(S.hurt(s,8,'attack'));assert.equal(e.hp,hp,'retaliation does not bypass the two live nodes');s.pods.forEach(p=>p.hp=0);s.player.invulnUntil=0;S.hurt(s,8,'attack');assert.equal(e.hp,hp-18,'retaliation works after the shield is removed');
});
