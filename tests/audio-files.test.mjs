import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {root} from './helpers/env.mjs';
const load=file=>import(pathToFileURL(root+'/node_modules/.cache/snake-tests/'+file+'.mjs'));
const {MUSIC,EFFECT_FILES}=await load('audio/catalog'),{CUES}=await load('audio/cues'),{musicTrack,loadMusicFiles}=await load('audio/loader'),{createAudioDirector}=await load('audio/director');
function streamInfo(url){const b=fs.readFileSync(root+'/public'+url);assert.equal(b.toString('ascii',0,4),'fLaC');assert.equal(b[4]&127,0);assert.equal(b.readUIntBE(5,3),34);const n=b.readBigUInt64BE(18);return {rate:Number(n>>44n),channels:Number((n>>41n)&7n)+1,bits:Number((n>>36n)&31n)+1,frames:Number(n&0xfffffffffn)};}
<<<<<<< HEAD
test('audio files: 25 themes, 35 arrangements and 70 lossless stems have exact matching frame counts',()=>{
 assert.equal(new Set(Object.values(MUSIC).map(t=>t.key)).size,25);assert.equal(Object.keys(MUSIC).length,35);
=======
test('audio files: 20 themes, 30 arrangements and 60 lossless stems have exact matching frame counts',()=>{
 assert.equal(new Set(Object.values(MUSIC).map(t=>t.key)).size,20);assert.equal(Object.keys(MUSIC).length,30);
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
 const paths=new Set();for(const t of Object.values(MUSIC)){
  const base=streamInfo(t.base),danger=streamInfo(t.danger);assert.deepEqual(base,danger,t.key);assert.deepEqual(base,{rate:22050,channels:1,bits:16,frames:t.frames});
  assert.equal(t.duration,t.frames/t.sampleRate);assert.ok(fs.statSync(root+'/public'+t.preview).size>10000);
  assert.ok(fs.readFileSync(root+'/public'+t.preview).subarray(0,3).equals(Buffer.from('ID3')));
<<<<<<< HEAD
  paths.add(t.base);paths.add(t.danger);assert.ok(t.duration>(t.loop===false?5:25)&&t.duration<60);
 }assert.equal(paths.size,70);assert.equal(musicTrack('dungeon',2).variation,2);assert.equal(musicTrack('classic',99).variation,0);
=======
  paths.add(t.base);paths.add(t.danger);assert.ok(t.duration>25&&t.duration<60);
 }assert.equal(paths.size,60);assert.equal(musicTrack('dungeon',2).variation,2);assert.equal(musicTrack('classic',99).variation,0);
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
});
test('audio files: every new sound effect has a non-silent PCM WAV file',()=>{
 assert.deepEqual(Object.keys(EFFECT_FILES).sort(),Object.keys(CUES).sort());
 for(const [name,url] of Object.entries(EFFECT_FILES)){
  const b=fs.readFileSync(root+'/public'+url);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt32LE(24),22050);assert.equal(b.readUInt16LE(34),16);assert.equal(b.readUInt32LE(40),b.length-44);
  let peak=0,energy=0;for(let i=44;i<b.length;i+=2){const n=b.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(n));energy+=n*n;}
  assert.ok(energy>0,name);assert.ok(peak<.8,name);assert.equal(b.readInt16LE(b.length-2),0);
 }
});
test('audio file loader: fetches only two stems, propagates abort and rejects failed or mismatched assets',async()=>{
 const urls=[],signal=new AbortController().signal,decoded=[{length:8,sampleRate:8,duration:1},{length:8,sampleRate:8,duration:1}],ctx={decodeAudioData:async()=>decoded.shift()};
<<<<<<< HEAD
 const buffers=await loadMusicFiles(musicTrack('dungeon',2),ctx,signal,async(url,o)=>{urls.push(url);assert.ok(o.signal instanceof AbortSignal);assert.equal(o.signal.aborted,false);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}});
 assert.equal(buffers.length,2);assert.deepEqual(urls,[MUSIC['dungeon:2'].base,MUSIC['dungeon:2'].danger]);
 await assert.rejects(loadMusicFiles({...MUSIC['classic:0'],preview:null},ctx,signal,async()=>({ok:false})),/could not load/);
 let call=0;await assert.rejects(loadMusicFiles({...MUSIC['classic:0'],preview:null},{decodeAudioData:async()=>({length:++call===1?10:100,sampleRate:10,duration:1})},signal,async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})),/matching sample/);
=======
 const buffers=await loadMusicFiles(musicTrack('dungeon',2),ctx,signal,async(url,o)=>{urls.push(url);assert.equal(o.signal,signal);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}});
 assert.equal(buffers.length,2);assert.deepEqual(urls,[MUSIC['dungeon:2'].base,MUSIC['dungeon:2'].danger]);
 await assert.rejects(loadMusicFiles(MUSIC['classic:0'],ctx,signal,async()=>({ok:false})),/could not load/);
 let call=0;await assert.rejects(loadMusicFiles(MUSIC['classic:0'],{decodeAudioData:async()=>({length:++call===1?10:100,sampleRate:10,duration:1})},signal,async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})),/matching sample/);
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
});
test('audio file loader: a custom single file can replace a theme without a second stem',async()=>{
 const base={length:10,sampleRate:10,duration:1},ctx={decodeAudioData:async()=>base,createBuffer:(n,length,rate)=>({length,sampleRate:rate,duration:length/rate,silent:true})};
 const b=await loadMusicFiles({base:'/custom.mp3',danger:null},ctx,null,async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));assert.equal(b[0],base);assert.equal(b[1].silent,true);
});
test('audio file loading: disposal cancels pending requests and cannot create a late soundtrack',async()=>{
 let signal,resolve;const ac={currentTime:1,state:'running',destination:{},createGain:()=>({gain:{cancelScheduledValues(){},setTargetAtTime(){}},connect(){}}),resume:async()=>{},close:async()=>{}};
 const d=createAudioDirector({contextFactory:()=>ac,fetchAudio:null,loadMusic:(track,c,s)=>{signal=s;return new Promise(r=>resolve=r)}});d.unlock();assert.equal(d.inspect().preparing,'classic:0');d.destroy();assert.equal(signal.aborted,true);resolve([]);await Promise.resolve();assert.equal(d.inspect().stems,0);assert.equal(d.inspect().cacheSize,0);
});
test('audio file loading: failed music stays bounded and can load another theme',async()=>{
 let calls=0;const ac={currentTime:1,state:'running',destination:{},createGain:()=>({gain:{cancelScheduledValues(){},setTargetAtTime(){}},connect(){}}),resume:async()=>{},close:async()=>{}};
 const d=createAudioDirector({contextFactory:()=>ac,fetchAudio:null,loadMusic:async()=>{calls++;throw Error('missing file')}});d.unlock();for(let i=0;i<10;i++)await Promise.resolve();
 assert.match(d.inspect().musicError,/missing file/);for(let i=0;i<40;i++)d.setScene({intensity:i/40});assert.equal(calls,1);d.setScene({key:'dungeon'});for(let i=0;i<10;i++)await Promise.resolve();assert.equal(calls,2);d.destroy();
});
