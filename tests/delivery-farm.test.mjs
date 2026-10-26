import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {root} from './helpers/env.mjs';
const load=name=>import(root+'/node_modules/.cache/snake-tests/delivery/'+name+'.mjs');
const {buildFarmPlan}=await load('farmPlan'),{cityLayout}=await load('city'),{MISSIONS}=await load('missions'),{parseArena,createState}=await load('sim');
const {FARM_FILES,FARM_SPRITES,createFarmAssets}=await load('farmAssets');
const {drawDelivery,disposeDeliveryRenderer}=await load('render');

test('farm layout: all 192 mission/difficulty/seed plans remain inside existing obstacles and preserve roads',()=>{
 for(const difficulty of ['normal','hard'])for(const mission of MISSIONS)for(let seed=0;seed<8;seed++){
  const city=cityLayout({...mission,difficulty},seed),arena=parseArena(city.map,city.start,city),before=structuredClone(arena),plan=buildFarmPlan(arena);
  assert.deepEqual(arena,before);assert.equal(arena.w,difficulty==='normal'?25:17);assert.equal(arena.h,difficulty==='normal'?23:15);
  assert.deepEqual(plan.lots.filter(l=>l.type).map(l=>l.type).sort(),['A','B','C']);
  for(const {rect:r}of plan.lots)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)assert.ok(arena.obstacle[y*arena.w+x]);
  for(const e of plan.edges)assert.ok(arena.obstacle[e.y*arena.w+e.x]);
 }
});
function webpInfo(url){const b=fs.readFileSync(root+'/public'+url);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');const kind=b.toString('ascii',12,16);if(kind==='VP8 ')return {width:b.readUInt16LE(26)&16383,height:b.readUInt16LE(28)&16383,alpha:false,bytes:b.length};assert.equal(kind,'VP8X');return {width:b.readUIntLE(24,3)+1,height:b.readUIntLE(27,3)+1,alpha:!!(b[20]&16),bytes:b.length};}
test('farm assets: real transparent WebP atlases, valid sprite bounds and a small download budget',()=>{
 const info=Object.fromEntries(Object.entries(FARM_FILES).map(([k,v])=>[k,webpInfo(v)]));assert.ok(info.environment.alpha&&info.cargo.alpha);assert.ok(Object.values(info).reduce((n,v)=>n+v.bytes,0)<200000);
 for(const [key,x,y,w,h]of Object.values(FARM_SPRITES)){assert.ok(x>=0&&y>=0&&w>0&&h>0);assert.ok(x+w<=info[key].width&&y+h<=info[key].height);}
 for(const name of ['bg-delivery.webp','bg-delivery-m.webp']){const hero=webpInfo('/assets/game/'+name);assert.ok(hero.alpha);assert.ok(hero.bytes<300000);}
});
test('farm asset loading: a failed image settles and leaves the fallback available',async()=>{
 const images=[];const bank=createFarmAssets(()=>{const img={};images.push(img);return img;});images[0].onload();images[1].onerror();images[2].onload();await bank.ready;assert.equal(bank.revision,3);assert.deepEqual(bank.errors,[FARM_FILES.cargo]);
});
test('farm renderer: drawing does not alter gameplay, caches static ground and releases it on destroy',()=>{
 const oldDocument=globalThis.document;const canvases=[];const noop=()=>{};
 const ctx=()=>new Proxy({},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
 globalThis.document={createElement:()=>{const c={width:0,height:0,getContext:ctx};canvases.push(c);return c;}};
 try{
  const cfg={...MISSIONS[11],difficulty:'normal'},city=cityLayout(cfg,1),arena=parseArena(city.map,city.start,city),state=createState({arena,config:cfg,rng:()=>.3,interval:140,t:0}),before=JSON.stringify(state,(_,v)=>v instanceof Set?[...v]:v),rng=state.rng,c=ctx();
  drawDelivery(c,780,1688,state,{cssWidth:390,cssHeight:844});drawDelivery(c,780,1688,state,{cssWidth:390,cssHeight:844,overview:true,t:300});
  assert.equal(JSON.stringify(state,(_,v)=>v instanceof Set?[...v]:v),before);assert.equal(state.rng,rng);assert.equal(canvases.length,1);assert.ok(canvases[0].width>0);disposeDeliveryRenderer(c);assert.equal(canvases[0].width,0);assert.equal(canvases[0].height,0);
 }finally{globalThis.document=oldDocument;}
});
