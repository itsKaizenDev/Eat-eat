import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {root,makePuzzleWorld,progressLib as R} from './helpers/env.mjs';
import {room,pt,guard} from './puzzle.fixtures.mjs';
const {createDirectionInput}=await import(root+'/node_modules/.cache/snake-tests/input.mjs');

test('real-time inputs: keyboard diagonals, OS repeat deduplicated, release one axis and then all',()=>{
 const w=makePuzzleWorld({levels:[room()]});w.eng.startRun();w.eng.setDir(1,0,{source:'key:d'});w.eng.setDir(0,1,{source:'key:s'});for(let i=0;i<20;i++)w.eng.setDir(1,0,{source:'key:d'});
 w.advance(500);assert.ok(Math.abs(w.x.world.player.x-w.x.world.player.y)<1e-8);w.eng.cancelHeldInput('key:d');const x=w.x.world.player.x;w.advance(500);assert.equal(w.x.world.player.x,x);w.eng.cancelHeldInput('key:s');const y=w.x.world.player.y;w.advance(500);assert.equal(w.x.world.player.y,y);w.eng.destroy();
});
test('touch owns direction until release; keyboard, gait and action can coexist',()=>{
 const w=makePuzzleWorld({levels:[room()]});w.eng.startRun();w.eng.setDir(1,0,{source:'key:d'});w.eng.setDir(0,1,{source:'pad'});assert.deepEqual([w.x.input.x,w.x.input.y],[0,1]);w.eng.action('gadget');assert.equal(w.last('puzzle').gadgetWait,10);assert.deepEqual([w.x.input.x,w.x.input.y],[0,1]);w.eng.cancelHeldInput('pad');assert.deepEqual([w.x.input.x,w.x.input.y],[1,0]);w.eng.setModifier('sneak',true);assert.equal(w.x.input.sneak,true);w.eng.clearInput();assert.equal(w.x.input.sneak,false);assert.equal(w.x.input.x,0);w.eng.destroy();
});
test('held input cannot start/resume a mission or survive restart/focus loss',()=>{
 const w=makePuzzleWorld();w.eng.setDir(1,0);assert.equal(w.eng.getState(),'menu');w.eng.startRun();w.eng.setDir(1,0);w.eng.pauseRun('hidden');w.eng.setDir(1,0);assert.equal(w.x.input.x,0);w.eng.releasePause('hidden');assert.equal(w.eng.getState(),'paused');w.eng.resumeRun();assert.equal(w.x.input.x,0);w.eng.destroy();
});
test('unrelated arcade direction input still uses latest direction; no timer in continuous snake modes',()=>{
 const calls=[],timers=[];const i=createDirectionInput({send:(...x)=>calls.push(x),enabled:()=>true,stepMode:()=>false,later:f=>timers.push(f)});i.press('up',0,0,-1);i.press('up',0,0,-1);i.press('left',0,-1,0);assert.equal(calls.length,2);assert.equal(timers.length,0);i.release('left');assert.deepEqual(calls.at(-1).slice(0,3),[0,0,-1]);i.clear();
});
test('failed save then another win merges both mission records; explicit retry reflects status',()=>{
 const l=room({id:'save-a',exit:pt(4,2),artifacts:[{id:'r',...pt(3,2),kind:'artifact'}],loot:[{id:'b',...pt(3,2),kind:'loot'}]});let disk={v:1,puzzle:{levels:{}}},saves=0;
 const w=makePuzzleWorld({levels:[l,{...l,id:'save-b'}],io:{load:()=>disk,save:p=>{if(++saves===1)return false;disk=p;return true;}}});
 w.eng.startRun();w.eng.setDir(1,0);w.advance(1200);assert.equal(w.last('puzzleMenu').savePending,true);w.eng.startRun();w.eng.setDir(1,0);w.advance(1200);assert.equal(w.last('puzzleMenu').savePending,false);assert.ok(disk.puzzle.levels['save-a']);assert.ok(disk.puzzle.levels['save-b']);assert.equal(R.appleCoins(disk),2);w.eng.destroy();
});
test('capture emits one result and restart rebuilds patrols; loss grants no reward',()=>{
 const l=room({spawn:pt(5,4),guards:[guard(6,4,{pause:3})]});const w=makePuzzleWorld({levels:[l]});w.eng.startRun();w.advance(4000);assert.equal(w.eng.getState(),'lost');assert.equal(w.calls.death,1);assert.equal(w.saves.length,0);assert.equal(w.overlays('gameover').length,1);assert.equal(w.eng.startRun(),true);assert.equal(w.x.world.time,0);assert.equal(w.x.world.guards[0].state,'PATROL');w.eng.destroy();
});
test('UI wiring: Dungeon input branch precedes old shortcuts, pointer cancellation and analog controls exist',()=>{
 const game=fs.readFileSync(root+'/components/GameCanvas.jsx','utf8'),pad=fs.readFileSync(root+'/components/DPad.jsx','utf8');
 assert.ok(game.indexOf("if (kindRef.current === 'puzzle')")<game.indexOf("if (k === 'z'"));assert.match(game,/cancelHeldInput\?\.\('key:' \+ k\)/);assert.match(pad,/onPointerCancel=\{onUp\}/);assert.match(pad,/if \(analog\)/);
});
