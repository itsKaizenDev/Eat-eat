import { DT, THEMES, WORLDS } from './world';
import { stepJourney, action, hud, chooseAbility, checkpointCopy } from './sim';
import { freshSave, loadJourney, saveJourney, parseSave, restoreCheckpoint } from './progress';
import { createExpeditionRenderer } from './render';
import { newResultId, createResultWriter, loadRecords, saveRecords, getRecord, recordRun } from '../records';
const MENU={phase:'start',mood:'idle',title:'Ekspedisi Rimba',sub:'Tiga wilayah. Satu perjalanan.',btnText:'Mulai perjalanan'};
const BLOCKERS=['help','hidden','orientation'];
export const EXPEDITION_RECORD_KEY='roguelite|journey:21';
export function createExpeditionGame({canvas,sounds={},onUpdate=()=>{},now=()=>performance.now(),raf,caf,io,journeyIO,inspect}={}){
 const store=journeyIO||{load:loadJourney,save:saveJourney},records=io||{load:loadRecords,save:saveRecords},writer=createResultWriter(records,!io),renderer=createExpeditionRenderer(canvas);
 const request=raf||(typeof requestAnimationFrame==='function'?requestAnimationFrame:null),cancel=caf||(typeof cancelAnimationFrame==='function'?cancelAnimationFrame:()=>{});
 let recordCache=records.load();
 let saved;try{saved=store.load();}catch{}let envelope=parseSave(JSON.stringify(saved))||freshSave(),hasSave=!!parseSave(JSON.stringify(saved));
 let world=envelope.current,state='menu',destroyed=false,rafId=null,lastAt=0,accumulator=0,lastHud=-1,lastSave=0,pending=false,recorded=false;
 const held=new Map(),reasons=new Set();
 const active=()=>state==='playing'||state==='paused';
 const emit=p=>{if(!destroyed)onUpdate(p);};
 const input=()=>{const pad=held.get('pad');if(pad)return pad;let x=0,y=0;for(const d of held.values()){x+=d.x;y+=d.y;}return {x,y};};
 function clearInput(){held.clear();}
 function stop(){if(rafId!==null)cancel(rafId);rafId=null;accumulator=0;}
 function persist(){envelope.current=world;try{pending=store.save(envelope)===false;}catch{pending=true;}if(!pending)hasSave=true;lastSave=world.time;return !pending;}
 function refresh(){
  const view=renderer.view(),h={...hud(world),...view,choosingUpgrade:state==='choosingUpgrade',deaths:envelope.deaths,savePending:pending},rec=getRecord(recordCache,EXPEDITION_RECORD_KEY);
  emit({mode:'roguelite',modeLabel:'K-Snake · Ekspedisi Rimba',running:active(),paused:state==='paused',score:world.score,best:rec.best,effects:[],mpHud:null,timerText:null,
   roguelite:h,rogueMenu:{expedition:true,hasSave,completed:world.status==='won',region:world.region,regionName:THEMES[world.region].name,defeated:world.defeated.length,deaths:envelope.deaths,best:rec.best,checkpoint:world.checkpoint,savePending:pending},
   puzzle:null,puzzleMenu:null,delivery:null,deliveryMenu:null,boss:null,bossMenu:null,territory:null,territoryMenu:null,recordSave:{pending:pending||writer.pending}});
 }
 function events(){
  const queue=world.events.splice(0);
  if(queue.includes('checkpoint')){const checkpoint=checkpointCopy(world);if(checkpoint)envelope.checkpoint=checkpoint;persist();}
  for(const e of queue){if(e==='checkpoint')sounds.playEvent?.('artifact');else if(e==='pickup')sounds.playChomp?.();else if(e==='death')sounds.playDeath?.();else if(e==='win')sounds.playWin?.();else sounds.playEvent?.(e);}
 }
 function schedule(){if(!destroyed&&state==='playing'&&request&&rafId===null)rafId=request(frame);}
 function outcome(){
  if(world.status==='dead'){
   state='lost';clearInput();stop();persist();refresh();emit({overlay:{phase:'gameover',mood:'shock',title:'Perjalanan terhenti',sub:'Kembali ke checkpoint terakhir. Bekal dan dunia kembali ke keadaan tersimpan.',btnText:'Kembali ke checkpoint'}});return;
  }
  if(world.status==='won'){
   state='won';clearInput();stop();
   if(!recorded){const event={id:envelope.runId,type:'roguelite',key:EXPEDITION_RECORD_KEY,result:{score:world.score,rounds:3,won:true}},result=recordRun(records.load(),event.key,event.result);writer.write(event,result.records);recordCache=result.records;recorded=true;}
   persist();refresh();emit({overlay:{phase:'gameover',mood:'win',title:'Tiga wilayah kembali tenang',sub:`Enam miniboss dan tiga boss ditaklukkan · ${world.score} skor · ${envelope.deaths} kali kembali ke checkpoint`,btnText:'Perjalanan baru'}});return;
  }
  if(world.offer.length){state='choosingUpgrade';clearInput();stop();persist();refresh();}
 }
 function frame(at){
  rafId=null;if(destroyed||state!=='playing')return;
  accumulator+=Math.max(0,Math.min(.2,(at-lastAt)/1000));lastAt=at;
  while(accumulator+1e-9>=DT&&state==='playing'){
   stepJourney(world,input(),DT);accumulator=Math.max(0,accumulator-DT);events();outcome();
  }
  if(state==='playing'&&world.time-lastSave>=3)persist();
  renderer.draw(world);if(at-lastHud>=100){refresh();lastHud=at;}schedule();
 }
 function begin(){state=world.offer.length?'choosingUpgrade':'playing';clearInput();reasons.clear();lastAt=now();accumulator=0;lastHud=-1;emit({overlay:{phase:'none'}});refresh();renderer.draw(world);schedule();return true;}
 function startRun(){
  if(destroyed||active()||state==='choosingUpgrade')return false;
  if(state==='lost'||world.status==='dead'){envelope=restoreCheckpoint(envelope);world=envelope.current;persist();}
  else if(world.status==='won'){envelope=freshSave();world=envelope.current;recorded=false;persist();}
  else if(!hasSave)persist();
  return begin();
 }
 function pauseRun(reason='user'){
  if(!active())return false;reasons.add(reason);clearInput();stop();state='paused';persist();refresh();emit({overlay:{phase:'pause',mood:'idle',title:'Singgah sejenak',sub:'Dunia, trap, dan musuh ikut berhenti.',btnText:'Lanjut main'}});return true;
 }
 function resumeRun(){if(state!=='paused'||[...reasons].some(r=>BLOCKERS.includes(r)))return false;reasons.clear();return begin();}
 function returnToMenu(){if(destroyed)return false;clearInput();stop();if(state!=='menu')persist();state='menu';reasons.clear();refresh();renderer.draw(world);emit({overlay:MENU});return true;}
 const api={
  setMode(){},setSpeedPref(){},setTaDuration(){},setDirMP(){},startRun,pauseRun,resumeRun,returnToMenu,
  releasePause:reason=>reasons.delete(reason),togglePause:()=>state==='playing'?pauseRun():resumeRun(),
  setDir(x,y,meta={}){if(state==='playing'&&Number.isFinite(x)&&Number.isFinite(y))held.set(meta.source||'pad',{x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))});},
  cancelHeldInput:source=>held.delete(source||'pad'),clearInput,
  action(type){if(state!=='playing')return false;const ok=action(world,type);events();outcome();if(ok&&state==='playing')persist();refresh();renderer.draw(world);return ok;},
  chooseUpgrade(id){if(state!=='choosingUpgrade'||!chooseAbility(world,id))return false;events();persist();begin();return true;},
  restartRun(){if(destroyed||[...reasons].some(r=>BLOCKERS.includes(r)))return false;clearInput();stop();envelope=freshSave();world=envelope.current;recorded=false;persist();return begin();},
  retrySave(){const a=persist(),b=writer.retry();refresh();return a&&b;},
  setCamera(value){renderer.setView(value);renderer.draw(world);refresh();},resize(){renderer.invalidate();renderer.draw(world);},
  isRunning:active,getState:()=>state,
  destroy(){if(destroyed)return;if(state!=='menu')persist();destroyed=true;clearInput();stop();renderer.destroy();},
 };
 inspect?.({get world(){return world;},get envelope(){return envelope;},get state(){return state;},get input(){return input();},frame});
 refresh();renderer.draw(world);emit({overlay:MENU});return api;
}
