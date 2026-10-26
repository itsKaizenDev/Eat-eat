import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MISSIONS } from '../lib/heist/missions.mjs';
import { findSolution, grade, initialState, parseMission, passable, sees, step, visibleCells } from '../lib/heist/engine.mjs';

const mission = (id)=>MISSIONS.find(m=>m.id===id);

test('kampanye Heist punya 9 misi unik, semuanya bisa ditamatkan tanpa RNG/umpan',()=>{
  assert.equal(MISSIONS.length,9);
  assert.equal(new Set(MISSIONS.map(m=>m.id)).size,MISSIONS.length);
  for(const m of MISSIONS){
    const solution=findSolution(m,120000);
    assert.ok(solution,`Misi ${m.id} tak punya solusi`);
    let s=initialState(m);
    for(const input of solution){
      const result=step(m,s,input);
      assert.equal(result.moved,true,`Aksi solusi ${m.id} ${input} tertahan`);
      assert.notEqual(result.state.status,'lost',`Misi ${m.id} mencelakakan pemain`);
      s=result.state;
    }
    assert.equal(s.status,'won',`${m.id} tidak menang`);
    assert.ok(s.turns <= m.par,`Acuan par ${m.id} mustahil dicapai`);
    assert.equal(s.loot.length,m.goalCount,`Objektif harta ${m.id} salah`);
  }
});

test('pintu dan gerbang butuh item/sakelar, dan level 9 mewajibkan keduanya',()=>{
  for(const id of ['h04','h05','h09']) {
    const m=mission(id),s=initialState(m);
    const doors=[];
    m.tiles.forEach((row,y)=>row.forEach((c,x)=>{if(c==='D'||c==='G')doors.push({x,y,c});}));
    assert.ok(doors.length>0);
    for(const d of doors)assert.equal(passable(m,s,d),false,`${id}: gerbang bisa dilewati sebelum dibuka`);
    if(doors.some(d=>d.c==='D'))assert.ok(m.things.key.length>0);
    if(doors.some(d=>d.c==='G'))assert.ok(m.things.switch.length>0);
  }
  const m=mission('h09'),solution=findSolution(m),state=solution.split('').reduce((s,a)=>step(m,s,a).state,initialState(m));
  assert.equal(state.keys.length,1);assert.equal(state.switches.length,1);
});

test('gerak tertahan tidak menghabiskan giliran, menunggu satu giliran valid',()=>{
  const m=mission('h01'),s=initialState(m);
  const fail=step(m,s,'L');assert.equal(fail.moved,false);assert.strictEqual(fail.state,s);
  const wait=step(m,s,'W');assert.equal(wait.moved,true);assert.equal(wait.state.turns,1);
});

test('visibilitas empat arah dan semak menyembunyikan meskipun berada di kerucut pandang',()=>{
  const m=parseMission({id:'unit-visibility',title:'Test',par:2,map:['#########','#P......#','#..H.1.L#','#.......#','#E......#','#########'],guards:[{dir:'L',range:4}]});
  const s=initialState(m),g=s.guards[0];
  assert.equal(sees(m,s,g,{x:2,y:2}),true);
  assert.equal(sees(m,s,g,{x:3,y:2}),false);
  assert.equal(sees(m,s,g,{x:6,y:2}),false);
  assert.ok(visibleCells(m,s,g).some(c=>c.x===2&&c.y===2));
  assert.ok(!visibleCells(m,s,g).some(c=>c.x===3&&c.y===2));
});

test('ditatap dua giliran berturut-turut menyebabkan tertangkap, bisa lepas lewat H',()=>{
  const m=parseMission({id:'unit-detection',title:'Test',par:10,map:['#########','#P......#','#.......#','#..1....#','#H....L.#','#E......#','#########'],guards:[{dir:'U',range:3,interval:9}]});
  const s=initialState(m),g=s.guards[0];
  assert.equal(sees(m,s,g,{x:3,y:1}),true);
  let current={...s,player:{x:3,y:1}};
  const first=step(m,current,'W');assert.equal(first.state.exposure,1);assert.equal(first.state.status,'playing');
  const second=step(m,first.state,'W');assert.equal(second.state.status,'lost');
  const hidden={...first.state,player:{x:1,y:4}};
  const safe=step(m,hidden,'W');assert.equal(safe.state.exposure,0);assert.equal(safe.state.status,'playing');
});

test('stun/attack tidak diperlukan dan umpan hanya bisa dipakai setelah ditemukan',()=>{
  const m=mission('h07'),s=initialState(m);
  assert.equal(step(m,s,'Q').moved,false);
  const withStone={...s,decoys:1};
  const tossed=step(m,withStone,'Q');assert.equal(tossed.moved,true);assert.equal(tossed.state.decoys,0);
  assert.ok(tossed.state.noise);
  assert.ok(tossed.state.noiseTTL>0);
});

test('bintang hanya diberikan setelah keluar; par, tanpa alarm, bonus bersifat independen',()=>{
  const m=mission('h01'),s=initialState(m);
  assert.equal(grade(m,s),0);
  assert.equal(grade(m,{...s,status:'won',turns:2}),2);
  assert.equal(grade(m,{...s,status:'won',turns:2,bonus:['11,1']}),3);
  assert.equal(grade(m,{...s,status:'won',turns:99,caught:1}),0);
});

test('patroli tidak teleport setelah umpan dan penundaan giliran',()=>{
  const m=parseMission({id:'patrol-no-jump',title:'Test',par:20,
    map:['##########','#P.......#','#..1....L#','#........#','#E.......#','##########'],
    guards:[{dir:'R',range:3,interval:1,route:'RRLL'}]});
  let s={...initialState(m),noise:{x:7,y:3},noiseTTL:3};
  for(let turn=0;turn<10;turn++){
    const before=s.guards[0].pos;
    const r=step(m,s,'W');
    s=r.state;
    assert.ok(Math.abs(s.guards[0].pos.x-before.x)+Math.abs(s.guards[0].pos.y-before.y)<=1,'Penjaga melompat antarpetak');
  }
});

test('persembunyian aman dari penglihatan, bukan dari tabrakan langsung',()=>{
  const m=parseMission({id:'hide-collision',title:'Test',par:20,
    map:['##########','#P.......#','#..1H...L#','#........#','#E.......#','##########'],
    guards:[{dir:'R',range:3,interval:1,route:'RRLL'}]});
  const s={...initialState(m),player:{x:4,y:2}};
  assert.equal(sees(m,s,s.guards[0],s.player),false);
  const r=step(m,s,'W');
  assert.equal(r.state.status,'lost','Penjaga yang menginjak tempat sembunyi harus menangkap pemain');
});


test('ikon Map di UI tidak menimpa constructor Map bawaan JavaScript',()=>{
  const source=readFileSync(new URL('../app/dungeon/page.jsx',import.meta.url),'utf8');
  assert.match(source,/\bMap\s+as\s+MapIcon\b/, 'Ikon Map perlu alias eksplisit');
  assert.match(source,/\bnew Map\s*\(/, 'Peta posisi penjaga tetap memakai native Map');
  assert.match(source,/<MapIcon(?:\s|\/>)/, 'Ikon navigasi memakai nama alias');
  assert.doesNotMatch(source,/<Map(?:\s|\/>)/, 'Jangan pakai identifier Map untuk ikon');
});

