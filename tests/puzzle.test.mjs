// Replacement coverage for the former turn/undo/solver contract: continuous stealth simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzle as P, geometry as G, LEVELS, makePuzzleWorld, animLib, pathLib} from './helpers/env.mjs';
import {room,pt,advance,withWall} from './puzzle.fixtures.mjs';

test('movement: held direction is continuous, diagonal normalized, gait speeds distinct',()=>{
 const a=P.createState(room()),b=P.createState(room());advance(a,1,{x:1});advance(b,1,{x:1,y:1});
 assert.ok(Math.abs(G.distance(a.player,a.level.spawn)-2.4)<1e-8);
 assert.ok(Math.abs(G.distance(a.player,a.level.spawn)-G.distance(b.player,b.level.spawn))<1e-8);
 for(const gait of Object.keys(P.SPEEDS)){const s=P.createState(room());advance(s,1,{x:1,gait});assert.ok(Math.abs(s.player.x-2.5-P.SPEEDS[gait])<1e-8);}
});
test('movement: release stops immediately; blocked time never accumulates',()=>{
 const s=P.createState(withWall(room(),3,2));advance(s,4,{x:1});assert.ok(s.player.x<=2.77);
 const x=s.player.x;advance(s,2);assert.equal(s.player.x,x);advance(s,.5,{y:1});assert.ok(s.player.y>3.5);
});
test('collision: no tunnelling through walls or corners at any gait',()=>{
 const l=withWall(withWall(room(),3,2),2,3);
 for(const gait of ['sneak','walk','run']){const s=P.createState(l);advance(s,5,{x:1,y:1,gait});assert.ok(s.player.x<3&&s.player.y<3);assert.ok(G.fits(s,s.player.x,s.player.y));}
 const s=P.createState(withWall(room(),3,2,'C'));P.step(s,{x:1,gait:'run'},100);assert.ok(s.player.x<3);
});
test('simulation: same fixed ticks produce identical movement; bad delta/input is harmless',()=>{
 const a=P.createState(room()),b=P.createState(room());for(let i=0;i<60;i++)P.step(a,{x:1},1/60);for(let i=0;i<120;i++)P.step(b,{x:1},1/120);
 assert.ok(Math.abs(a.player.x-b.player.x)<1e-8);const x=a.player.x;P.step(a,{x:Infinity,y:NaN},NaN);assert.equal(a.player.x,x);
});
test('objectives: optional loot is not mandatory, exit waits for all relics',()=>{
 const s=P.createState(room({spawn:pt(1,1),artifacts:[{id:'a',...pt(2,1),kind:'artifact'}],loot:[{id:'l',...pt(10,7),kind:'loot'}]}));
 advance(s,.2);assert.equal(s.status,'playing');advance(s,.42,{x:1});assert.equal(s.artifacts,1);advance(s,.42,{x:-1});assert.equal(s.status,'won');assert.equal(s.loot,0);assert.equal(s.result.stars,2);
 const time=s.time;advance(s,10,{x:1});assert.equal(s.time,time);
});
test('rating: complete / no alarm / full loot and par are separate requirements',()=>{
 const s=P.createState(room());s.alerts=1;assert.equal(P.rating(s),1);s.alerts=0;assert.equal(P.rating(s),3);
 s.time=100;assert.equal(P.rating(s),2);s.time=10;s.level={...s.level,loot:[{id:'bonus'}]};assert.equal(P.rating(s),2);s.loot=1;assert.equal(P.rating(s),3);
});
test('controller: one RAF, same simulation at 30/60/144Hz, no movement per keydown',()=>{
 const results=[];for(const hz of [30,60,144]){const w=makePuzzleWorld({levels:[room()]});assert.equal(w.eng.startRun(),true);assert.equal(w.eng.startRun(),false);w.eng.setDir(1,0,{source:'key:d'});for(let i=0;i<60;i++)w.eng.setDir(1,0,{source:'key:d'});assert.equal(w.x.world.player.x,2.5);
 for(let i=0;i<hz;i++)w.frame(1000/hz);results.push(w.x.world.player.x);assert.equal(w.rafQueue.size,1);w.eng.destroy();assert.equal(w.rafQueue.size,0);}
 assert.ok(results.every(v=>Math.abs(v-results[0])<1e-7));
});
test('controller: pause freezes all state, blockers need explicit release and resume',()=>{
 const w=makePuzzleWorld();w.eng.startRun();w.eng.setDir(1,0);w.advance(400);w.eng.pauseRun('hidden');const before=JSON.stringify(w.x.world);w.advance(3000);assert.equal(JSON.stringify(w.x.world),before);assert.equal(w.eng.resumeRun(),false);
 w.eng.releasePause('hidden');assert.equal(w.eng.getState(),'paused');assert.equal(w.eng.resumeRun(),true);const x=w.x.world.player.x;w.advance(500);assert.equal(w.x.world.player.x,x);w.eng.destroy();
});
test('controller: restart resets all simulation, inventory, timer and input; menu cleans loop',()=>{
 const w=makePuzzleWorld();w.eng.startRun();w.x.world.cooldowns.trap=10;w.x.world.opened.add('x');w.x.world.alerts=3;w.advance(1000);w.eng.setDir(1,1);assert.equal(w.eng.restartLevel(),true);
 assert.equal(w.x.world.time,0);assert.equal(w.x.world.alerts,0);assert.equal(w.x.world.opened.size,0);assert.deepEqual(w.x.input,{x:0,y:0,sneak:false,run:false,gait:'walk'});w.eng.returnToMenu();assert.equal(w.rafQueue.size,0);assert.equal(w.eng.getState(),'menu');w.eng.destroy();
});
test('controller: clamps suspended frame to 100ms and throttles HUD below frame rate',()=>{
 const w=makePuzzleWorld({levels:[room()]});w.eng.startRun();w.eng.setDir(1,0);w.frame(10000);assert.ok(w.x.world.time<=.101);const n=w.emits.length;w.advance(1000);assert.ok(w.emits.length-n<=11);w.eng.destroy();
});
test('controller: empty campaign and invalid level selection handled without creating a run',()=>{
 const w=makePuzzleWorld({levels:[]});assert.equal(w.eng.startRun(),false);assert.equal(w.eng.setLevel(0),false);assert.deepEqual(w.last('puzzleMenu').levels,[]);w.eng.destroy();
 const b=makePuzzleWorld();assert.equal(b.eng.setLevel(2),false);assert.equal(b.eng.setLevel(-1),false);b.eng.destroy();
});
test('existing interpolation and smooth path helpers retain non-dungeon behavior',()=>{
 assert.deepEqual(animLib.animatedPoints([{x:2,y:1}],[{x:3,y:1}],.5),[{x:2.5,y:1}]);assert.equal(animLib.easeOutCubic(1),1);
 const calls=[];pathLib.traceSmooth({beginPath(){},moveTo(){calls.push('move');},lineTo(){},quadraticCurveTo(){calls.push('curve');}},[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:9,y:9}],1.5);assert.ok(calls.includes('curve'));assert.equal(calls.filter(c=>c==='move').length,2);
});
