import { fits, moveBody, lineOfSight, distance } from '../puzzle/geometry';
import { WORLDS, THEMES, WORLD_REVISION, DT, bindGeometry, availableCamp, cleared, trapStage, encounterById, objective } from './world';
import { ABILITIES, makeEnemies, beginEncounter, combatStep, bite, hitEnemy, vulnerable } from './combat';
export const MAX_HP=100;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function resetTail(s){
 const p=s.player,geo=bindGeometry(s);s.trail=[{x:p.x,y:p.y}];
 for(let i=1;i<=12;i++){const q={x:p.x-Math.cos(p.angle)*i*.18,y:p.y-Math.sin(p.angle)*i*.18};if(!fits(geo,q.x,q.y,.22))break;s.trail.push(q);}
 s.tail=Array.from({length:7},(_,i)=>({...s.trail[Math.min(s.trail.length-1,i*2)]}));
}
export function createJourney(){
 const p=WORLDS[0].start;
 const s={version:21,combatRevision:2,worldRevision:WORLD_REVISION,region:0,time:0,status:'playing',player:{...p,angle:-Math.PI/2,hp:MAX_HP,maxHp:MAX_HP,shield:1,invulnUntil:0,dashUntil:0,dashAt:0,skillAt:0,biteAt:0,biteUntil:0,poisonUntil:0,poisonAt:0},
 inventory:{food:2,antidote:1,coins:0},upgrades:Object.fromEntries(ABILITIES.map(a=>[a.id,0])),defeated:[],looted:[],levers:[],visited:[0],camps:[],checkpoint:'root-entry',
 enemies:makeEnemies(),active:null,hazards:[],pods:[],offer:[],rewardId:null,events:[],score:0,message:'Selamat datang di Hutan Akar. Dekati api singgah, lalu pilih Interaksi.',messageUntil:8,footDistance:0};
 resetTail(s);return s;
}
export function hurt(s,damage,cause){
 const p=s.player;if(s.status!=='playing'||p.invulnUntil>s.time||p.dashUntil>s.time)return false;
 if(p.shield>0){p.shield--;s.events.push('shieldGain');}else{p.hp=Math.max(0,p.hp-damage);s.events.push('hurt');
  if(s.upgrades.thorns)for(const e of s.enemies)if(e.region===s.region&&distance(e,p)<2&&e.stage!=='dead'&&(e.kind==='mob'||e.id===s.active))hitEnemy(s,e,s.upgrades.thorns*6,true);
 }
 p.invulnUntil=s.time+1.1;
 if(cause==='poison')p.poisonUntil=s.time+4;
 s.message=cause==='trap'?'Terkena jebakan. Tunggu hingga seluruh tubuh bisa lewat.':'Terluka. Jaga jarak dan gunakan bekal.';s.messageUntil=s.time+3;
 if(p.hp<=0){s.status='dead';s.offer=[];s.events.push('death');}
 return true;
}
function followTail(s,before){
 const p=s.player,moved=distance(before,p);
 if(moved>.00001){s.trail.unshift({x:p.x,y:p.y});s.footDistance+=moved;}
 let length=0;const cumulative=[0];
 for(let i=1;i<s.trail.length;i++){length+=distance(s.trail[i-1],s.trail[i]);cumulative.push(length);if(length>3.1){s.trail.length=i+1;break;}}
 s.tail=[{x:p.x,y:p.y}];
 for(let j=1;j<7;j++){
  const d=j*.36;let i=cumulative.findIndex(v=>v>=d);
  if(i<1)s.tail.push({...s.trail.at(-1)});
  else{const a=s.trail[i-1],b=s.trail[i],part=(d-cumulative[i-1])/Math.max(.00001,cumulative[i]-cumulative[i-1]);s.tail.push({x:a.x+(b.x-a.x)*part,y:a.y+(b.y-a.y)*part});}
 }
 // Bound samples even when a joystick sends very tiny displacements.
 if(s.trail.length>600)s.trail=s.trail.filter((_,i)=>i%2===0||i===s.trail.length-1);
 if(s.footDistance>=.9){s.events.push('footstep');s.footDistance=0;}
}
export function nearby(s){
 const w=WORLDS[s.region],p=s.player,objects=[];
 if(s.active||s.offer.length||s.status!=='playing')return null;
 for(const c of w.camps)if(availableCamp(s,c))objects.push({...c,type:'camp',label:'Singgah · '+c.name});
 for(const l of w.loot)if(!s.looted.includes(l.id)&&(!l.requires||s.levers.includes(l.requires)))objects.push({...l,type:'loot',label:l.kind==='relic'?'Ambil relik jalur rahasia':'Ambil bekal'});
 if(!s.levers.includes(w.lever.id))objects.push({...w.lever,type:'lever',label:'Aktifkan mekanisme peti rahasia'});
 for(const e of w.encounters)if(!cleared(s,e.id))objects.push({...e.shrine,id:e.id,type:'encounter',label:'Hadapi '+e.name});
 if(cleared(s,w.encounters[2].id))objects.push({...w.exit,type:'next',label:s.region<2?'Masuk '+THEMES[s.region+1].name:'Tuntaskan ekspedisi'});
 if(s.region>0)objects.push({...w.back,type:'back',label:'Kembali ke '+THEMES[s.region-1].name});
 const geo=bindGeometry(s);
 return objects.filter(o=>distance(o,p)<1.4&&lineOfSight(geo,p,o)).sort((a,b)=>distance(a,p)-distance(b,p))[0]||null;
}
export function activateCamp(s,camp){
 if(s.active||!availableCamp(s,camp))return false;
 s.player.hp=Math.max(s.player.hp,Math.ceil(s.player.maxHp*.5));s.player.poisonUntil=0;
 s.checkpoint=camp.id;if(!s.camps.includes(camp.id))s.camps.push(camp.id);
 s.message='Checkpoint '+camp.name+'. HP minimum 50%; bekal tetap terbatas.';s.messageUntil=s.time+5;s.events.push('checkpoint','heal');return true;
}
export function checkpointCopy(s,id=s.checkpoint){
 const copy=cloneJourney(s),camp=WORLDS.flatMap(w=>w.camps).find(c=>c.id===id);
 if(!camp||!availableCamp(copy,camp))return null;
 copy.region=WORLDS.findIndex(w=>w.camps.includes(camp));
 copy.player.x=camp.x;copy.player.y=camp.y;copy.player.angle=-Math.PI/2;copy.player.invulnUntil=copy.time+1.5;copy.player.poisonUntil=0;
 copy.active=null;copy.offer=[];copy.rewardId=null;copy.hazards=[];copy.pods=[];copy.status='playing';copy.events=[];resetTail(copy);return copy;
}
export function interact(s){
 const o=nearby(s);if(!o)return false;
 if(o.type==='camp')return activateCamp(s,o);
 if(o.type==='loot'){
  s.looted.push(o.id);s.score+=o.kind==='relic'?30:10;s.inventory.coins+=o.kind==='relic'?15:5;
  if(o.kind==='herb')s.inventory.antidote=Math.min(9,s.inventory.antidote+1);else s.inventory.food=Math.min(9,s.inventory.food+(o.kind==='cache'?2:1));
  s.message=o.kind==='relic'?'Relik rahasia ditemukan. Bekal bertambah.':'Bekal masuk tas. Gunakan Bekal untuk makan dan Penawar untuk racun.';s.messageUntil=s.time+4;s.events.push('pickup');return true;
 }
 if(o.type==='lever'){s.levers.push(o.id);s.message='Mekanisme aktif. Peti rahasia sekarang bisa dibuka.';s.messageUntil=s.time+4;s.events.push('door');return true;}
 if(o.type==='encounter'){
  const e=s.enemies.find(e=>e.id===o.id),w=WORLDS[s.region];
  if(e.kind==='boss'&&!w.encounters.slice(0,2).every(e=>cleared(s,e.id)))return false;
  return beginEncounter(s,e);
 }
 if(o.type==='next'||o.type==='back'){
  if(o.type==='next'&&s.region===2){s.status='won';s.message='Tiga wilayah bebas. Ekspedisi tuntas!';s.events.push('win');return true;}
  // Attacks belong to the map being left; never carry their telegraphs into a new save.
  s.hazards=[];s.pods=[];
  for(const e of s.enemies)if(e.region===s.region&&e.kind==='mob'&&e.stage!=='dead'){e.stage='idle';e.until=0;e.next=s.time+.5;}
  s.region+=o.type==='next'?1:-1;
  if(!s.visited.includes(s.region))s.visited.push(s.region);
  const q=o.type==='next'?WORLDS[s.region].start:WORLDS[s.region].exit;s.player.x=q.x;s.player.y=q.y;s.player.invulnUntil=s.time+2;resetTail(s);
  if(o.type==='next'){s.player.hp=Math.max(s.player.hp,65);s.checkpoint=WORLDS[s.region].camps[0].id;s.events.push('checkpoint');}
  s.message=THEMES[s.region].name+' · '+objective(s);s.messageUntil=s.time+6;s.events.push('portal');return true;
 }
 return false;
}
export function chooseAbility(s,id){
 if(!s.offer.includes(id)||s.status!=='playing')return false;
 const item=ABILITIES.find(a=>a.id===id);if(!item||s.upgrades[id]>=item.max)return false;
 s.upgrades[id]++;if(id==='guard')s.player.shield=Math.min(4,s.player.shield+1);
 const reward=encounterById(s.rewardId);
 s.offer=[];s.rewardId=null;
 if(reward){const camp=WORLDS[s.region].camps[reward.index===0?1:reward.index===1?2:3];activateCamp(s,camp);}
 s.message=item.name+' diperoleh. '+objective(s);s.messageUntil=s.time+5;s.events.push('checkpoint');return true;
}
export function action(s,type){
 if(s.status!=='playing'||s.offer.length)return false;
 const p=s.player;
 if(type==='interact')return interact(s);
 if(type==='food'){
  if(!s.inventory.food||p.hp>=p.maxHp)return false;s.inventory.food--;p.hp=Math.min(p.maxHp,p.hp+30+s.upgrades.herbal*8);s.events.push('heal');return true;
 }
 if(type==='antidote'){
  if(!s.inventory.antidote||p.poisonUntil<=s.time)return false;s.inventory.antidote--;p.poisonUntil=0;s.events.push('heal');return true;
 }
 if(type==='dash'){
  if(s.time<p.dashAt)return false;p.dashAt=s.time+3;p.dashUntil=s.time+.22;s.events.push('evade');return true;
 }
 if(type==='skill'){
  if(s.time<p.skillAt)return false;p.skillAt=s.time+8;s.skillFxUntil=s.time+.5;s.events.push('smoke');
  const geo=bindGeometry(s);
  for(const node of s.pods)if(node.hp>0&&distance(node,p)<3&&lineOfSight(geo,p,node)){node.hp=Math.max(0,node.hp-18-s.upgrades.venom*8);node.hitUntil=s.time+.2;}
  for(const e of s.enemies)if(e.region===s.region&&distance(e,p)<3&&lineOfSight(geo,p,e)&&(e.kind==='mob'?!s.active:e.id===s.active)&&vulnerable(s,e)){
   hitEnemy(s,e,18+s.upgrades.venom*8);if(!['transition','dead'].includes(e.stage)){e.poisonUntil=s.time+3;e.poisonNext=s.time+.5;}
  }
  return true;
 }
 return false;
}
export function stepJourney(s,input={},dt=DT){
 if(s.status!=='playing'||s.offer.length)return;
 dt=clamp(dt,0,.05);s.time+=dt;const p=s.player,before={x:p.x,y:p.y};
 let x=Number.isFinite(input.x)?input.x:0,y=Number.isFinite(input.y)?input.y:0,n=Math.hypot(x,y);
 if(n>1){x/=n;y/=n;n=1;}
 if(n>.02)p.angle=Math.atan2(y,x);
 if(p.dashUntil>s.time){x=Math.cos(p.angle);y=Math.sin(p.angle);n=1;}
 let speed=p.dashUntil>s.time?7:3;
 if(s.region===1&&p.y>27&&p.x>22)speed*=.78;
 if(n>.02)moveBody(bindGeometry(s),p,x*speed*dt,y*speed*dt,.24);
 followTail(s,before);
 const w=WORLDS[s.region];
 for(const trap of w.traps){
  const stage=trapStage(trap,s.time);
  const previous=trapStage(trap,s.time-dt),audible=trap.tiles.some(q=>Math.hypot(q.x+.5-p.x,q.y+.5-p.y)<9);if(audible&&stage==='warning'&&previous!==stage)s.events.push('windup');if(audible&&stage==='active'&&previous!==stage)s.events.push('trap');
  if(stage==='active'&&s.tail.some(p=>trap.tiles.some(t=>p.x+.22>t.x&&p.x-.22<t.x+1&&p.y+.22>t.y&&p.y-.22<t.y+1)))hurt(s,trap.damage,'trap');
 }
 if(p.poisonUntil>s.time&&s.time>=p.poisonAt){p.poisonAt=s.time+1;hurt(s,3,'status');}
 combatStep(s,dt,hurt);if(s.status==='playing'&&!s.offer.length)bite(s);
 if(s.time>s.messageUntil)s.message='';
 s.pods=s.pods.filter(p=>p.hp>0);if(s.hazards.length>60)s.hazards=s.hazards.slice(-60);
}
export function cloneJourney(s){return JSON.parse(JSON.stringify(s));}
export function hud(s){
 const e=s.active&&s.enemies.find(e=>e.id===s.active),o=nearby(s),w=WORLDS[s.region];
 return {expedition:true,revision:21,region:s.region,regionName:THEMES[s.region].name,hp:Math.ceil(s.player.hp),maxHp:s.player.maxHp,shield:s.player.shield,
 food:s.inventory.food,antidote:s.inventory.antidote,coins:s.inventory.coins,poison:s.player.poisonUntil>s.time,objective:objective(s),message:s.message,
 interaction:o?.label||'',dashWait:Math.max(0,s.player.dashAt-s.time),skillWait:Math.max(0,s.player.skillAt-s.time),
 miniCount:w.encounters.slice(0,2).filter(e=>cleared(s,e.id)).length,totalMinis:s.defeated.filter(id=>encounterById(id)?.kind==='mini').length,totalBosses:s.defeated.filter(id=>encounterById(id)?.kind==='boss').length,
 encounter:e?{id:e.id,name:e.name,kind:e.kind,type:e.type,phase:e.phase,hp:Math.ceil(e.hp),maxHp:e.maxHp,stage:e.stage,airborne:e.pattern==='leap'&&e.stage==='active'&&!e.landed,vulnerable:vulnerable(s,e),nodes:s.pods.filter(p=>p.owner===e.id&&p.hp>0).length}:null,
 offer:s.offer.map(id=>{const a=ABILITIES.find(a=>a.id===id);return {...a,stacks:s.upgrades[id]};}),cleared:{round:s.defeated.length,title:'Bekal perjalanan',roundScore:0,total:s.score},
 upgrades:ABILITIES.filter(a=>s.upgrades[a.id]).map(a=>({...a,stacks:s.upgrades[a.id]})),time:s.time,checkpoint:s.checkpoint,
 // Legacy summary keys keep the details contract explicit during the migration.
 round:s.region+1,rounds:3,total:s.score,roundScore:s.defeated.length,target:9,neutral:s.inventory.antidote,effects:[]};
}
