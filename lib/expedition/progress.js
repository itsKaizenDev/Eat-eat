import { createJourney, cloneJourney, checkpointCopy } from './sim';
import { WORLDS, WORLD_REVISION, bindGeometry } from './world';
import { ABILITIES, migrateEnemyCombat } from './combat';
import { fits } from '../puzzle/geometry';
import { newResultId } from '../records';
export const SAVE_KEY='snake-expedition-journey-v21';
const MAX_SAVE=250000;
const point=p=>!!p&&[p.x,p.y].every(Number.isFinite);
const finiteTree=(v,depth=0)=>depth<30&&(typeof v==='number'?Number.isFinite(v):!v||typeof v!=='object'||Object.values(v).every(x=>finiteTree(x,depth+1)));
export function validJourney(s){
 if(s?.combatRevision!==undefined&&s.combatRevision!==2)return false;
 if(!s||s.version!==21||s.worldRevision!==WORLD_REVISION||!Number.isInteger(s.region)||s.region<0||s.region>2||!finiteTree(s))return false;
 const p=s.player;if(!p||p.maxHp!==100||p.hp<0||p.hp>100||p.shield<0||p.shield>4||![p.x,p.y,p.angle,p.hp,p.shield,p.invulnUntil,p.dashUntil,p.dashAt,p.skillAt,p.biteAt,p.poisonUntil,p.poisonAt,s.time,s.score].every(Number.isFinite)||s.time<0)return false;
 if(!['playing','dead','won'].includes(s.status)||!s.inventory||!['food','antidote','coins'].every(k=>Number.isInteger(s.inventory[k])&&s.inventory[k]>=0&&s.inventory[k]<(k==='coins'?100000:10)))return false;
 const ids=WORLDS.flatMap(w=>w.encounters.map(e=>e.id));
 if(!Array.isArray(s.defeated)||new Set(s.defeated).size!==s.defeated.length||s.defeated.some(id=>!ids.includes(id)))return false;
 if(s.region>0&&!s.defeated.includes(WORLDS[s.region-1].encounters[2].id))return false;
 if(!s.upgrades||!ABILITIES.every(a=>Number.isInteger(s.upgrades[a.id])&&s.upgrades[a.id]>=0&&s.upgrades[a.id]<=a.max))return false;
 if(!Number.isInteger(s.score)||s.score<0||s.score>999999)return false;
 if(!Array.isArray(s.offer)||s.offer.length>3||new Set(s.offer).size!==s.offer.length||s.offer.some(id=>!ABILITIES.some(a=>a.id===id&&s.upgrades[id]<a.max)))return false;
 if(!Array.isArray(s.enemies)||s.enemies.length!==18||new Set(s.enemies.map(e=>e.id)).size!==18)return false;
 const canonical=createJourney().enemies;
 for(const e of s.enemies){const base=canonical.find(b=>b.id===e.id);if(!base||JSON.stringify(e.phaseHp)!==JSON.stringify(base.phaseHp)||JSON.stringify(e.arena)!==JSON.stringify(base.arena)||e.region!==base.region||e.kind!==base.kind||e.type!==base.type||!Number.isInteger(e.phase)||e.phase<1||e.phase>(e.kind==='boss'?3:1)||e.hp<0||e.hp>base.phaseHp[e.phase-1]||e.maxHp!==base.phaseHp[e.phase-1])return false;
  if(![e.x,e.y,e.hp,e.until,e.next,e.cycle,e.facing,e.poisonUntil,e.poisonNext].every(Number.isFinite)||!Number.isInteger(e.cycle)||e.cycle<0)return false;
  if(e.kind==='mob'&&(JSON.stringify(e.anchor)!==JSON.stringify(base.anchor)||e.path&&(!Array.isArray(e.path)||e.path.length>2000||e.path.some(p=>!point(p)))))return false;
  if(e.kind!=='mob'&&['windup','active'].includes(e.stage)&&(!point(e.mark)||!['charge','tongue','leap','slash','ring','pools','rows'].includes(e.pattern)))return false;
  if(e.kind!=='mob'&&e.stage==='active'&&e.pattern==='charge'&&!point(e.chargeDir))return false;
  if(s.combatRevision===2&&e.stage==='active'&&e.pattern==='leap'&&(![e.leapAt,e.leapUntil].every(Number.isFinite)||typeof e.landed!=='boolean'))return false;
  if(!['idle','recover','windup','active','transition','dead','dormant'].includes(e.stage)||!fits({level:{...WORLDS[e.region],doors:[]},opened:new Set()},e.x,e.y,.2))return false;
 }
 for(const [key,limit]of [['looted',30],['levers',3],['camps',12],['visited',3],['hazards',60],['pods',30],['tail',7],['trail',600],['events',100]])if(!Array.isArray(s[key])||s[key].length>limit)return false;
 const lists={looted:WORLDS.flatMap(w=>w.loot.map(o=>o.id)),levers:WORLDS.map(w=>w.lever.id),camps:WORLDS.flatMap(w=>w.camps.map(c=>c.id)),visited:[0,1,2]};
 for(const [key,allowed]of Object.entries(lists))if(new Set(s[key]).size!==s[key].length||s[key].some(id=>!allowed.includes(id)))return false;
 for(const id of s.defeated)if(s.enemies.find(e=>e.id===id)?.stage!=='dead')return false;
 for(const e of s.enemies)if(e.kind!=='mob'&&e.stage==='dead'&&!s.defeated.includes(e.id))return false;
 for(const w of WORLDS)if(s.defeated.includes(w.encounters[2].id)&&!w.encounters.slice(0,2).every(e=>s.defeated.includes(e.id)))return false;
 const bounds=WORLDS[s.region];for(const points of [s.tail,s.trail])if(!points.length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>=bounds.width||p.y>=bounds.height))return false;
 for(const h of s.hazards)if(!ids.concat(canonical.map(e=>e.id)).includes(h.owner)||!['line','circle','ring','rect'].includes(h.shape)||!Number.isFinite(h.start)||!Number.isFinite(h.end)||h.end<h.start||!Number.isFinite(h.damage)||h.damage<0)return false;
 for(const h of s.hazards){if(h.shape==='line'){if(!h.from||!h.to||![h.from.x,h.from.y,h.to.x,h.to.y,h.radius].every(Number.isFinite))return false;}else if(![h.x,h.y,h.shape==='rect'?h.w:h.radius,h.shape==='rect'?h.h:0].every(Number.isFinite))return false;}
 for(const h of s.hazards)if(h.region!==s.region||h.shape==='ring'&&!Number.isFinite(h.width))return false;
 for(const pod of s.pods)if(!ids.includes(pod.owner)||pod.region!==s.region||!point(pod)||![pod.hp,pod.hitUntil].every(Number.isFinite)||pod.hp<0||pod.hp>20)return false;
 for(const h of s.hazards)if(h.motion!==undefined&&!['charge','leap'].includes(h.motion))return false;
 if(!WORLDS.some(w=>w.camps.some(c=>c.id===s.checkpoint))||s.active&&!ids.includes(s.active))return false;
 if(s.active){const active=s.enemies.find(e=>e.id===s.active);if(active.region!==s.region||['dead','dormant'].includes(active.stage))return false;}
 if(s.offer.length&&(!s.defeated.includes(s.rewardId)||s.active))return false;
 if(!fits(bindGeometry(s),p.x,p.y,.23))return false;
 return true;
}
export function parseSave(raw){
 if(typeof raw!=='string'||raw.length>MAX_SAVE)return null;
 try{const v=JSON.parse(raw);if(v.version!==21||!validJourney(v.current)||!validJourney(v.checkpoint)||v.checkpoint.active||v.checkpoint.offer.length||v.checkpoint.status!=='playing')return null;
  if(!Number.isInteger(v.deaths)||v.deaths<0||v.deaths>100000)return null;if(typeof v.runId!=='string'||v.runId.length<1||v.runId.length>100)return null;migrateEnemyCombat(v.current);migrateEnemyCombat(v.checkpoint);if(!validJourney(v.current)||!validJourney(v.checkpoint))return null;return {version:21,runId:v.runId,current:v.current,checkpoint:v.checkpoint,deaths:v.deaths};
 }catch{return null;}
}
export function freshSave(){const current=createJourney();return {version:21,runId:newResultId(),current,checkpoint:checkpointCopy(current),deaths:0};}
export function loadJourney(){try{return parseSave(localStorage.getItem(SAVE_KEY));}catch{return null;}}
export function saveJourney(save){try{const raw=JSON.stringify(save);if(raw.length>MAX_SAVE||!parseSave(raw))return false;localStorage.setItem(SAVE_KEY,raw);return true;}catch{return false;}}
export function restoreCheckpoint(save){const current=cloneJourney(save.checkpoint);current.events=[];current.message='Kembali ke checkpoint. Dunia dan bekal kembali ke keadaan tersimpan.';current.messageUntil=current.time+6;return {...save,current,deaths:save.deaths+1};}
