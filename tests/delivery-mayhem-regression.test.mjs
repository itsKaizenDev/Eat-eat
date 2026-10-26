import test from 'node:test';import assert from 'node:assert/strict';
import {root,createRng,makeDeliveryWorld,recordsLib} from './helpers/env.mjs';
const load=name=>import(root+'/node_modules/.cache/snake-tests/delivery/'+name+'.mjs');
const {cityLayout}=await load('city'),{MISSIONS}=await load('missions'),D=await load('sim'),P=await load('progress'),{resolveDeliveryTurn}=await load('turns');
test('Mayhem: initial queues replay real movement, cargo, hazards and deadlines for 288 mission/difficulty/speed/seed configurations',()=>{
 for(const difficulty of ['normal','hard'])for(const mission of MISSIONS)for(const interval of [100,140,180])for(const seed of [0,1,2,3]){
  const cfg={...mission,difficulty},city=cityLayout(cfg,seed),arena=D.parseArena(city.map,city.start,city),state=D.createState({arena,config:cfg,rng:createRng(seed+1),interval,t:0});
  assert.ok(state.orders.length>0);const order=state.orders.at(-1),proof=D.proveOrder(state,order);
  assert.ok(proof,`${difficulty}/${mission.number}/${interval}/${seed}`);const replay=D.cloneState(state);D.replayInputs(replay,proof.path);
  assert.notEqual(replay.status,'lost');assert.equal(replay.stale,0,`${difficulty}/${mission.number}/${interval}/${seed}`);assert.ok(replay.completed.some(c=>c.id===order.id));assert.equal(replay.snake.length,replay.baseLen+replay.cargo.reduce((n,c)=>n+(c.size||1),0));
 }
});
test('Mayhem: default controller uses the roomy map, orchard addresses and first mission settings',()=>{
 const w=makeDeliveryWorld();const h=w.last('delivery');assert.equal(w.x.sim.arena.w,25);assert.equal(w.x.sim.arena.h,23);assert.equal(h.target,3);assert.equal(h.timeText,'1:30');assert.equal(h.capacity,2);assert.equal(h.orders.length,1);assert.deepEqual(h.sites,{A:'Lumbung',B:'Kandang',C:'Kios'});w.eng.destroy();
});
test('Mayhem: Normal and Hard keep separate progress and record keys; old progress remains Hard',()=>{
 const previous=globalThis.localStorage,store={};globalThis.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}};
 try{store[P.DELIVERY_PROGRESS_KEY]=JSON.stringify({version:2,unlocked:7,missions:{'courier-1':{score:120,stars:3}}});assert.equal(P.loadDeliveryProgress().unlocked,1);assert.equal(P.loadDeliveryProgress('hard').unlocked,7);P.saveDeliveryProgress({version:2,unlocked:2,missions:{}},'normal');assert.equal(P.loadDeliveryProgress('hard').unlocked,7);assert.equal(P.loadDeliveryProgress('normal').unlocked,2);assert.notEqual(recordsLib.deliveryConfigKey({...MISSIONS[0],difficulty:'normal'},'normal'),recordsLib.deliveryConfigKey({...MISSIONS[0],difficulty:'hard'},'normal'));}finally{globalThis.localStorage=previous;}
});
test('Mayhem: early turn assistance waits for the Normal opening; Hard keeps precision steering',()=>{
 for(const difficulty of ['normal','hard']){const cfg={...MISSIONS[0],difficulty,turnLead:difficulty==='normal'?2:0},city=cityLayout(cfg,0),s=D.createState({arena:D.parseArena(city.map,city.start,city),config:cfg,rng:createRng(1),interval:140,t:0});
  s.snake=difficulty==='normal'?[{x:6,y:19},{x:5,y:19},{x:4,y:19}]:[{x:6,y:13},{x:5,y:13},{x:4,y:13}];s.dir={x:1,y:0};const turn=resolveDeliveryTurn(s,{x:0,y:-1});assert.equal(!!turn.pending,difficulty==='normal');
 }
});
