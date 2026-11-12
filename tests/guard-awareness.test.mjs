import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle as P, threats } from './helpers/env.mjs';
import { room, guard, pt, advance, withWall } from './puzzle.fixtures.mjs';
const shadow = extra => ({ id: 'shadow', ...pt(1,4), kind:'shadow', dx:1,dy:0,length:8,speed:8,windup:1.2,...extra });

test('an unseen monster behind a guard stays unknown, even to a veteran', () => {
  for (const awareness of ['rookie','veteran']) {
    const s=P.createState(room({guards:[guard(4,4,{awareness,facing:0,pause:20})],beasts:[shadow()]}));
    advance(s,1.8);
    assert.equal(s.guards[0].known.shadow,undefined);
    assert.equal(s.guards[0].alive,false);
    assert.equal(s.status,'playing');
  }
});
test('walls and smoke hide monster warnings using the same vision rules', () => {
  for(const kind of ['wall','smoke']) {
    let l=room({guards:[guard(4,4,{facing:Math.PI,pause:20})],beasts:[shadow()]});
    if(kind==='wall')l=withWall(l,3,4);
    const s=P.createState(l),g=s.guards[0],b=s.beasts[0];
    if(kind==='smoke')s.smoke=[{...pt(3,4),radius:.6,until:10}];
    b.state='WINDUP';b.warnedAt=0;
    for(const time of [0,.6]){s.time=time;threats.perceiveBeasts(s,g);}
    assert.equal(g.known.shadow,undefined);
    assert.equal(threats.escapeBeast(s,g),null);
  }
});
test('front-facing veterans react sooner and both profiles forget observed danger', () => {
  for(const awareness of ['rookie','veteran']) {
    const s=P.createState(room({guards:[guard(4,4,{awareness,facing:Math.PI,pause:20})],beasts:[shadow()]}));
    const g=s.guards[0],b=s.beasts[0];b.state='WINDUP';b.warnedAt=0;
    threats.perceiveBeasts(s,g);s.time=.25;threats.perceiveBeasts(s,g);
    assert.equal(!!g.known.shadow,awareness==='veteran');
    s.time=.6;threats.perceiveBeasts(s,g);assert.ok(g.avoidTiles.has('4,4'));
    b.state='IDLE';s.time+=threats.AWARENESS[awareness].memory+1;threats.perceiveBeasts(s,g);
    assert.equal(g.avoidTiles,null);
  }
});
test('a real stone lure makes an unaware investigating guard walk into a monster', () => {
  const s=P.createState(room({spawn:pt(8,1),hides:[pt(8,1)],guards:[guard(6,2,{facing:Math.PI/2,pause:20,range:3})],beasts:[shadow()]}));
  s.player.facing=Math.PI/2;
  assert.equal(P.action(s,'gadget'),true);
  assert.equal(P.action(s,'hide'),true);
  advance(s,8);
  assert.equal(s.guards[0].alive,false);
  assert.equal(s.status,'playing');
  assert.equal(s.alerts,0);
});
test('remembering an earlier attack does not reveal a fresh offscreen attack', () => {
  const s=P.createState(room({guards:[guard(4,4,{awareness:'veteran',facing:Math.PI,pause:20})],beasts:[shadow()]}));
  const g=s.guards[0],b=s.beasts[0];b.state='WINDUP';b.warnedAt=0;
  threats.perceiveBeasts(s,g);s.time=.3;threats.perceiveBeasts(s,g);assert.ok(g.known.shadow);
  g.facing=0;b.warnedAt=1;s.time=1;threats.perceiveBeasts(s,g);
  assert.equal(threats.escapeBeast(s,g),null);
});
