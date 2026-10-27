import { fits, lineOfSight, distance, rayDistance } from '../puzzle/geometry';
import { WORLDS, THEMES, encounterById, bindGeometry, availableCamp } from './world';
import { navigateMob } from './navigation';
export const ABILITIES=[
 {id:'fang',name:'Taring Tajam',icon:'bolt',benefit:'Gigitan +4 damage per tingkat.',cost:'Gigitan tetap membutuhkan jarak dekat.',max:3},
 {id:'venom',name:'Bisa Rimba',icon:'flask',benefit:'Semburan +8 damage dan racun lebih kuat.',cost:'Skill tetap pulih selama 8 detik.',max:3},
 {id:'guard',name:'Sisik Pelindung',icon:'shield',benefit:'Tambah satu lapis pelindung dan isi satu lapis.',cost:'Satu lapis habis untuk menahan satu serangan.',max:3},
 {id:'herbal',name:'Bekal Herbal',icon:'leaf',benefit:'Makanan memulihkan +8 HP per tingkat.',cost:'Persediaan makanan tetap terbatas.',max:3},
 {id:'thorns',name:'Duri Penjaga',icon:'hammer',benefit:'Setelah terluka, balas musuh dekat dengan duri.',cost:'Tetap kehilangan HP ketika perlindungan habis.',max:3},
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function moveAttack(geo,e,dx,dy,r){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.08));
 for(let i=0;i<steps;i++){if(!fits(geo,e.x+dx/steps,e.y+dy/steps,r))break;e.x+=dx/steps;e.y+=dy/steps;}
}
export const enemyMax=e=>e.kind==='boss'?e.phaseHp[e.phase-1]:e.phaseHp[0];
export function makeEnemies(){return WORLDS.flatMap(w=>[
 ...w.encounters.map(a=>({...a,phaseHp:a.kind==='boss'?a.hp:[a.hp[a.index]],hp:a.kind==='boss'?a.hp[0]:a.hp[a.index],maxHp:a.kind==='boss'?a.hp[0]:a.hp[a.index],phase:1,stage:'dormant',until:0,next:0,cycle:0,facing:0,hitUntil:0,poisonUntil:0,poisonNext:0})),
 ...w.mobs.map(a=>({...a,name:a.type==='spitter'?'Pelontar Spora':'Perayap',region:w.region,kind:'mob',phaseHp:[a.hp],maxHp:a.hp,phase:1,stage:'idle',until:0,next:0,cycle:0,facing:0,anchor:{x:a.x,y:a.y},poisonUntil:0,poisonNext:0}))]);}
