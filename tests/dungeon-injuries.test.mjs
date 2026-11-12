import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle as P, threats, root, makePuzzleWorld, validation as V } from './helpers/env.mjs';
import { room, guard, pt, advance } from './puzzle.fixtures.mjs';
const { mobileActors } = await import(root + '/node_modules/.cache/snake-tests/puzzle/navigation.mjs');
const { speedFactor } = await import(root + '/node_modules/.cache/snake-tests/puzzle/geometry.mjs');
const dog = (x,y,extra={}) => ({...pt(x,y),route:[pt(x,y),pt(x,y+1)],facing:0,range:3,speed:4.8,tethered:true,leash:2,...extra});
const spike = {id:'spike',...pt(5,4),period:5.5,phase:0,active:1.25};
const effects = {note:P.note,lose:()=>assert.fail('NPC damage must not lose the player run')};
const beasts = [
  {id:'shadow',kind:'shadow',...pt(1,4),dx:1,dy:0,length:8,speed:8,windup:1.2},
  {id:'mimic',kind:'mimic',...pt(2,4),mouth:pt(3,4),trigger:1.5,reach:1.15,windup:.9,recover:2.2},
  {id:'spider',kind:'spider',...pt(3,4),web:1.9,strike:.55,windup:1.2,recover:3},
];

test('spikes wound guards and dogs once per activation, then bleed for four seconds', () => {
  for (const kind of ['guards','dogs']) {
    const level=room({spawn:pt(10,1),hazards:[spike],[kind]:[kind==='guards'?guard(5,4,{pause:20,facing:0}):dog(5,4)]});
    const before=JSON.stringify(level),s=P.createState(level),a=s[kind][0],max=kind==='guards'?100:70;
    P.step(s,{},P.FIXED_DT);
    assert.equal(a.hp,max-35);assert.ok(a.stunnedUntil>s.time);assert.ok(a.bleedUntil>s.time);
    for(let i=0;i<10;i++)threats.updateTraps(s,effects);
    assert.equal(a.hp,max-35);
    Object.assign(a,pt(8,6),{pause:30});advance(s,4.1);
    assert.equal(a.hp,max-55);assert.equal(a.bleedUntil,0);
    advance(s,1);assert.equal(a.hp,max-55);assert.equal(JSON.stringify(level),before);
  }
});

test('bleeding can kill later and dead guards release traffic, charges and alarms', () => {
  const s=P.createState(room({spawn:pt(10,1),hazards:[spike],guards:[guard(5,4,{pause:50,facing:0})]})),a=s.guards[0];
  P.step(s,{},P.FIXED_DT);Object.assign(a,pt(8,6));advance(s,5.49);
  Object.assign(a,pt(5,4));P.step(s,{},P.FIXED_DT);
  assert.equal(a.hp,10);assert.equal(a.alive,true);
  Object.assign(a,pt(8,6),{charge:{state:'brace'},cameraReport:true});
  s.traffic['test-lane']={owner:a.id};s.traffic['empty-lane']=undefined;
  advance(s,2.1);
  assert.equal(a.hp,0);assert.equal(a.alive,false);assert.equal(a.deathReason,'bleeding');
  assert.equal(a.charge,null);assert.equal(a.cameraReport,false);assert.equal(a.bleedNextAt,0);
  assert.equal(mobileActors(s).length,0);assert.equal(s.traffic['test-lane'],undefined);
  const position={x:a.x,y:a.y};P.noise(s,pt(6,4),8,1,2,'bark');advance(s,2);
  assert.deepEqual({x:a.x,y:a.y},position);assert.equal(s.alerts,0);assert.equal(s.status,'playing');
});

test('separate spike plates deal separate wounds and bleeding slows only the wounded NPC', () => {
  const s=P.createState(room({spawn:pt(10,1),hazards:[spike,{...spike,id:'second',...pt(8,6)}],guards:[guard(5,4,{pause:30,facing:0})]})),a=s.guards[0];
  P.step(s,{},P.FIXED_DT);Object.assign(a,pt(8,6));P.step(s,{},P.FIXED_DT);assert.equal(a.hp,30);
  Object.assign(a,pt(9,6));advance(s,1);assert.equal(a.hp,25);
  assert.equal(speedFactor(s,a),.8);assert.equal(speedFactor(s,s.player),1);
});

