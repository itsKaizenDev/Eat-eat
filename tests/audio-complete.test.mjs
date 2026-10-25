import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { root, registry, makePuzzleWorld, puzzle, validation } from './helpers/env.mjs';
import { room, pt } from './puzzle.fixtures.mjs';
const load = file => import(pathToFileURL(root+'/node_modules/.cache/snake-tests/'+file+'.mjs'));
const {SCORES,composeScore,audioScene} = await load('audio/score');
const {createAudioDirector} = await load('audio/director');
const {battleAudioEvent} = await load('audio/events');
function fakeAudio() {
  const ac={currentTime:2,state:'suspended',sources:[],oscillators:[],closed:0};
  const parameter=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}});
  const node=()=>({gain:parameter(),frequency:parameter(),connect(){},disconnect(){}});
  const source=()=>({...node(),start(at,offset=0){this.started=at;this.offset=offset},stop(at){this.stopped=at??ac.currentTime},finish(){this.onended?.()}});
  ac.createGain=node;ac.destination=node();ac.createBuffer=(_,length,rate)=>({duration:length/rate,copyToChannel(){}});
  ac.createBufferSource=()=>{const s=source();ac.sources.push(s);return s};ac.createOscillator=()=>{const s=source();ac.oscillators.push(s);return s};
  ac.resume=()=>{ac.state='running';return Promise.resolve()};ac.suspend=()=>{ac.state='suspended';return Promise.resolve()};ac.close=()=>{ac.closed++;return Promise.resolve()};
  ac.decodeAudioData=async()=>({duration:1});return ac;
}
const smallScore=()=>({base:new Float32Array(20),danger:new Float32Array(20),sampleRate:20});
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};

