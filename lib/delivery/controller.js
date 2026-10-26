// One simulation clock, one RAF owner, shared input and record journal.
import { createSimClock } from '../sim/clock';
import { DEFAULT_CONFIG, ARENA_MAP, START, DIRS, TYPES, parseArena, createState, stepSim, advanceTime, finishShift, lifeLeft, movementInterval, cargoUnits } from './sim';
import { drawDelivery, disposeDeliveryRenderer } from './render';
import { FARM_SITES, FARM_DISTRICTS } from './farmAssets';
import { MISSIONS, missionAt, PACKAGE_KINDS } from './missions';
import { cityLayout } from './city';
import { loadDeliveryProgress, saveDeliveryProgress, mergeDeliveryProgress, emptyProgress, loadDeliveryDifficulty, saveDeliveryDifficulty } from './progress';
import { createRng } from '../sim/rng';
import { SPEEDS } from '../storage';
import { newResultId, createResultWriter, loadRecords, saveRecords, deliveryConfigKey, getRecord, recordResult } from '../records';
import { resolveDeliveryTurn } from './turns';
import { isOpposite } from '../sim/grid';
const BLOCKERS=['help','orientation','hidden'],KEY_OF={'0,-1':'U','0,1':'D','-1,0':'L','1,0':'R'},INTERVAL={santai:180,normal:140,ngebut:100,konstan:140};
const MENU_OVERLAY={phase:'start',mood:'idle',title:'K-Snake',sub:'Pilih misi pengantaran.',btnText:'PLAY'};
export function createDeliveryGame({canvas,sounds={},onUpdate=()=>{},rng,now:nowFn,raf:rafOpt,caf:cafOpt,io,config,inspect,progressIO}) {
 const custom=!!config&&!config.mayhem,ctx=canvas.getContext('2d'),rand=rng||Math.random,realNow=nowFn||(()=>performance.now());
 const raf=rafOpt||(typeof requestAnimationFrame==='function'?requestAnimationFrame:()=>0),caf=cafOpt||(typeof cancelAnimationFrame==='function'?cancelAnimationFrame:()=>{}),store=io||{load:loadRecords,save:saveRecords},writer=createResultWriter(store,!io),clock=createSimClock(realNow);
 const checkpoints=progressIO||(io?{load:emptyProgress,save:()=>true}:{load:loadDeliveryProgress,save:saveDeliveryProgress});
 let difficulty=!custom&&!io?loadDeliveryDifficulty():'normal';
 let progress=checkpoints.load(difficulty),selected=0,lastPlayed=0,seed=null,records=store.load(),resultId=null,cfg,arena;
 let speedPref='normal',runSpeed='normal',state='menu',sim,prevSnake=[],queue=[],lastTick=0,nextTickAt=0,interval=140,message='',lastHud=-1,destroyed=false,rafId=null,progressPending=false,overview=false;
 let pressure=false,pressureSince=0,pressureCandidate=false;
 const pauseReasons=new Set(),isActive=()=>state==='playing'||state==='paused';
 const emit=p=>{if(!destroyed)onUpdate({...p,recordSave:{pending:writer.pending||progressPending}});};
 const fmt=ms=>{const s=Math.ceil(Math.max(0,ms)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 const keyFor=()=>deliveryConfigKey(cfg,isActive()||state==='won'||state==='lost'?runSpeed:speedPref);
 function reset(preview=false){
  cfg=custom?{...DEFAULT_CONFIG,...config}:{...DEFAULT_CONFIG,...missionAt(selected),...(config||{}),difficulty,turnLead:difficulty==='normal'?2:0};
  interval=INTERVAL[speedPref]||140;runSpeed=speedPref;
  if(custom)arena=parseArena(ARENA_MAP,START);else{const city=cityLayout(cfg,preview?cfg.number*7919:seed);arena=parseArena(city.map,city.start,city);}
  sim=createState({arena,config:cfg,rng:custom?rand:createRng(preview?cfg.number*7919:seed),interval,t:clock.now()});
  prevSnake=sim.snake.map(p=>({...p}));queue=[];lastTick=clock.now();nextTickAt=lastTick+interval;message='';lastHud=-1;overview=false;pressure=false;pressureCandidate=false;pressureSince=0;
  emitFullState();
 }
 function updatePressure(){
  const now=clock.now(),candidate=cfg.shiftMs-now<20000||sim.orders.some(o=>o.deadline-now<(o.kind==='express'?11000:6000));
  if(candidate!==pressureCandidate){pressureCandidate=candidate;pressureSince=now;}
  if(candidate!==pressure&&now-pressureSince>=(candidate?1000:3500))pressure=candidate;
 }
 function deliveryHud(){
  const t=clock.now(),slots=[];
  for(let i=0;i<cfg.capacity;i++){const c=sim.cargo[i];slots.push(c?{id:c.id,type:c.type,label:TYPES[c.type].label,kind:c.kind||'standard',kindLabel:PACKAGE_KINDS[c.kind]?.label||'Reguler',integrity:c.integrity??100,remaining:c.remaining||[c.type],size:c.size||1,secs:Math.ceil(lifeLeft(c,t)/1000),pct:Math.round(lifeLeft(c,t)/c.lifeMs*100)}:null);}
  return {revision:custom?1:2,difficulty,difficultyLabel:difficulty==='hard'?'Hard':'Normal',mission:cfg.number||0,name:cfg.name||'Shift Kurir',district:custom?(arena.district||'Kota Apel'):FARM_DISTRICTS[Math.floor(((cfg.number||1)-1)/3)],timeText:fmt(cfg.shiftMs-t),remainingMs:Math.max(0,cfg.shiftMs-t),delivered:sim.delivered,target:cfg.target,score:sim.score,stale:sim.stale,cargo:slots,capacity:cfg.capacity,units:cargoUnits(sim),streak:sim.streak||0,message,braking:sim.braking,overview,
   scene:state==='menu'?'menu':state==='won'?'won':state==='lost'?'lost':pressure?'rush':'normal',pressure,
   orders:sim.orders.map(o=>({id:o.id,type:o.type,label:TYPES[o.type].label,kind:o.kind||'standard',kindLabel:PACKAGE_KINDS[o.kind]?.label||'Reguler',picked:o.picked,pickup:o.pickup,stops:sim.cargo.find(c=>c.id===o.id)?.remaining||o.stops||[o.type],secs:Number.isFinite(o.deadline)?Math.max(0,Math.ceil((o.deadline-t)/1000)):null,reward:o.reward||cfg.points+cfg.quickBonus,integrity:sim.cargo.find(c=>c.id===o.id)?.integrity??100})),sites:custom?Object.fromEntries(Object.keys(TYPES).map(k=>[k,TYPES[k].label])):FARM_SITES,breakdown:sim.breakdown,rank:sim.rank};
 }
 function menuData(){const rec=getRecord(records,deliveryConfigKey(cfg,speedPref));return {...rec,difficulty,difficultyLabel:difficulty==='hard'?'Hard':'Normal',mapSize:`${arena.w}×${arena.h}`,shiftSec:Math.round(cfg.shiftMs/1000),target:cfg.target,speed:speedPref,selected,missions:custom?null:MISSIONS.map((m,i)=>({...m,unlocked:i<progress.unlocked,best:progress.missions[m.id]?.score||0,stars:progress.missions[m.id]?.stars||0})),progressPending};}
 function emitFullState(){updatePressure();emit({score:sim.score,best:getRecord(records,keyFor()).best,modeLabel:'K-Snake · Delivery Mayhem',mode:'delivery',effects:[],mpHud:null,timerText:null,running:isActive(),paused:state==='paused',puzzle:null,puzzleMenu:null,delivery:deliveryHud(),deliveryMenu:menuData(),roguelite:null,rogueMenu:null,territory:null,territoryMenu:null,boss:null,bossMenu:null});}
 function startRun(reuse=false){
  if(!sim||!['menu','won','lost'].includes(state))return false;
  if(!reuse&&(state!=='lost'||lastPlayed!==selected))seed=Math.floor(rand()*4294967296)>>>0;
  seed??=Math.floor(rand()*4294967296)>>>0;lastPlayed=selected;records=store.load();resultId=newResultId();clock.reset();pauseReasons.clear();reset();state='playing';clock.start();lastTick=clock.now();nextTickAt=lastTick+movementInterval(sim);emit({overlay:{phase:'none'}});emitFullState();return true;
 }
 function pauseRun(reason='user'){if(!isActive())return false;pauseReasons.add('user');if(reason!=='user')pauseReasons.add(reason);if(state==='playing'){state='paused';sim.braking=false;queue=[];clock.stop();emitFullState();emit({overlay:{phase:'pause',mood:'idle',title:'Pengantaran dijeda',sub:'Deadline dan gerobak ikut berhenti.',btnText:'Lanjut'}});}return true;}
 const releasePause=reason=>{if(reason&&reason!=='user')pauseReasons.delete(reason);};
 function resumeRun(){if(state!=='paused'||[...pauseReasons].some(r=>BLOCKERS.includes(r)))return false;pauseReasons.clear();state='playing';sim.braking=false;clock.start();emitFullState();emit({overlay:{phase:'none'}});return true;}
 function returnToMenu(){state='menu';queue=[];clock.reset();pauseReasons.clear();seed=null;records=store.load();reset(true);emit({overlay:MENU_OVERLAY});}
 function setDir(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)+Math.abs(y)!==1)return;if(['menu','won','lost'].includes(state)){if(!startRun())return;}if(state==='paused'&&!resumeRun())return;if(queue.length&&resolveDeliveryTurn(sim,queue[0]).pending&&sim.dir.x===x&&sim.dir.y===y){queue=[];return;}const last=queue.at(-1)||sim.dir;if(isOpposite(last,{x,y})||last.x===x&&last.y===y||queue.length>=2)return;queue.push({x,y});sounds.playMove?.();}
 function persistCheckpoint(){try{progress=mergeDeliveryProgress(progress,checkpoints.load(difficulty));progressPending=checkpoints.save(progress,difficulty)===false;}catch{progressPending=true;}return !progressPending;}
 function endRun(finalState,death=false){
  if(!isActive())return false;state=finalState;clock.stop();pauseReasons.clear();queue=[];sim.braking=false;
  const event={id:resultId,type:'delivery',key:deliveryConfigKey(cfg,runSpeed),result:{score:sim.score,delivered:sim.delivered,won:state==='won'}},result=recordResult(store.load(),event.key,event.result);records=result.records;writer.write(event,records);
  if(state==='won'&&!custom){const old=progress.missions[cfg.id]||{score:0,stars:0};progress={...progress,unlocked:Math.max(progress.unlocked,Math.min(MISSIONS.length,selected+2)),missions:{...progress.missions,[cfg.id]:{score:Math.max(old.score,sim.score),stars:Math.max(old.stars,sim.stars||1)}}};persistCheckpoint();selected=Math.min(MISSIONS.length-1,selected+1);}
  if(death)sounds.playDeath?.();else if(state==='won')sounds.playWin?.();else sounds.playEvent?.('courierFail');
  emitFullState();const b=sim.breakdown;emit({overlay:{phase:'gameover',mood:state==='won'?'win':death?'shock':'dizzy',title:state==='won'?(custom?'Shift Selesai!':'Misi selesai · Rank '+sim.rank):death?'Tabrakan!':'Target Tidak Tercapai',sub:`Terkirim ${sim.delivered}/${cfg.target} · Skor ${sim.score} · Gagal ${sim.stale}`+(!custom?`\nDasar ${b.base} · Cepat ${b.speed} · Utuh ${b.integrity}\nRute ${b.efficiency} · Combo ${b.combo} · Objektif ${b.objective} · Penalti ${b.penalty||0}`:'')+(result.newBest?'\nRekor baru!':''),btnText:state==='won'&&!custom&&selected!==lastPlayed?'Misi berikutnya':'Main lagi'}});return true;
 }
 function handleEvents(events){
  for(const e of events){
   if(e.type==='pickup'){sounds.playEvent?.('parcel');if(!sounds.playEvent)sounds.playChomp?.();message=`${PACKAGE_KINDS[e.cargo.kind]?.label||'Paket'} ${e.cargo.type} diambil. Antar ke ${(e.cargo.remaining||[e.cargo.type]).join(' → ')}.`;}
   else if(e.type==='deliver'){sounds.playEvent?.(e.perfect?'perfectDelivery':'deliver');if(!sounds.playEvent)sounds.playDeliver?.();message=`${e.site} terkirim! +${e.points}${e.streak>1?' · Combo '+e.streak:''}`;if(e.streak>=3)sounds.playEvent?.('combo');}
   else if(e.type==='drop'){sounds.playEvent?.('deliver');message=`Stop ${e.site} selesai. Sisa ${(e.cargo.remaining||[]).join(' → ')}.`;}
   else if(['stale','cargoFailed','orderExpired'].includes(e.type)){sounds.playEvent?.('courierFail');if(!sounds.playEvent)sounds.playEits?.();message=e.type==='orderExpired'?'Pesanan kedaluwarsa sebelum diambil.':'Paket gagal. Streak direset.';}
   else if(e.type==='cargoDamage'){sounds.playEvent?.('cargoHit');message=`Paket rapuh: kondisi ${e.cargo.integrity}%. Hindari jalur guncangan.`;}
   else if(e.type==='deadline'){sounds.playEvent?.('countdown');message='Deadline dekat! Prioritaskan pesanan yang waktunya paling sedikit.';}
   else if(e.type==='orderSpawn'){sounds.playEvent?.('orderAccepted');message=`Pesanan ${PACKAGE_KINDS[e.order.kind]?.label||'baru'}: tujuan ${(e.order.stops||[e.order.type]).join(' → ')}.`;}
   else if(e.type==='obstacle'){sounds.playEvent?.('obstacle');message=e.kind==='traffic'?'Gerobak panen akan melintas. Tunggu di luar jalurnya.':e.state==='warning'?'Pagar segera menutup. Jalur luar tetap terbuka.':'Pagar ditutup sementara. Pilih jalur lain atau tunggu.';}
   else if(e.type==='pickupBlocked'){sounds.playBump?.();message='Muatan penuh. Antar paket yang dibawa dulu.';}
   else if(e.type==='gateBlocked'){sounds.playEvent?.('obstacle');message='Jalur ditutup sementara. Rem atau ambil rute luar.';}
   else if(e.type==='laneBlocked'){sounds.playBump?.();message='Jalan satu arah. Ikuti panah atau pilih persimpangan lain.';}
   else if(e.type==='impact'){sounds.playEvent?.('cargoHit');message='Terguncang! Kecepatan tertahan sebentar.';}
  }
 }
 function doTick(t){prevSnake=sim.snake.map(p=>({...p}));const turn=resolveDeliveryTurn(sim,queue[0]);if(queue.length&&!turn.pending&&!sim.braking&&t>=sim.delayUntil)queue.shift();const ev=stepSim(sim,KEY_OF[turn.direction.x+','+turn.direction.y],t);handleEvents(ev);if(sim.status==='lost'){endRun('lost',true);return;}if(sim.status==='won'){endRun('won');return;}nextTickAt=lastTick+movementInterval(sim);emitFullState();}
 function stepWorld(){const now=clock.now();let steps=0;while(state==='playing'&&nextTickAt<=now&&nextTickAt<=cfg.shiftMs&&steps<3){lastTick=nextTickAt;doTick(lastTick);steps++;}if(state!=='playing')return;if(nextTickAt<=now-movementInterval(sim)&&nextTickAt<=cfg.shiftMs){lastTick=now;nextTickAt=now+movementInterval(sim);}const ev=[];advanceTime(sim,Math.min(now,cfg.shiftMs),ev);handleEvents(ev);if(now>=cfg.shiftMs){endRun(finishShift(sim));return;}if(ev.length||now-lastHud>=150){emitFullState();lastHud=now;}}
 function loop(){if(destroyed)return;if(state==='playing')stepWorld();drawDelivery(ctx,canvas.width,canvas.height,sim,{prog:isActive()?Math.min(1,(clock.now()-lastTick)/movementInterval(sim)):1,from:prevSnake,t:clock.now(),overview,cssWidth:canvas.getBoundingClientRect?.().width||canvas.width,cssHeight:canvas.getBoundingClientRect?.().height||canvas.height});rafId=raf(loop);}
 reset(true);emit({overlay:MENU_OVERLAY});rafId=raf(loop);
 inspect?.({get sim(){return sim;},get state(){return state;},get simNow(){return clock.now();},get interval(){return movementInterval(sim);},get nextTickAt(){return nextTickAt;},get pauseReasons(){return [...pauseReasons];},get records(){return records;},get selected(){return selected;},setSnake(cells,dirKey){sim.snake=cells.map(([x,y])=>({x,y}));sim.dir={...DIRS[dirKey]};queue=[];prevSnake=sim.snake.map(p=>({...p}));},stepWorld,doTick});
 return {setMode(){},setTaDuration(){},setDirMP(){},startRun,pauseRun,resumeRun,releasePause,togglePause:()=>state==='playing'?pauseRun():resumeRun(),returnToMenu,setDir,
  action(type){if(state!=='playing')return false;if(type==='brake-on'||type==='brake-off'){sim.braking=type==='brake-on';emitFullState();return true;}return false;},
  setCamera(value){overview=value==='toggle'?!overview:value==='overview';emitFullState();},
  setDifficulty(value){if(custom||state!=='menu'||!['normal','hard'].includes(value))return false;if(value===difficulty)return true;if(progressPending&&!persistCheckpoint())return false;difficulty=value;progress=checkpoints.load(difficulty);progressPending=false;selected=0;seed=null;clock.reset();if(!io)saveDeliveryDifficulty(difficulty);reset(true);return true;},
  setLevel(i){if(custom||state!=='menu'||!Number.isInteger(i)||i<0||i>=progress.unlocked)return false;selected=i;reset(true);return true;},
  restartRun(){if([...pauseReasons].some(r=>BLOCKERS.includes(r)))return false;selected=lastPlayed;state='menu';clock.reset();return startRun(true);},
  setSpeedPref(v){if(SPEEDS.includes(v)){speedPref=v;if(!isActive())reset(true);}},
  retrySave(){const a=writer.retry(),b=progressPending?persistCheckpoint():true;emitFullState();return a&&b;},isRunning:isActive,getState:()=>state,
  destroy(){disposeDeliveryRenderer(ctx);destroyed=true;if(rafId)caf(rafId);clock.stop();queue=[];sim.braking=false;},
 };
}