test('controller pause freezes bleeding and restart restores health', () => {
  const w=makePuzzleWorld({levels:[room({spawn:pt(10,1),hazards:[spike],guards:[guard(5,4,{pause:30,facing:0})]})]});
  w.eng.startRun();w.advance(50);assert.equal(w.x.world.guards[0].hp,65);
  Object.assign(w.x.world.guards[0],pt(8,6));w.eng.pauseRun();w.advance(9000);
  assert.equal(w.x.world.guards[0].hp,65);w.eng.resumeRun();w.advance(1100);assert.equal(w.x.world.guards[0].hp,60);
  w.eng.restartLevel();assert.equal(w.x.world.guards[0].hp,100);assert.equal(w.x.world.guards[0].bleedUntil,0);w.eng.destroy();
});

test('route search does not leak NPC wounds into sibling simulations or the live world', () => {
  const s=P.createState(room({hazards:[spike],guards:[guard(5,4,{range:0,pause:30})]}));
  const before=JSON.stringify(s.guards),path=V.temporalPath(s,pt(3,2),{horizon:5,maxNodes:20});
  assert.ok(path);assert.equal(JSON.stringify(s.guards),before);assert.deepEqual(s.guards[0].spikeHits,{});
  V.replayRoute(s,path);assert.equal(s.guards[0].hp,65);
});

test('every monster eats an unstunned unaware guard or dog without killing the player', () => {
  for(const beast of beasts)for(const kind of ['guards','dogs']) {
    const s=P.createState(room({spawn:pt(10,1),[kind]:[kind==='guards'?guard(4,4,{facing:0,pause:20}):dog(4,4)],beasts:[beast]}));
    advance(s,2.1);const a=s[kind][0];
    assert.equal(a.alive,false,beast.kind+' '+kind);assert.equal(a.hp,0);assert.equal(a.deathReason,'devoured');
    assert.equal(s.beasts[0].meals,1);assert.equal(s.status,'playing');assert.equal(s.alerts,0);
    advance(s,4);assert.equal(s.beasts[0].meals,1);
  }
});

test('spiders target the nearest visible prey even when the player is also inside the web', () => {
  const s=P.createState(room({spawn:pt(7,4),guards:[guard(5,5,{facing:Math.PI/2,pause:20})],beasts:[{...beasts[2],...pt(5,4),web:3}]}));
  advance(s,.6);assert.deepEqual(s.beasts[0].mark,pt(5,5));advance(s,1.3);
  assert.equal(s.guards[0].alive,false);assert.equal(s.status,'playing');
});

test('mimic bites and spider strikes remain dangerous throughout their active phase', () => {
  for(const beast of beasts.slice(1)) {
    const s=P.createState(room({spawn:pt(10,1),guards:[guard(8,6,{pause:20})],beasts:[beast]}));
    Object.assign(s.beasts[0],{state:beast.kind==='mimic'?'BITE':'STRIKE',until:.25,mark:pt(3,4),hitAny:false});
    P.step(s,{},P.FIXED_DT);Object.assign(s.guards[0],pt(3,4));P.step(s,{},P.FIXED_DT);
    assert.equal(s.guards[0].alive,false);assert.equal(s.beasts[0].meals,1);
  }
});

test('a real stone lure can lead a free dog into a monster while the player hides', () => {
  const s=P.createState(room({spawn:pt(8,1),hides:[pt(8,1)],dogs:[dog(6,2,{facing:Math.PI/2,tethered:false})],beasts:[beasts[0]]}));
  s.player.facing=Math.PI/2;assert.equal(P.action(s,'gadget'),true);assert.equal(P.action(s,'hide'),true);advance(s,8);
  assert.equal(s.dogs[0].alive,false);assert.equal(s.status,'playing');assert.equal(s.alerts,0);
});
