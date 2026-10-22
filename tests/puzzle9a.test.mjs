// Replacement for step parity, hammer and shield tests: explicit environmental interactions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzle as P,geometry as G,validation as V,generator} from './helpers/env.mjs';
import {room,pt,advance,withWall} from './puzzle.fixtures.mjs';

test('key and lock: matching key required, explicit interaction, opened door remains open',()=>{
 const s=P.createState(room({spawn:pt(2,2),keys:[{id:'key',...pt(2,3),key:'a',kind:'key'}],doors:[{id:'d',...pt(3,2),kind:'key',key:'a'}]}));
 assert.equal(P.action(s,'interact'),false);assert.equal(G.solid(s,3,2),true);advance(s,.42,{y:1});assert.ok(s.keys.has('a'));advance(s,.42,{y:-1});assert.equal(P.action(s,'interact'),true);assert.equal(G.solid(s,3,2),false);advance(s,3);assert.ok(s.opened.has('d'));
});
test('interactions do not pass through walls; closed doors have reachable edges',()=>{
 const s=P.createState(withWall(room({spawn:pt(2,2),levers:[{id:'l',...pt(3,3),doors:['d'],label:'A'}],doors:[{id:'d',...pt(9,2),kind:'lever'}]}),3,2));assert.equal(P.action(s,'interact'),false);
 const b=P.createState(room({doors:[{id:'d',...pt(3,2),kind:'key',key:'a'}]}));assert.equal(P.nearby(b).id,'d');
});
test('lever links are explicit and permanent; restart has no activated gates',()=>{
 const l=room({levers:[{id:'l',...pt(2,2),label:'A',doors:['gate']}],doors:[{id:'gate',...pt(6,3),kind:'lever'}]}),s=P.createState(l);
 assert.equal(P.action(s,'interact'),true);advance(s,20);assert.ok(s.opened.has('gate'));assert.ok(s.activated.has('l'));assert.equal(P.createState(l).opened.size,0);
});
test('pressure plate: countdown closes unused gate; crossing latches it and never crushes player',()=>{
 const l=room({plates:[{id:'p',...pt(2,2),door:'gate',duration:3}],doors:[{id:'gate',...pt(4,2),kind:'plate'}]});
 const s=P.createState(l);advance(s,.1);assert.ok(s.opened.has('gate'));advance(s,.5,{y:1});advance(s,4);assert.equal(s.opened.has('gate'),false);
 const b=P.createState(l);advance(b,.1);advance(b,1,{x:1});assert.ok(b.crossed.has('gate'));advance(b,10);assert.ok(b.opened.has('gate'));assert.ok(G.fits(b,b.player.x,b.player.y));
});
test('portal is explicit and paired; cooldown prevents bounce and collision stays active',()=>{
 const s=P.createState(room({portals:[{id:'a',...pt(2,2),pair:'b',label:'I'},{id:'b',...pt(10,6),pair:'a',label:'I'}]}));assert.equal(P.action(s,'interact'),true);assert.equal(s.player.x,10.5);assert.equal(P.action(s,'interact'),false);advance(s,1.1);assert.equal(P.action(s,'interact'),true);assert.equal(s.player.x,2.5);
});
test('bells react to running; sneaking does not attract distant guards',()=>{
 for(const gait of ['sneak','run']){const s=P.createState(room({bells:[pt(2,2)]}));advance(s,.1,{x:1,gait});assert.equal(s.noises.some(n=>n.type==='bell'),gait==='run');}
});
test('key-lock ordering rejects keys behind their own lock',()=>{
 let l=room({keys:[{id:'k',...pt(8,4),key:'a',kind:'key'}],doors:[{id:'d',...pt(6,4),key:'a',kind:'key'}]});
 for(let y=1;y<8;y++)l=withWall(l,6,y);l=withWall(l,6,4,'.');assert.ok(V.validateLevel(l).some(e=>e.includes('Tidak terjangkau')));
});
test('level 37 uses a ten-second plate and a permanent lever, never step parity',()=>{
 const l=generator.missionSpec(37);assert.equal(l.id,'gen-37');assert.equal(l.plates[0].duration,10);assert.ok(l.levers.length);assert.ok(l.doors.every(d=>['key','lever','plate'].includes(d.kind)));assert.deepEqual(V.validateLevel(l),[]);
});
test('fresh sessions do not share mutable guards, inventory or world state',()=>{
 const l=generator.missionSpec(37),a=P.createState(l),b=P.createState(l);a.guards[0].route[0].x=100;a.keys.add('a');a.guards[0].suspicion=1;
 assert.notEqual(b.guards[0].route[0].x,100);assert.equal(b.keys.size,0);assert.equal(b.guards[0].suspicion,0);assert.notEqual(l.guards[0].route[0].x,100);
});
