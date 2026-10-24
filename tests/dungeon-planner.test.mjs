import test from'node:test';
import assert from'node:assert/strict';
import{validation as V,puzzle as P}from'./helpers/env.mjs';
import{room,guard,pt}from'./puzzle.fixtures.mjs';
test('planner: a certified route replays with a normal visible player and no gadgets',()=>{
 const level=room({spawn:pt(2,2),exit:pt(2,2),artifacts:[{id:'r',kind:'artifact',...pt(9,6)}]}),before=structuredClone(level);
 const proof=V.verifyMission(level,{maxNodes:100});assert.ok(proof.ok,JSON.stringify(proof.errors));
 const actual=P.createState(level);V.replayRoute(actual,proof.trace);
 assert.equal(actual.status,'won');assert.equal(actual.alerts,0);assert.equal(actual.player.hidden,false);assert.deepEqual(actual.cooldowns,{stone:0,smoke:0,trap:0});assert.deepEqual(level,before);
});
test('planner: an approximate forecast cannot certify walking through a stationary guard',()=>{
 const map=Array.from({length:9},(_,y)=>y===4?'#...........#':'#############');
 const level=room({map,spawn:pt(1,4),exit:pt(1,4),guards:[guard(6,4,{range:0,route:[pt(6,4)],pause:100})],artifacts:[{id:'r',kind:'artifact',...pt(10,4)}]});
 assert.deepEqual(V.validateLevel(level),[]);const proof=V.verifyMission(level,{maxNodes:80,horizon:16});assert.equal(proof.ok,false);
});
