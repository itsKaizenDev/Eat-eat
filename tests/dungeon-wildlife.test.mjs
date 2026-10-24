import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle as P, geometry as G, progressLib as R, makePuzzleWorld } from './helpers/env.mjs';
import { room, guard, pt, advance, withWall } from './puzzle.fixtures.mjs';

const dog = (x=7,y=4,extra={}) => ({...pt(x,y),route:[pt(x,y),pt(x,6)],facing:0,range:4.8,speed:4.8,tethered:true,leash:2.3,...extra});
const beast = (extra={}) => ({id:'shadow',...pt(1,4),dx:1,dy:0,length:8,speed:8,entrance:'false-door',...extra});
const hazard = (extra={}) => ({id:'spikes',...pt(5,4),kind:'spikes',period:5.5,phase:2,active:1.25,...extra});

test('torch: full circular radius illuminates behind and beside it, with matching clipped rays',()=>{
  const s=P.createState(room({torches:[{...pt(6,4),range:3,facing:0,fov:.1}]})),t=s.level.torches[0];
  for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:t.x+Math.cos(a)*2,y:t.y+Math.sin(a)*2};assert.equal(P.isLit(s,p),true);}
  assert.equal(P.isLit(s,pt(10,4)),false);assert.equal(P.torchView(s,t).fov,Math.PI*2);
  const b=P.createState(withWall(s.level,7,4));assert.equal(P.isLit(b,pt(8,4)),false);
  assert.ok(G.conePoints(b,P.torchView(b,t),96).every(p=>G.distance(p,t)<=3+1e-8));
});
test('patrol: sustained progress and idle facing follow the corridor instead of oscillating or staring into walls',()=>{
  const s=P.createState(room({guards:[guard(3,4,{range:0,route:[pt(3,4),pt(9,4)],facing:0,dwell:1,pause:1})]})),g=s.guards[0];
  advance(s,4);assert.ok(g.x>6.3);assert.ok(Math.abs(g.y-4.5)<.05);advance(s,3.5);
  assert.ok(g.pause>0);assert.ok(Math.abs(G.angleDelta(g.facing,Math.PI))<.02);
  let l=room({guards:[guard(3,4,{range:0,route:[pt(3,4),pt(8,4)],facing:Math.PI/2})]});
  for(let y=2;y<6;y++)l=withWall(l,5,y);
  const b=P.createState(l);advance(b,13);assert.ok(b.guards[0].x>5.5);assert.ok(G.fits(b,b.guards[0].x,b.guards[0].y,.21));
});
test('powers: independent ten-second cooldowns, no depletion, pause freezes recovery and restart restores readiness',()=>{
  const s=P.createState(room());assert.equal(P.action(s,'gadget'),true);assert.equal(P.action(s,'gadget'),false);
  P.action(s,'cycle');assert.equal(s.gadget,'smoke');assert.equal(P.action(s,'gadget'),true);
  P.action(s,'cycle');assert.equal(s.gadget,'trap');assert.equal(P.action(s,'gadget'),true);assert.equal(s.traps.length,1);
  P.action(s,'cycle');assert.equal(s.gadget,'stone');advance(s,9.9);assert.equal(P.action(s,'gadget'),false);advance(s,.2);assert.equal(P.action(s,'gadget'),true);
  const w=makePuzzleWorld({levels:[room()]});w.eng.startRun();w.eng.action('gadget');w.advance(1000);w.eng.pauseRun();const wait=w.last('puzzle').gadgetWait;w.advance(15000);assert.equal(w.last('puzzle').gadgetWait,wait);
  w.eng.resumeRun();w.advance(9100);assert.equal(w.last('puzzle').gadgetWait,0);w.eng.restartLevel();assert.deepEqual(w.x.world.cooldowns,{stone:0,smoke:0,trap:0});w.eng.destroy();
});
test('failed tool placement/throw does not start cooldown and player traps are safe for the snake',()=>{
  const s=P.createState(withWall(room({spawn:{x:3.75,y:2.5}}),4,2));assert.equal(P.action(s,'gadget'),false);assert.equal(P.gadgetWait(s),0);
  s.gadget='trap';assert.equal(P.action(s,'gadget'),true);advance(s,2);assert.equal(s.status,'playing');assert.equal(s.traps.length,1);
  s.cooldowns.trap=0;assert.equal(P.action(s,'gadget'),false);assert.equal(s.cooldowns.trap,0);advance(s,29);assert.equal(s.traps.length,0);
  const expired=P.createState(room({guards:[guard(5,4,{range:0,pause:10})]}));expired.traps.push({...pt(5,4),armedAt:0,until:0,spent:false});P.step(expired);assert.equal(expired.guards[0].stunnedUntil,0);assert.equal(expired.traps.length,0);
});
test('dog: wide detection and barking alerts nearby guards but not distant guards or guards behind stone',()=>{
  const l=room({width:25,map:['#'.repeat(25),...Array(7).fill('#'+'.'.repeat(23)+'#'),'#'.repeat(25)],spawn:pt(3,4),dogs:[dog()],guards:[guard(10,6,{range:0,pause:20}),guard(21,6,{range:0,pause:20})]});
  const s=P.createState(l);advance(s,.6);assert.ok(s.noises.some(n=>n.type==='bark'));assert.equal(s.alerts,1);assert.equal(s.guards[0].state,'SUSPICIOUS');assert.equal(s.guards[1].state,'PATROL');
  assert.ok(s.guards[0].lastKnown.x>7);assert.ok(s.guards[0].lastKnown.x>s.player.x);
  let blocked=l;for(let y=1;y<8;y++)blocked=withWall(blocked,9,y);
  const b=P.createState(blocked);advance(b,.6);assert.equal(b.guards[0].state,'PATROL');
});
test('dog: tether strictly limits pursuit; an unleashed dog moves faster than running snake',()=>{
  const s=P.createState(room({spawn:pt(3,4),dogs:[dog()]})),d=s.dogs[0];
  for(let i=0;i<450;i++){P.step(s);assert.ok(G.distance(d,d.home)<=d.leash+1e-8);assert.ok(G.fits(s,d.x,d.y,.21));}
  assert.equal(s.status,'playing');assert.equal(s.alerts,1);
  const free=P.createState(room({spawn:pt(3,4),dogs:[dog(7,4,{tethered:false})]}));advance(free,.55);const x=free.dogs[0].x;advance(free,.2);
  assert.ok(x-free.dogs[0].x>P.SPEEDS.run*.2);advance(free,2);assert.equal(free.status,'lost');assert.match(free.lossReason,/anjing/);
});
test('dog: walls, closed doors and smoke block detection; it follows last-known position after losing sight',()=>{
  for(const kind of ['wall','door','smoke']){
    let l=room({spawn:pt(3,4),dogs:[dog()]});if(kind==='wall')l=withWall(l,5,4);if(kind==='door')l.doors=[{id:'d',...pt(5,4),kind:'key',key:'a'}];
    const s=P.createState(l);if(kind==='smoke'){s.gadget='smoke';P.action(s,'gadget');}advance(s,.6);assert.equal(s.alerts,0,kind);
  }
  const s=P.createState(room({spawn:pt(3,4),dogs:[dog()]}));advance(s,.6);const seen={...s.dogs[0].lastKnown};s.player={...s.player,...pt(1,1)};advance(s,1);assert.deepEqual(s.dogs[0].lastKnown,seen);
});
test('shadow: telegraph allows side-step; rush never changes its fixed lane',()=>{
  const s=P.createState(room({spawn:pt(5,4),beasts:[beast()]}));P.step(s);assert.equal(s.beasts[0].state,'WINDUP');assert.equal(s.status,'playing');
  advance(s,.5,{y:1,gait:'run'});advance(s,1.2);assert.equal(s.status,'playing');assert.equal(s.beasts[0].y,4.5);assert.equal(s.beasts[0].dx,1);
  advance(s,6);assert.equal(s.beasts[0].state,'IDLE');assert.equal(s.beasts[0].x,1.5);
});
test('shadow: eats snake, guard and dog on its lane; removed enemies never react to CCTV or bark again',()=>{
  const s=P.createState(room({beasts:[beast()],guards:[guard(4,4,{range:0,pause:20})],dogs:[dog(6,4,{range:0})]}));s.guards[0].stunnedUntil=3;s.dogs[0].stunnedUntil=3;advance(s,2);
  assert.equal(s.guards[0].alive,false);assert.equal(s.dogs[0].alive,false);assert.equal(s.status,'playing');
  const dead=[s.guards[0].x,s.dogs[0].x];P.noise(s,pt(5,4),8,1,2,'bark');advance(s,5);assert.deepEqual([s.guards[0].x,s.dogs[0].x],dead);assert.equal(s.alerts,0);
  s.crystals.push({...pt(5,2),facing:Math.PI,baseFacing:Math.PI,sweep:0,phase:0,rate:0,range:5,fov:1});P.step(s);assert.equal(s.cameraAlarm,true);assert.equal(s.guards[0].cameraReport,false);assert.equal(s.dogs[0].barkUntil,0);
  const snake=P.createState(room({spawn:pt(5,4),beasts:[beast()]}));advance(snake,1.8);assert.equal(snake.status,'lost');assert.match(snake.lossReason,/bayangan/);
});
test('shadow: occluding walls block triggers and a closing door stops the rush',()=>{
  const s=P.createState(withWall(room({spawn:pt(5,4),beasts:[beast()]}),4,4));advance(s,2);assert.equal(s.beasts[0].state,'IDLE');
  const b=P.createState(room({spawn:pt(8,4),beasts:[beast()],doors:[{id:'d',...pt(4,4),kind:'key',key:'a'}]}));b.opened.add('d');advance(b,.9);b.opened.delete('d');advance(b,.8);assert.ok(b.beasts[0].x<4);assert.equal(b.status,'playing');
});
test('player trap: holds guards and dogs then releases them; stops a shadow before prey farther along the lane',()=>{
  for(const type of ['guards','dogs']){
    const s=P.createState(room({[type]:[type==='guards'?guard(5,4,{range:0,pause:20}):dog(5,4,{range:0})]})),a=s[type][0];
    s.traps.push({...pt(5,4),armedAt:0,until:30,spent:false});P.step(s);assert.ok(a.stunnedUntil>s.time+4);const p={x:a.x,y:a.y};advance(s,4);assert.deepEqual({x:a.x,y:a.y},p);assert.equal(s.traps.length,0);advance(s,.6);assert.ok(a.stunnedUntil<s.time);
  }
  const s=P.createState(room({spawn:pt(6,4),beasts:[beast()]}));s.traps.push({...pt(4,4),armedAt:0,until:30,spent:false});advance(s,1.6);
  assert.ok(s.beasts[0].stunnedUntil>s.time);assert.equal(s.beasts[0].state,'RETURN');assert.equal(s.status,'playing');assert.ok(s.beasts[0].x<=4.5);advance(s,5);assert.equal(s.status,'playing');
});
test('a charging dog hits an armed trap before biting a player standing on it',()=>{
  const s=P.createState(room({spawn:pt(3,4),dogs:[dog(7,4,{tethered:false})]}));s.gadget='trap';P.action(s,'gadget');
  advance(s,1.6);assert.equal(s.status,'playing');assert.ok(s.dogs[0].stunnedUntil>s.time);assert.equal(s.traps.length,0);
});
test('floor spikes: safe phase is walkable, active phase is fatal; guards/dogs are stunned instead',()=>{
  const safe=P.createState(room({spawn:pt(5,4),hazards:[hazard()]}));advance(safe,.2);assert.equal(safe.status,'playing');
  const danger=P.createState(room({spawn:pt(5,4),hazards:[hazard({phase:0})]}));P.step(danger);assert.equal(danger.status,'lost');assert.match(danger.lossReason,/duri/);
  for(const type of ['guards','dogs']){const s=P.createState(room({hazards:[hazard({phase:0})],[type]:[type==='guards'?guard(5,4):dog(5,4)]}));P.step(s);assert.ok(s[type][0].stunnedUntil>s.time);assert.equal(s[type][0].alive,true);}
});
test('Apple Coin: value-five pickups pay only on clear, preserve old records and reward only improvements',()=>{
  const l=room({revision:6,spawn:pt(2,2),exit:pt(4,2),artifacts:[{id:'r',...pt(3,2),kind:'artifact'}],loot:[{id:'c',...pt(3,2),kind:'loot',value:5}]}),s=P.createState(l);
  advance(s,1.2,{x:1});assert.equal(s.status,'won');assert.equal(s.result.loot,1);assert.equal(s.result.coinReward,5);
  const old={v:1,puzzle:{levels:{'jk-1':{best:25,coins:2,heist:{revision:5,bestTimeMs:100,stars:3,loot:2,fewestAlerts:0}}}}};
  const r=R.recordHeistResult(old,'jk-1',s.result,6);assert.equal(r.earned,3);assert.equal(r.progress.puzzle.levels['jk-1'].best,25);assert.equal(r.progress.puzzle.levels['jk-1'].heist.revision,6);
  assert.equal(R.recordHeistResult(r.progress,'jk-1',s.result,6).earned,0);assert.equal(R.appleCoins(R.mergeProgress(old,r.progress)),5);
});