test('audio: every registered mode has an intentional musical route; arcade modes have ten distinct identities',()=>{
 const arcade=[];
 for(const mode of registry.MODES){const scene=audioScene({mode:mode.id,running:true});assert.ok(SCORES[scene.key],mode.id);if(mode.kind==='arcade')arcade.push(scene.key);assert.ok(Number.isFinite(scene.intensity));}
 assert.equal(new Set(arcade).size,10);
 assert.equal(audioScene({mode:'boss',running:true,boss:{isBoss:false,variant:'root',round:2}}).key,'expedition');
 const bossThemes=['root','spore','vine'].map(variant=>audioScene({mode:'roguelite',running:true,boss:{isBoss:true,variant,phase:2}}).key);
 assert.equal(new Set(bossThemes).size,3);assert.ok(bossThemes.every(key=>key!=='dungeonBoss'));
 const before=audioScene({mode:'puzzle',running:true,puzzle:{boss:{stage:'GAP',phase:1}}});
 const later=audioScene({mode:'puzzle',running:true,puzzle:{boss:{stage:'ACTIVE',phase:5}}});
 assert.equal(before.key,later.key);assert.ok(later.intensity>before.intensity);
 assert.equal(audioScene({mode:'puzzle',running:true,puzzle:{boss:{stage:'DEFEATED',phase:5}}}).key,'dungeon');
});
test('audio: adventure environments and urgent encounters follow actual progress, time, lives and territory',()=>{
 const courier=timeText=>audioScene({mode:'delivery',running:true,delivery:{timeText}});
 assert.equal(courier('2:00').key,'adventure');assert.equal(courier('1:00').key,'adventureMarket');assert.equal(courier('0:20').key,'adventureDanger');
 assert.equal(audioScene({mode:'territory',running:true,territory:{timeText:'1:00',players:[{lives:3,pct:20}]}}).key,'adventureArena');
 assert.equal(audioScene({mode:'territory',running:true,territory:{timeText:'1:00',players:[{lives:1,pct:20}]}}).key,'adventureDanger');
 assert.equal(audioScene({mode:'timeattack',running:true,timerText:'0:10'}).intensity,.95);
});
test('audio: output keeps combined stems within headroom and loop variation is deterministic',()=>{
 const a=composeScore('expeditionSpore',8000,1),b=composeScore('expeditionSpore',8000,1),c=composeScore('expeditionVine',8000,1);
 assert.deepEqual(a,b);assert.notDeepEqual(a.base,c.base);
 assert.equal(a.base.length,a.danger.length);assert.ok(a.duration>=30);
 for(let i=0;i<a.base.length;i++)assert.ok(Math.abs(a.base[i])+Math.abs(a.danger[i])<=.750001);
});
test('audio: boss outgoing damage, player damage, active attack and weak window have different cues',()=>{
 assert.equal(battleAudioEvent({type:'hit'}),'bosshit');assert.equal(battleAudioEvent({type:'death'}),'hurt');
 assert.equal(battleAudioEvent({type:'attack',stage:'tele'}),'windup');assert.equal(battleAudioEvent({type:'attack',stage:'active'}),'strike');
 assert.equal(battleAudioEvent({type:'window',open:true}),'weak');assert.equal(battleAudioEvent({type:'window',open:false}),null);
});
test('audio: portal and gadget action cues play immediately, once, and survive the next simulation frame',()=>{
 const w=makePuzzleWorld({levels:[room({portals:[{id:'a',...pt(2,2),pair:'b',label:'I'},{id:'b',...pt(10,6),pair:'a',label:'I'}]})]}),events=[];
 w.sounds.playEvent=name=>events.push(name);w.eng.startRun();assert.equal(w.eng.action('interact'),true);assert.equal(events.filter(e=>e==='portal').length,1);
 w.advance(100);assert.equal(events.filter(e=>e==='portal').length,1);
 w.eng.action('cycle');assert.equal(w.eng.action('gadget'),true);assert.equal(events.filter(e=>e==='smoke').length,1);
 w.advance(100);assert.equal(events.filter(e=>e==='smoke').length,1);w.eng.destroy();
});
test('audio: original SFX unlock into one context, use synth while loading, and never replay a stale event',async()=>{
 const ac=fakeAudio(),resolvers=[];
 const d=createAudioDirector({contextFactory:()=>ac,compose:smallScore,fetchAudio:()=>new Promise(resolve=>resolvers.push(resolve))});
 d.sample('chomp');assert.equal(ac.oscillators.length,0);d.unlock();await flush();assert.equal(resolvers.length,5);
 d.sample('chomp');assert.equal(ac.oscillators.length,1);for(const resolve of resolvers)resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await flush();
 assert.equal(d.inspect().assets,5);assert.equal(ac.sources.filter(s=>!s.loop).length,0);
 ac.currentTime+=1;d.sample('chomp');assert.equal(ac.sources.filter(s=>!s.loop).length,1);
 d.setScene({paused:true});ac.currentTime+=1;d.sample('death');assert.equal(ac.sources.filter(s=>!s.loop).length,1);d.destroy();assert.equal(ac.closed,1);
});
test('audio: low-priority voices are bounded; fatal audio interrupts warning; mute and zero SFX prevent playback',()=>{
 const ac=fakeAudio(),d=createAudioDirector({contextFactory:()=>ac,compose:smallScore,fetchAudio:null});d.unlock();
 for(let i=0;i<25;i++)d.tone(200,0,.2,'sine',.05,undefined,0,'move');assert.equal(d.inspect().voices,20);
 d.event('windup');assert.equal(d.inspect().voices,20);assert.ok(ac.oscillators.slice(0,20).some(o=>o.stopped===ac.currentTime));
 for(const o of ac.oscillators)o.finish();d.sample('eits');const warning=ac.oscillators.at(-1);d.sample('death');assert.equal(warning.stopped,ac.currentTime);
 const count=ac.oscillators.length;d.setPreferences({sfx:0});ac.currentTime++;d.event('phase');assert.equal(ac.oscillators.length,count);
 d.setPreferences({sfx:1,muted:true});d.sample('chomp');assert.equal(ac.oscillators.length,count);d.destroy();
});
test('audio: asynchronous music coalesces mode switches, preserves current playhead and ignores completion after destroy',async()=>{
 const ac=fakeAudio(),pending=[];let disposed=0;
 const d=createAudioDirector({contextFactory:()=>ac,renderScore:(key)=>new Promise(resolve=>pending.push({key,resolve})),disposeRenderer:()=>disposed++,fetchAudio:null});
 d.unlock();await flush();assert.equal(pending.length,1);d.setScene({key:'dungeon'});d.setScene({key:'expeditionSpore'});assert.equal(pending.length,1);
 pending.shift().resolve(smallScore());await flush();assert.equal(pending.length,1);assert.equal(pending[0].key,'expeditionSpore');pending.shift().resolve(smallScore());await flush();
 const sources=ac.sources.length;d.setScene({intensity:.9});assert.equal(ac.sources.length,sources);d.setScene({paused:true});assert.equal(ac.state,'suspended');d.setScene({paused:false});assert.equal(ac.sources.length,sources);
 d.setScene({key:'portal'});await flush();d.destroy();pending.shift().resolve(smallScore());await flush();assert.equal(d.inspect().cacheSize,0);assert.equal(disposed,1);
});
test('audio: failed original asset loads keep an immediate audible fallback without late retries',async()=>{
 const ac=fakeAudio(),d=createAudioDirector({contextFactory:()=>ac,compose:smallScore,fetchAudio:async()=>({ok:false})});d.unlock();await flush();
 assert.equal(d.inspect().assetErrors.length,5);d.sample('chomp');assert.equal(ac.oscillators.length,1);d.destroy();
});

