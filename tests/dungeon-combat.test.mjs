// Combat was removed; cover its replacement: perception, pursuit, capture and escape memory.
import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzle as P, geometry as G} from './helpers/env.mjs';
import {room,guard,pt,advance,withWall} from './puzzle.fixtures.mjs';

test('vision: wall, crate and locked door block both cone rays and perception',()=>{
 for(const type of ['#','C','door']){let l=room({spawn:pt(5,4),guards:[guard(8,4)]});if(type==='door')l.doors=[{id:'a',...pt(7,4),kind:'key',key:'a'}];else l=withWall(l,7,4,type);
 const s=P.createState(l),g=s.guards[0];assert.equal(G.inVision(s,g,s.player),false);assert.ok(G.rayDistance(s,g,Math.PI,4)<1);assert.ok(G.conePoints(s,g).every(p=>!G.solid(s,p.x+1e-6,p.y)||p.x<=8));}
});
test('vision: facing/FOV and range match rendered cone endpoints',()=>{
 const s=P.createState(room({spawn:pt(5,4),guards:[guard()]})),g=s.guards[0];assert.equal(P.canSeePlayer(s,g),true);g.facing=0;assert.equal(P.canSeePlayer(s,g),false);g.facing=Math.PI;g.range=2;assert.equal(P.canSeePlayer(s,g),false);
 for(const p of G.conePoints(s,g)){assert.ok(G.distance(g,p)<=2+1e-8);}
});
test('suspicion builds before alarm; caught fails exactly once and cannot fight',()=>{
 const s=P.createState(room({spawn:pt(5,4),guards:[guard(8,4,{pause:5})]}));advance(s,.2);assert.equal(s.guards[0].state,'SUSPICIOUS');assert.ok(s.guards[0].suspicion<1);assert.equal(s.alerts,0);
 advance(s,1);assert.equal(s.guards[0].state,'CHASE');assert.equal(s.alerts,1);advance(s,5);assert.equal(s.status,'lost');const time=s.time;advance(s,2);assert.equal(s.time,time);
});
test('shadow and sneaking slow detection; torch increases detection',()=>{
 const make=(extra={})=>P.createState(room({spawn:pt(5,4),guards:[guard(8,4,{pause:10})],...extra}));
 const a=make(),b=make({shadows:[{...pt(5,4),radius:2}]}),c=make({shadows:[{...pt(5,4),radius:2}],torches:[{...pt(5,3),facing:Math.PI/2,fov:2,range:3,rate:0,phase:0}]});
 advance(a,.25);advance(b,.25,{gait:'sneak'});advance(c,.25,{gait:'sneak'});assert.ok(b.guards[0].suspicion<a.guards[0].suspicion);assert.ok(c.guards[0].suspicion>b.guards[0].suspicion);
});
test('noise: corridor propagation respects walls and attenuates closed doors',()=>{
 let l=room({spawn:pt(2,2),guards:[guard(5,2,{facing:0,pause:5})]});const s=P.createState(l);P.noise(s,s.player,5,1,1,'stone');advance(s,.1);assert.equal(s.guards[0].state,'SUSPICIOUS');advance(s,.5);assert.equal(s.guards[0].state,'INVESTIGATE');
 for(let y=1;y<8;y++)l=withWall(l,4,y);const blocked=P.createState(l);const f=G.soundField(blocked,pt(3,2),8);assert.equal(f.has('5,2'),false);
 l=withWall(l,4,2,'.');l.doors=[{id:'d',...pt(4,2),kind:'key',key:'a'}];const d=P.createState(l);assert.equal(G.soundField(d,pt(3,2),3).has('5,2'),false);d.opened.add('d');assert.equal(G.soundField(d,pt(3,2),3).has('5,2'),true);
});
test('chase uses last seen position, searches and returns to patrol',()=>{
 const s=P.createState(room({guards:[guard(8,4,{route:[pt(8,4),pt(8,6)]})]})),g=s.guards[0];g.state='CHASE';g.suspicion=1;g.lastKnown=pt(7,4);g.lostFor=0;
 s.player= {...s.player,...pt(1,1)};advance(s,2);assert.equal(g.state,'SEARCH');const target={...g.lastKnown};advance(s,4);assert.ok(['RETURN','PATROL'].includes(g.state));assert.deepEqual(g.lastKnown,target);advance(s,5);assert.equal(g.state,'PATROL');
});
test('hidden is conditional: unseen hides conceal, observed hides remain investigable',()=>{
 const l=room({spawn:pt(5,4),hides:[pt(5,4)],guards:[guard(8,4,{pause:5})]});const s=P.createState(l);P.action(s,'hide');assert.equal(s.player.hidden,true);assert.equal(P.canSeePlayer(s,s.guards[0]),false);advance(s,2,{x:1});assert.equal(s.player.x,5.5);
 const seen=P.createState(l);advance(seen,.3);P.action(seen,'hide');assert.ok(seen.guards[0].seenHide);assert.equal(P.canSeePlayer(seen,seen.guards[0]),true);advance(seen,5);assert.equal(seen.status,'lost');
});
test('smoke obscures ray/vision and expires without resetting chase or collision',()=>{
 const s=P.createState(room({spawn:pt(5,4),guards:[guard(8,4,{pause:5})]}));advance(s,1);const g=s.guards[0];assert.equal(g.state,'CHASE');P.action(s,'cycle');P.action(s,'gadget');assert.equal(P.gadgetWait(s,'smoke'),10);assert.equal(P.canSeePlayer(s,g),false);assert.equal(g.state,'CHASE');assert.equal(P.action(s,'gadget'),false);
 s.player={...s.player,...pt(1,1)};advance(s,4.6);assert.equal(s.smoke.length,0);
});
test('stone cooldown, wall-clipped target, no cooldown started on blocked throw',()=>{
 const s=P.createState(withWall(room({spawn:pt(2,2)}),4,2));P.action(s,'gadget');assert.equal(P.gadgetWait(s),10);assert.ok(s.noises[0].x<4);assert.equal(s.noises[0].type,'stone');advance(s,10.1);s.player.x=3.7;assert.equal(P.action(s,'gadget'),false);assert.equal(P.gadgetWait(s),0);
});
test('navigation never walks through closed doors and eventually yields to another guard',()=>{
 let l=room({guards:[guard(3,4,{route:[pt(3,4),pt(9,4)],facing:0}),guard(9,4,{route:[pt(9,4),pt(3,4)]})]});const s=P.createState(l);advance(s,15);assert.ok(s.guards.every(g=>G.fits(s,g.x,g.y,.21)));assert.ok(G.distance(s.guards[0],s.guards[1])>.39);assert.ok(s.guards.some(g=>Math.abs(g.x-g.home.x)>1));
 for(let y=1;y<8;y++)l=withWall(l,6,y);l=withWall(l,6,4,'.');l.doors=[{id:'d',...pt(6,4),kind:'key',key:'a'}];const b=P.createState(l);advance(b,10);assert.ok(b.guards[0].x<6);assert.ok(b.guards[1].x>7);
});
const camera=(extra={})=>({...pt(5,4),facing:Math.PI,baseFacing:Math.PI,sweep:0,phase:0,rate:0,range:4,fov:1,...extra});
test('CCTV: first visible tick alerts every guard, including distant guards behind walls',()=>{
 let l=room({width:25,map:['#'.repeat(25),...Array(7).fill('#'+'.'.repeat(23)+'#'),'#'.repeat(25)],spawn:pt(2,4),crystals:[camera()],guards:[guard(10,2),guard(21,6,{route:[pt(21,6),pt(22,6)]})]});
 for(let y=1;y<8;y++)l=withWall(l,12,y);
 const s=P.createState(l);P.step(s);assert.equal(s.alerts,1);assert.equal(s.cameraAlarm,true);assert.equal(s.status,'playing');
 for(const g of s.guards)assert.equal(g.state,'INVESTIGATE');assert.ok(s.guards.some(g=>g.cameraReport&&Math.hypot(g.lastKnown.x-2.5,g.lastKnown.y-4.5)<1.5),'a nearby guard pursues the reported place');assert.equal(s.report.source,'camera');assert.ok(s.guards.every(g=>g.lastKnown));
 advance(s,1);assert.equal(s.alerts,1,'continuous visibility is one alarm episode');
});
test('CCTV: tracks only visible positions, does not let footsteps overwrite the report, and can reacquire',()=>{
 const s=P.createState(room({spawn:pt(2,4),crystals:[camera()],guards:[guard(10,6,{route:[pt(10,6),pt(10,7)],speed:.1})]}));
 P.step(s);s.player.x=3.5;advance(s,1.1);assert.ok(Math.hypot(s.guards[0].lastKnown.x-3.5,s.guards[0].lastKnown.y-4.5)<1.5,'report refreshes about once a second while visible');const seen=s.guards[0].lastKnown;
 s.player={...s.player,...pt(1,1)};P.noise(s,pt(10,5),3,1,2,'footstep');advance(s,.5);
 assert.equal(s.cameraAlarm,false);assert.deepEqual(s.guards[0].lastKnown,seen);assert.equal(s.alerts,1);
 s.player={...s.player,...pt(2,4)};P.step(s);assert.equal(s.alerts,2);
});
test('CCTV: walls, closed doors, smoke and an unseen hide block instant detection',()=>{
 const base=room({spawn:pt(2,4),crystals:[camera()],hides:[pt(2,4)]});
 const wall=P.createState(withWall(base,4,4));P.step(wall);assert.equal(wall.alerts,0);
 const door=P.createState({...base,doors:[{id:'d',...pt(4,4),kind:'key',key:'a'}]});P.step(door);assert.equal(door.alerts,0);door.opened.add('d');P.step(door);assert.equal(door.alerts,1);
 const smoke=P.createState(base);P.action(smoke,'cycle');P.action(smoke,'gadget');P.step(smoke);assert.equal(smoke.alerts,0);
 const hidden=P.createState(base);P.action(hidden,'hide');P.step(hidden);assert.equal(hidden.alerts,0);
});
test('CCTV: overlapping cameras count one network alarm and reports eventually return to patrol',()=>{
 const s=P.createState(room({spawn:pt(2,4),hides:[pt(1,1)],crystals:[camera(),camera({id:'second'})],guards:[guard(10,6,{route:[pt(10,6),pt(10,7)]})]}));
 P.step(s);assert.equal(s.alerts,1);s.player={...s.player,...pt(1,1)};P.action(s,'hide');advance(s,25);assert.equal(s.guards[0].cameraReport,false);assert.equal(s.guards[0].state,'PATROL');
});

