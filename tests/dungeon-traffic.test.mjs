import {pathToFileURL} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle as P, geometry as G, root } from './helpers/env.mjs';
import { room, guard, pt } from './puzzle.fixtures.mjs';
const { navigate } = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/puzzle/navigation.mjs').href);
function hallway() {
 const map = Array.from({length:9},()=>Array(13).fill('#'));
 for(let y=2;y<=6;y++)for(const x of [1,2,3,9,10,11])map[y][x]='.';
 for(let x=3;x<=9;x++)map[4][x]='.';
 return room({map:map.map(r=>r.join('')),spawn:pt(1,2)});
}
function travel(s, actors, targets, seconds=28) {
 const reached=new Set(), trace={yielded:false,waited:false,min:Infinity};
 for(let tick=0;tick<seconds*60;tick++) {
  s.time+=P.FIXED_DT;
  actors.forEach((a,i)=>{const before={...a};if(!reached.has(i)&&navigate(s,a,targets[i],1.8,P.FIXED_DT))reached.add(i);assert.ok(G.distance(a,before)<=1.8*P.FIXED_DT+.0001,'no teleport');assert.ok(G.fits(s,a.x,a.y,.21));trace.yielded ||= !!a.yielding;trace.waited ||= !!a.trafficWaiting;});
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)trace.min=Math.min(trace.min,G.distance(actors[i],actors[j]));
  if(reached.size===actors.length)break;
 }
 assert.ok(trace.min>=.535,'NPC bodies never overlap: '+trace.min);
 assert.equal(reached.size,actors.length,JSON.stringify({reached:[...reached],actors:actors.map(a=>({id:a.id,x:a.x,y:a.y,yielding:a.yielding,blocked:a.blocked,path:a.path}))}));
 return trace;
}
test('traffic: opposite guards take turns through a single-tile corridor then both arrive',()=>{
 const s=P.createState({...hallway(),guards:[guard(2,4),guard(10,4)]});
 const t=travel(s,s.guards,[pt(10,4),pt(2,4)]);assert.ok(t.waited);
});
test('traffic: guard and free dog already face-to-face retreat to a passing pocket',()=>{
 const s=P.createState({...hallway(),guards:[guard(5,4)],dogs:[{...pt(7,4),route:[pt(7,4),pt(2,4)],tethered:false,speed:4.8,range:0}]});
 const t=travel(s,[...s.guards,...s.dogs],[pt(10,4),pt(2,4)]);assert.ok(t.yielded);
});
test('traffic: a third NPC queues without starving or blocking the exiting NPC',()=>{
 const s=P.createState({...hallway(),guards:[guard(2,4),guard(10,4),guard(2,5)]});
 travel(s,s.guards,[pt(10,4),pt(2,4),pt(10,5)],40);
});
test('traffic: open-room detours go around a stationary sentry',()=>{
 const s=P.createState(room({guards:[guard(3,4),guard(6,4,{watch:[0],post:pt(6,4)})]}));
 travel(s,[s.guards[0]],[pt(9,4)]);
 assert.ok(G.distance(s.guards[0],s.guards[1])>.54);
});

test('monster warnings: an able guard sidesteps a visible Shadow lane; a stunned guard remains prey',()=>{
 const make=()=>P.createState(room({guards:[guard(5,4,{range:0,pause:20})],beasts:[{id:'shadow-0',kind:'shadow',...pt(1,4),dx:1,dy:0,length:8,speed:8,windup:1.2}]}));
 const s=make();for(let i=0;i<150;i++)P.step(s);
 assert.equal(s.guards[0].alive,true);assert.ok(Math.abs(s.guards[0].y-4.5)>.65);
 const b=make();b.guards[0].stunnedUntil=3;for(let i=0;i<150;i++)P.step(b);assert.equal(b.guards[0].alive,false);
});
test('traffic: fractional positions at a turn yield sideways instead of aligning into the blocker',()=>{
 const s=P.createState(room({guards:[guard(5,4),guard(5,3)]}));
 Object.assign(s.guards[0],{x:5.4913,y:3.8934});Object.assign(s.guards[1],{x:5.5034,y:3.3444});
 travel(s,s.guards,[pt(6,2),pt(6,6)],16);
});
