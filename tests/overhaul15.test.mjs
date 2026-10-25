import test from 'node:test';
import assert from 'node:assert/strict';
import { room, pt, guard, advance } from './puzzle.fixtures.mjs';
import { pathToFileURL } from 'node:url';
import { root, recordsLib as R, campaign, puzzle, threats, geometry, createRng } from './helpers/env.mjs';
const get = file => import(pathToFileURL(root+'/node_modules/.cache/snake-tests/'+file+'.mjs'));
const { composeScore, SCORES, audioScene } = await get('audio/score');
const { createAudioDirector } = await get('audio/director');
const { parseAudio } = await get('audio/preferences');
const { mapQuality } = await get('puzzle/quality');
const boss = await get('boss/sim');
test('audio: original finite stems share exact length, do not clip, and wrap without a discontinuity',()=>{
 const identities = [];
 for (const key of Object.keys(SCORES)) { const s=composeScore(key); identities.push(s.base.slice(5000,5100).join(',')); assert.equal(s.base.length,s.danger.length); for(const samples of [s.base,s.danger]) { let energy=0; for(const n of samples){assert.ok(Number.isFinite(n)&&Math.abs(n)<.8);energy+=n*n;} assert.ok(energy/samples.length>.000001); assert.ok(Math.abs(samples[0]-samples.at(-1))<.035,key); } }
 assert.equal(new Set(identities).size,Object.keys(SCORES).length);
 assert.deepEqual(parseAudio('{"music":9,"sfx":-1,"muted":true}'),{music:1,sfx:0,muted:true});
 assert.equal(audioScene({mode:'puzzle',running:true,puzzle:{boss:{phase:3},suspicion:0}}).key,'dungeonBoss');
 assert.equal(audioScene({mode:'roguelite',running:true,boss:{isBoss:true,variant:'vine',phase:2}}).key,'expeditionVine');
});
function fakeAudio(){
 const a={currentTime:7,state:'suspended',sources:[],closed:0};
 const node=()=>({gain:{value:0,cancelScheduledValues(){},setTargetAtTime(){}},connect(){},disconnect(){}});
 a.createGain=node;a.destination=node();a.createBuffer=(channels,length,rate)=>({duration:length/rate,copyToChannel(){}});
 a.createBufferSource=()=>{const n={...node(),start(t){this.started=t},stop(t){this.stopped=t ?? a.currentTime}};a.sources.push(n);return n;};
 a.resume=()=>{a.state='running';return Promise.resolve()};a.suspend=()=>{a.state='suspended';return Promise.resolve()};a.close=()=>{a.closed++;return Promise.resolve()};return a;
}
test('audio: gesture unlock, synchronized stems, pause/resume without restart, bounded cache, idempotent cleanup',()=>{
 const ac=fakeAudio(), d=createAudioDirector({contextFactory:()=>ac}); d.setScene({key:'dungeon'});assert.equal(ac.sources.length,0);d.unlock();assert.equal(ac.sources.length,2);assert.equal(ac.sources[0].started,ac.sources[1].started);assert.ok(ac.sources.every(s=>s.loop));
 d.setScene({paused:true});assert.equal(ac.state,'suspended');d.setScene({paused:false,intensity:.8});assert.equal(ac.sources.length,2);
 for(const key of ['dungeonBoss','expedition','expeditionBoss','adventure'])d.setScene({key});assert.equal(d.inspect().cacheSize,2);
 d.setPreferences({muted:true});assert.equal(ac.state,'suspended');d.destroy();d.destroy();assert.equal(ac.closed,1);assert.equal(d.inspect().stems,0);assert.ok(ac.sources.every(s=>s.stopped!==undefined));
});
function memoryStorage(){const map=new Map();return {get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};}
test('records: independent tab run IDs merge; revive and retry are idempotent; legacy data stays readable',()=>{
 globalThis.localStorage=memoryStorage();R.saveRecords(R.parseRecords(null));const key=R.deliveryConfigKey({shiftMs:120000,target:5},'normal');
 const a={id:'tab-a',type:'delivery',key,result:{score:10,delivered:1,won:false}},b={...a,id:'tab-b',result:{score:20,delivered:2,won:true}};
 assert.ok(R.commitResult(a));assert.ok(R.commitResult(b));assert.equal(R.getRecord(R.loadRecords(),key).plays,2);assert.equal(R.getRecord(R.loadRecords(),key).best,20);
 R.commitResult({...a,result:{score:40,delivered:5,won:true}});const r=R.getRecord(R.loadRecords(),key);assert.equal(r.plays,2);assert.equal(r.wins,2);assert.equal(r.best,40);
 const save=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')};const writer=R.createResultWriter({},true);assert.equal(writer.write({...a,id:'retry'},R.parseRecords(null)),false);assert.ok(writer.pending);assert.equal(R.getRecord(R.loadRecords(),key).plays,3);localStorage.setItem=save;assert.ok(writer.retry());assert.ok(writer.retry());assert.equal(R.getRecord(R.loadRecords(),key).plays,3);
});
test('AI: observing a fresh visible warning delays evasion and respects reaction on repeat attacks',()=>{
 const l=campaign.CAMPAIGN_VARIANTS[29][0],s=puzzle.createState(l),b=s.beasts[0],a=s.guards[0];
 a.x=b.home.x+b.dx;a.y=b.home.y+b.dy;a.id='guard-test';b.state='WINDUP';b.warnedAt=0;
 threats.perceiveBeasts(s,a);assert.equal(threats.escapeBeast(s,a),null);assert.ok(a.reactingUntil>s.time);
 s.time=.21;threats.perceiveBeasts(s,a);assert.ok(a.known[b.id]>s.time);
 b.warnedAt=.22;s.time=.22;threats.perceiveBeasts(s,a);assert.equal(threats.escapeBeast(s,a),null);
});
test('Expedition: boss signatures differ, have reachable safe tiles and enough warning at each phase',()=>{
 const arena=boss.parseArena(boss.ARENA_MAP,boss.START,boss.WEAK_TILES), patterns=new Set();
 for(const variant of boss.BOSS_VARIANTS)for(let phase=1;phase<=3;phase++){
 const s=boss.createState({arena,rng:createRng(13),interval:180,t:0});s.round=10;s.variant=variant;s.phase=phase;const a=boss.signatureAttack(s);assert.ok(a);patterns.add(a.pattern);assert.ok(a.teleMs>=2200);assert.ok(a.cells.size>0&&a.cells.size<255);assert.ok([...a.cells].every(k=>k>=0&&k<255));
 const h=s.snake[0],q=[h],seen=new Set([h.y*17+h.x]);let safe=false;for(let i=0;i<q.length;i++){const p=q[i];if(!a.cells.has(p.y*17+p.x)){safe=true;break}for(const d of Object.values(boss.DIRS)){const x=p.x+d.x,y=p.y+d.y,k=y*17+x;if(x>=0&&x<17&&y>=0&&y<15&&!arena.boss[k]&&!seen.has(k)){seen.add(k);q.push({x,y})}}}assert.ok(safe);
 }
 assert.equal(patterns.size,3);
});
test('Dungeon: quality uses path separation and does not treat a high score as a mission proof',()=>{
 for(const variants of campaign.CAMPAIGN_VARIANTS)for(const l of variants){const q=mapQuality(l);assert.equal(q.errors.length,0,l.variantId+' '+q.errors);assert.ok(q.score>=0&&q.score<=100);assert.ok(l.qualityProof,l.variantId);assert.ok(l.guards.length<=6);if(l.number>=25)assert.ok(l.guards.some(g=>g.specialty==='warden'));}
});