// ---- Level 51: Penjaga Relik Agung (Adventure-style HP, phases, telegraphed attacks, big weak window). ----
import {campaign,threats} from './helpers/env.mjs';
const {BOSS_RULES,bossHp}=threats;
const bossLevel=()=>campaign.CAMPAIGN_LEVELS[50];
import { playBoss } from './helpers/dungeon-boss.mjs';
test('level 51 is the special boss arena after level 50, with five phases and a 50-coin relic',()=>{
  const l=bossLevel();assert.equal(l.number,51);assert.equal(l.special,true);assert.equal(l.guards.length,0);assert.equal(BOSS_RULES.phases.length,5);
  assert.equal(bossHp(),BOSS_RULES.phases.reduce((n,p)=>n+p.hp,0));assert.equal(l.artifacts.length,1);assert.equal(l.artifacts[0].value,50);assert.equal(l.artifacts[0].locked,'boss');
  assert.equal(l.boss.weak.length,3);assert.ok(BOSS_RULES.weakRadius>=1.5,'weak window must be big');
});
test('boss relic stays locked until the guardian is defeated, then pays 50 Apple Coins',()=>{
  const l=bossLevel(),s=P.createState(l);s.player.x=l.artifacts[0].x;s.player.y=l.artifacts[0].y;P.step(s,{});assert.equal(s.artifacts,0);assert.equal(s.coins,0);
  s.boss.defeated=true;P.step(s,{});assert.equal(s.artifacts,1);assert.equal(s.coins,50);
});
test('boss attacks are telegraphed first, hurt with invulnerability frames, and run out of lives',()=>{
  const l=bossLevel(),s=P.createState(l),b=s.boss;let tele=false;
  for(let i=0;i<60*30&&b.state!=='TELE';i++)P.step(s,{});assert.equal(b.state,'TELE');assert.equal(s.boss.lives,5);
  const [k]=[...b.danger];const [x,y]=k.split(',').map(Number);s.player.x=x+.5;s.player.y=y+.5;
  for(let i=0;i<60*4&&b.state!=='ACTIVE';i++){P.step(s,{});assert.equal(b.lives,5,'no damage during the telegraph');}
  assert.equal(b.state,'ACTIVE');P.step(s,{});assert.equal(b.lives,4);const t=b.invulnUntil;P.step(s,{});assert.equal(b.lives,4,'invulnerable right after a hit');assert.ok(t>s.time);
});
test('weak window hits once per target; a perfect run beats all five phases and wins with 50 coins; mistakes cost lives',()=>{
  const {s,defeatedAt}=playBoss(bossLevel());assert.equal(s.status,'won');assert.equal(s.coins,50);assert.equal(s.result.coinReward,50);assert.equal(s.boss.hits,bossHp());assert.equal(s.boss.phase,5);assert.ok(defeatedAt>60,'not a trivial fight');
  const sloppy=playBoss(bossLevel(),{careless:true}).s;assert.ok(sloppy.boss.lives<s.boss.lives,'walking into red costs lives');
});