test('audio: boss phase changes alter the arrangement while preserving its musical position',()=>{
 const ac=fakeAudio(),d=createAudioDirector({contextFactory:()=>ac,compose:smallScore,fetchAudio:null});
 d.setScene({key:'dungeonBoss',variation:0});d.unlock();ac.currentTime+=2.4;
 d.setScene({variation:1});assert.ok(ac.sources.at(-1).offset>.39&&ac.sources.at(-1).offset<.41);
 d.setScene({key:'expeditionSpore',variation:1});assert.equal(ac.sources.at(-1).offset,0);d.destroy();
});

test('Dungeon proof: crossing a spider web uses actual reduced movement speed without teleporting',()=>{
 const s=puzzle.createState(room({beasts:[{id:'web',kind:'spider',...pt(6,4),web:5,windup:2,strike:.8,recover:3}]}));
 const start={...s.player};validation.replayRoute(s,[{...pt(3,2),ticks:77}]);
 assert.ok(Math.hypot(s.player.x-3.5,s.player.y-2.5)<.08);assert.ok(s.time>=1.2&&s.time<1.4);assert.equal(s.status,'playing');
 assert.ok(Math.hypot(s.player.x-start.x,s.player.y-start.y)<=1.02);
});
test('Dungeon proof: smoke commands invoke the real action, consume cooldown and preserve the source level',()=>{
 const level=room(),before=JSON.stringify(level),s=puzzle.createState(level);
 validation.replayRoute(s,[{...pt(3,2),gadget:'smoke'}]);assert.equal(s.smoke.length,1);assert.ok(s.cooldowns.smoke>s.time+8);assert.equal(s.gadget,'smoke');assert.equal(JSON.stringify(level),before);
 const pos={...s.player};validation.replayRoute(s,[{...pt(4,2),gadget:'smoke'}]);assert.equal(s.player.x,pos.x,'cooldown cannot be bypassed by a proof command');
});
test('Dungeon proof: complete trace includes waits, key-door interaction and can replay independently',()=>{
 const level=room({spawn:pt(2,2),exit:pt(2,2),keys:[{id:'key-a',kind:'key',key:'a',...pt(3,2)}],doors:[{id:'gate',kind:'key',key:'a',...pt(5,2)}],artifacts:[{id:'r',kind:'artifact',...pt(8,2)}]}),before=JSON.stringify(level);
 const proof=validation.verifyMission(level,{bonus:true,wait:1,maxNodes:100,horizon:70});assert.ok(proof.ok,JSON.stringify(proof.errors));
 assert.ok(proof.trace.some(c=>c.action==='interact'));assert.ok(proof.trace.some(c=>c.wait===1));const replay=puzzle.createState(level);validation.replayRoute(replay,proof.trace);
 assert.equal(replay.status,'won');assert.equal(replay.result.stars,3);assert.equal(replay.alerts,0);assert.ok(Math.abs(replay.time-proof.time)<1e-7);assert.equal(JSON.stringify(level),before);
});