test('Warden: visible brace locks its lane; stun cancels it without moving or teleporting',()=>{
 const s=puzzle.createState(room({spawn:pt(6,4),guards:[guard(4,4,{specialty:'warden',role:'relic',facing:0,post:pt(4,4),watch:[0],watchDwell:[2],range:6})]})),g=s.guards[0];
 g.state='CHASE';g.suspicion=1;g.lastKnown={...s.player};puzzle.step(s,{},1/60);assert.equal(g.charge?.stage,'brace');const start={x:g.x,y:g.y},target={...g.charge.target};
 advance(s,.4,{y:-1});assert.equal(g.x,start.x);assert.equal(g.y,start.y);assert.deepEqual(g.charge.target,target);
 g.stunnedUntil=s.time+2;puzzle.step(s,{},1/60);assert.equal(g.charge,null);assert.equal(g.x,start.x);assert.equal(g.y,start.y);
});

test('Warden: rush stops at another NPC and cannot reroute outside its locked lane',()=>{
 const s=puzzle.createState(room({spawn:pt(7,4),guards:[guard(4,4,{specialty:'warden',role:'relic',facing:0,range:6}),guard(5,4)]})),g=s.guards[0],block=s.guards[1];block.stunnedUntil=9;
 g.state='CHASE';g.suspicion=1;g.lastKnown={...s.player};puzzle.step(s,{},1/60);assert.equal(g.charge?.stage,'brace');advance(s,1.1);assert.equal(g.charge?.stage,'recover');assert.ok(geometry.distance(g,block)>=.54);assert.equal(g.y,4.5);assert.ok(g.x<block.x);
});