export function offerAbilities(s){
 const pool=ABILITIES.filter(a=>(s.upgrades[a.id]||0)<a.max),shift=s.defeated.length%Math.max(1,pool.length);
 return [...pool.slice(shift),...pool.slice(0,shift)].slice(0,3).map(a=>a.id);
}
function clearAttack(s,e){s.hazards=s.hazards.filter(h=>h.owner!==e.id);s.pods=s.pods.filter(p=>p.owner!==e.id);}
export function defeat(s,e){
 if(e.stage==='dead')return;
 e.hp=0;e.stage='dead';clearAttack(s,e);
 if(e.kind==='mob'){s.score+=5;s.events.push('pickup');return;}
 s.defeated.push(e.id);s.score+=e.kind==='boss'?150:60;s.inventory.coins+=e.kind==='boss'?40:20;
 s.inventory.food=Math.min(9,s.inventory.food+1);s.active=null;s.offer=offerAbilities(s);s.rewardId=e.id;
 s.player.hp=Math.min(s.player.maxHp,s.player.hp+(e.kind==='boss'?30:8));
 s.message=e.name+' tumbang. Pilih bekal baru.';s.events.push('bossdown','artifact');
}
export function vulnerable(s,e){
 if(e.stage==='dead'||e.stage==='dormant'||e.stage==='transition')return false;
 if(s.pods.some(p=>p.owner===e.id&&p.hp>0))return false;
 if(e.kind==='mob')return true;
 if(e.type==='centipede'&&e.stage!=='recover')return Math.cos(Math.atan2(s.player.y-e.y,s.player.x-e.x)-e.facing)<-.15;
 return e.stage==='recover';
}
export function hitEnemy(s,e,damage,force=false){
 if(s.pods.some(p=>p.owner===e.id&&p.hp>0))return false;
 if(!force&&!vulnerable(s,e))return false;
 if(['dead','transition','dormant'].includes(e.stage))return false;
 e.hp=Math.max(0,e.hp-damage);e.hitUntil=s.time+.14;s.events.push('bosshit');
 if(e.hp>0)return true;
 if(e.kind==='boss'&&e.phase<3){
  e.phase++;e.maxHp=enemyMax(e);e.stage='transition';e.until=s.time+1.6;e.poisonUntil=0;clearAttack(s,e);
  s.message='FASE '+e.phase+' · '+e.name+' berubah wujud!';s.events.push('phase');
 }else defeat(s,e);
 return true;
}
function pods(s,e){
 const a=e.arena;
 for(const [i,q]of [[a.x+3,a.y+3],[a.x+a.w-3,a.y+a.h-3]].entries()){
  const p={id:e.id+'-node-'+e.phase+'-'+i,owner:e.id,region:s.region,x:q[0]+.5,y:q[1]+.5,hp:20,hitUntil:0};
  if(fits(bindGeometry(s),p.x,p.y,.3))s.pods.push(p);
 }
}
export function beginEncounter(s,e){
 if(s.active||e.stage==='dead'||s.defeated.includes(e.id)||e.region!==s.region)return false;
 for(const mob of s.enemies)if(mob.kind==='mob'&&mob.region===s.region&&mob.stage!=='dead'){clearAttack(s,mob);mob.stage='idle';mob.next=s.time+.5;mob.path=[];}
 s.active=e.id;e.stage='recover';e.until=s.time+2;e.cycle=0;e.facing=Math.atan2(s.player.y-e.y,s.player.x-e.x);
 s.player.invulnUntil=Math.max(s.player.invulnUntil,s.time+.5);
 if(['fungus','cocoon'].includes(e.type))pods(s,e);
 s.message=e.name+' · '+(['fungus','cocoon'].includes(e.type)?'Hancurkan dua simpul pelindung.':'Baca tanda, hindari, lalu gigit saat celah terbuka.');s.events.push('round');return true;
}
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=clamp(l?((p.x-a.x)*dx+(p.y-a.y)*dy)/l:0,0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
export function hazardContains(h,p,r=.22){
 if(h.shape==='line')return segmentDistance(p,h.from,h.to)<h.radius+r;
 if(h.shape==='rect')return p.x+r>h.x&&p.x-r<h.x+h.w&&p.y+r>h.y&&p.y-r<h.y+h.h;
 if(h.shape==='ring')return Math.abs(distance(p,h)-h.radius)<h.width+r;
 return distance(p,h)<h.radius+r;
}
function hazard(s,e,data,warning=1.25,duration=.45){
 s.hazards.push({...data,id:e.id+'-'+e.cycle+'-'+s.hazards.length,owner:e.id,region:s.region,start:s.time+warning,end:s.time+warning+duration,poison:['spore','fungus','frog'].includes(e.type),damage:e.kind==='mob'?8:10+(e.phase-1)*2+s.region*2});
}
function safeMark(s,e,p){
 const a=e.arena||{x:e.anchor.x-3,y:e.anchor.y-3,w:6,h:6};
 let q={x:clamp(p.x,a.x+1,a.x+a.w-1),y:clamp(p.y,a.y+1,a.y+a.h-1)};
 if(!fits(bindGeometry(s),q.x,q.y,.6)){
  let found=null;for(let y=a.y+1;y<a.y+a.h-1;y++)for(let x=a.x+1;x<a.x+a.w-1;x++)if(fits(bindGeometry(s),x+.5,y+.5,.6)&&(!found||distance({x:x+.5,y:y+.5},p)<distance(found,p)))found={x:x+.5,y:y+.5};
  q=found||{x:e.x,y:e.y};
 }
 return q;
}
function leapMark(s,e,target){
 const geo=bindGeometry(s),d=distance(e,target),reach=Math.min(6,d);let mark={x:e.x,y:e.y};
 for(let at=.05;at<=reach+.001;at+=.05){const p={x:e.x+(target.x-e.x)/Math.max(.001,d)*at,y:e.y+(target.y-e.y)/Math.max(.001,d)*at};if(!fits(geo,p.x,p.y,.55))break;mark=p;}
 return mark;
}
// Existing v21 saves retain progress; only unfinished motion attacks are retimed.
export function migrateEnemyCombat(s){
 if(s.combatRevision===2)return;
 if(s.active)for(const mob of s.enemies)if(mob.region===s.region&&mob.kind==='mob'){clearAttack(s,mob);if(mob.stage!=='dead'){mob.stage='idle';mob.next=s.time+.5;mob.path=[];}}
 for(const e of s.enemies)if(e.region===s.region&&e.kind!=='mob'&&['windup','active'].includes(e.stage)){
  const attacks=s.hazards.filter(h=>h.owner===e.id);
  if(e.pattern==='leap'){
   e.mark=leapMark(s,e,e.mark);const flight=Math.max(.12,distance(e,e.mark)/10);
   if(e.stage==='active'){e.leapAt=s.time;e.leapUntil=s.time+flight;e.landed=false;e.until=e.leapUntil+.4;}
   for(const h of attacks){h.motion='leap';h.x=e.mark.x;h.y=e.mark.y;h.start=(e.stage==='windup'?e.until:e.leapAt)+flight;h.end=h.start+.4;}
  }else if(e.pattern==='charge')for(const h of attacks)h.motion='charge';
 }
 s.combatRevision=2;
}
function choosePattern(e){
 const pools={boar:['charge'],mantis:['leap','slash'],frog:['tongue','leap'],fungus:['pools','ring'],centipede:['charge','slash'],cocoon:['rows','ring'],root:['charge','rows','leap'],spore:['pools','tongue','ring'],vine:['rows','slash','ring']};
 const pool=pools[e.type]||['slash'];return pool[(e.cycle+e.phase-1)%Math.min(pool.length,e.kind==='boss'?e.phase:pool.length)];
}
function planAttack(s,e){
 const pattern=choosePattern(e),warning=e.kind==='mob'?.8:Math.max(1.05,1.5-(e.phase-1)*.12),a=e.arena;
 const target=safeMark(s,e,s.player),mark=pattern==='leap'?leapMark(s,e,target):target;
 e.pattern=pattern;e.mark=mark;e.facing=Math.atan2(mark.y-e.y,mark.x-e.x);e.stage='windup';e.until=s.time+warning;e.cycle++;
 if(pattern==='charge'||pattern==='tongue'){
  const requested=pattern==='charge'?Math.min(7,distance(e,mark)+2):6;
  const reach=Math.min(requested,rayDistance(bindGeometry(s),e,e.facing,requested,false));
  e.to={x:e.x+Math.cos(e.facing)*reach,y:e.y+Math.sin(e.facing)*reach};
  hazard(s,e,{shape:'line',from:{x:e.x,y:e.y},to:e.to,radius:pattern==='charge'?.48:.38,...(pattern==='charge'?{motion:'charge'}:{})},warning,pattern==='charge'?.65:.4);
 }else if(pattern==='leap'||pattern==='slash')hazard(s,e,{shape:'circle',...mark,radius:pattern==='leap'?1.2:1.5,...(pattern==='leap'?{motion:'leap'}:{})},warning+(pattern==='leap'?Math.max(.12,distance(e,mark)/10):0),.4);
 else if(pattern==='ring')hazard(s,e,{shape:'ring',x:e.x,y:e.y,radius:2.7,width:.3},warning,.55);
 else if(pattern==='pools'){
  for(const [dx,dy]of [[0,0],[-2,1.8],[2,-1.8]]){const q=safeMark(s,e,{x:mark.x+dx,y:mark.y+dy});hazard(s,e,{shape:'circle',...q,radius:.85},warning,1.8);}
 }else if(pattern==='rows'){
  const axis=e.cycle%2?'row':'column';
  const positions=axis==='row'?[a.y+3,a.y+a.h-3]:[a.x+4,a.x+a.w-4];
  for(const at of positions)hazard(s,e,axis==='row'?{shape:'rect',x:a.x+.5,y:at,w:a.w-1,h:.65}:{shape:'rect',x:at,y:a.y+.5,w:.65,h:a.h-1},warning,.7);
 }
 s.events.push('windup');
}
export function combatStep(s,dt,hurt){
 const geo=bindGeometry(s),reservations=new Set(),sweeps=new Map(),camps=WORLDS[s.region].camps.filter(c=>availableCamp(s,c));
 for(const e of s.enemies){
  if(s.offer.length||s.status!=='playing')break;
  if(e.region!==s.region||e.stage==='dead'||e.stage==='dormant')continue;
  if(e.kind==='mob'){
   if(s.active)continue;
   const safeCamp=WORLDS[s.region].camps.some(c=>availableCamp(s,c)&&distance(s.player,c)<1.8);
   const near=!safeCamp&&distance(e,s.player)<5&&lineOfSight(geo,e,s.player);
   if(e.stage==='idle'&&s.time>=e.next){
    if(near&&distance(e,s.player)<(e.type==='spitter'?4:1.1)){
     e.mark={x:s.player.x,y:s.player.y};e.facing=Math.atan2(e.mark.y-e.y,e.mark.x-e.x);e.stage='windup';e.until=s.time+.8;e.cycle++;
     hazard(s,e,e.type==='spitter'?{shape:'line',from:{x:e.x,y:e.y},to:e.mark,radius:.22}:{shape:'circle',...e.mark,radius:.65},.8,.25);s.events.push('anticipate');
    }else{
     navigateMob(s,geo,e,near?s.player:e.anchor,camps,reservations,dt);
    }
   }else if(e.stage==='windup'&&s.time>=e.until){e.stage='recover';e.until=s.time+.7;s.events.push('strike');}
   else if(e.stage==='recover'&&s.time>=e.until){e.stage='idle';e.next=s.time+.2;}
  }else{
   if(e.id!==s.active)continue;
   if(e.stage==='transition'){
    if(s.time>=e.until){e.hp=e.maxHp;e.stage='recover';e.until=s.time+2;if(e.type==='spore'&&e.phase===2)pods(s,e);s.events.push('weak');}
    continue;
   }
   if(e.stage==='recover'&&s.time>=e.until)planAttack(s,e);
   else if(e.stage==='windup'&&s.time>=e.until){
    e.stage='active';e.until=s.time+(e.pattern==='charge'?.65:.45);e.chargeDir={x:Math.cos(e.facing),y:Math.sin(e.facing)};
    if(e.pattern==='leap'){e.leapAt=s.time;e.leapUntil=s.time+Math.max(.12,distance(e,e.mark)/10);e.landed=false;e.until=e.leapUntil+.4;s.events.push('evade');for(const h of s.hazards)if(h.owner===e.id&&h.motion==='leap'){h.start=e.leapUntil;h.end=h.start+.4;}}
    else s.events.push('strike');
   }
   else if(e.stage==='active'){
    if(e.pattern==='charge'){
     const before={x:e.x,y:e.y};moveAttack(geo,e,e.chargeDir.x*8*dt,e.chargeDir.y*8*dt,.55);
     sweeps.set(e.id,{from:before,to:{x:e.x,y:e.y}});
     if(distance(before,e)<8*dt*.85)e.until=s.time;
    }else if(e.pattern==='leap'&&!e.landed){
     const d=distance(e,e.mark),step=Math.min(d,10*dt),before={x:e.x,y:e.y};
     if(d>.001)moveAttack(geo,e,(e.mark.x-e.x)/d*step,(e.mark.y-e.y)/d*step,.5);
     if((distance(e,e.mark)<.05&&s.time+1e-9>=e.leapUntil)||(step>.0001&&distance(before,e)<step*.85)){
      e.mark={x:e.x,y:e.y};e.landed=true;e.until=s.time+.4;s.events.push('strike');
      for(const h of s.hazards)if(h.owner===e.id&&h.motion==='leap'){h.x=e.x;h.y=e.y;h.start=s.time;h.end=e.until;}
     }else{e.until=Math.max(e.until,s.time+.5);for(const h of s.hazards)if(h.owner===e.id&&h.motion==='leap'){h.start=Math.max(h.start,s.time+dt);h.end=h.start+.4;}}
    }
    if(s.time>=e.until){e.stage='recover';e.until=s.time+(e.kind==='boss'?2.2-(e.phase-1)*.18:2.4);if(e.pattern==='charge')for(const h of s.hazards)if(h.owner===e.id&&h.motion==='charge')h.end=s.time+dt;s.events.push('weak');}
   }
  }
  if(e.poisonUntil>s.time&&s.time>=e.poisonNext){e.poisonNext=s.time+.5;hitEnemy(s,e,2+(s.upgrades.venom||0),true);}
 }
 const campSafe=!s.active&&WORLDS[s.region].camps.some(c=>availableCamp(s,c)&&distance(s.player,c)<1.8);
 for(const h of s.hazards){
  if(campSafe||s.offer.length||s.status!=='playing'||h.region!==s.region||s.time<h.start||s.time>=h.end)continue;
  const owner=s.enemies.find(e=>e.id===h.owner);
  if(s.active&&owner?.kind==='mob')continue;
  if(h.motion==='leap'&&!owner?.landed)continue;
  const sweep=h.motion==='charge'?sweeps.get(h.owner):null;
  if(h.motion==='charge'&&!sweep)continue;
  const hit=s.tail.some(p=>sweep?segmentDistance(p,sweep.from,sweep.to)<h.radius+.22:hazardContains(h,p)&&(h.shape!=='line'||lineOfSight(geo,h.from,p)));
  if(hit)hurt(s,h.damage,h.poison?'poison':'attack');
 }
 s.hazards=s.hazards.filter(h=>h.end>s.time);
}
export function bite(s){
 if(s.time<s.player.biteAt)return;
 const geo=bindGeometry(s),inRange=e=>distance(e,s.player)<1.65&&lineOfSight(geo,s.player,e)&&Math.cos(Math.atan2(e.y-s.player.y,e.x-s.player.x)-s.player.angle)>-.2;
 const node=s.pods.filter(p=>p.hp>0&&inRange(p)).sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];
 if(node){node.hp=Math.max(0,node.hp-12-(s.upgrades.fang||0)*4);node.hitUntil=s.time+.15;s.player.biteAt=s.time+.45;s.events.push(node.hp?'bosshit':'chain');return;}
 const e=s.enemies.filter(e=>e.region===s.region&&(e.kind==='mob'?!s.active:e.id===s.active)&&vulnerable(s,e)&&inRange(e)).sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];
 if(e){s.player.biteAt=s.time+.45;s.player.biteUntil=s.time+.13;hitEnemy(s,e,12+(s.upgrades.fang||0)*4);}
}
