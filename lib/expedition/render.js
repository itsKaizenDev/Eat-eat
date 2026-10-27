import { circle, rounded, text } from '../puzzle/art';
import { drawFace } from '../render/face';
import { WORLDS, doorsFor, availableCamp, trapStage, cleared } from './world';
import { vulnerable } from './combat';
import { PALETTES, INK, drawGround, drawMonster, drawCamp, drawLoot, drawShrine, drawGate, drawLever, drawPod, drawExit } from './art';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function line(c,pts,color,width=.07){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function monster(c,e,s,reduced){
 drawMonster(c,e,s,reduced);
 if(e.kind!=='mob'&&e.stage!=='dead'&&s.active===e.id){
  const big=e.kind==='boss',open=vulnerable(s,e);c.save();c.setLineDash(open?[]:[.12,.15]);
  circle(c,e.x,e.y,big?1.6:1.1,null,open?'#f8dc99':'#597b6d99');c.restore();
  if(open)text(c,'CELAH',e.x,e.y-(big?1.9:1.4),.28,'#fff0bf');
  else if(e.type==='centipede')text(c,'EKOR LEMAH',e.x,e.y-1.4,.25,'#fff0bf');
 }
 if(e.kind==='mob'&&e.hp<e.maxHp&&e.stage!=='dead'){
  rounded(c,e.x-.45,e.y-.65,.9,.1,.035,INK);rounded(c,e.x-.43,e.y-.63,.86*e.hp/e.maxHp,.06,.025,'#e9c178');
 }
}
function drawHazard(c,h,time,owner){
 const active=time>=h.start,fill=active?'#d66e5c99':'#e9be6266',edge=active?'#fff0cc':'#ffe2a1';
 c.save();c.fillStyle=fill;c.strokeStyle=edge;c.lineWidth=.075;c.setLineDash(active?[]:[.18,.12]);
 if(h.motion==='charge'&&active){
  if(owner?.stage==='active'){c.setLineDash([.15,.15]);line(c,[[owner.x,owner.y],[h.to.x,h.to.y]],'#edc86d55',.1);c.setLineDash([]);circle(c,owner.x,owner.y,h.radius,'#df6b5b88','#ffe2b2');}
 }else if(h.shape==='line'){
  c.lineWidth=h.radius*2;c.lineCap='round';line(c,[[h.from.x,h.from.y],[h.to.x,h.to.y]],active?'#df6b5bb0':'#edc86d66',h.radius*2);
  circle(c,h.to.x,h.to.y,.22,null,'#ffe8ab');
 }else if(h.shape==='rect'){
  c.fillRect(h.x,h.y,h.w,h.h);c.strokeRect(h.x,h.y,h.w,h.h);
  if(!active)text(c,'!',h.x+h.w/2,h.y+h.h/2,.32,INK);
 }else if(h.shape==='ring'){
  // Ring damage occupies a band, not a hairline: paint its actual inner/outer limits.
  c.setLineDash([]);c.beginPath();c.arc(h.x,h.y,h.radius,0,Math.PI*2);c.strokeStyle=fill;c.lineWidth=h.width*2;c.stroke();
  c.lineWidth=.065;c.strokeStyle=edge;c.setLineDash(active?[]:[.18,.12]);
  for(const r of [Math.max(.01,h.radius-h.width),h.radius+h.width]){c.beginPath();c.arc(h.x,h.y,r,0,Math.PI*2);c.stroke();}
 }else {
  circle(c,h.x,h.y,h.radius,fill,edge);
  if(!active){c.setLineDash([]);text(c,'!',h.x,h.y,.38,INK);}
 }
 c.restore();
}
export function createExpeditionRenderer(canvas){
 const c=canvas.getContext('2d');let layer=null,region=-1,camera=null,overview=false,zoom=1;
 const motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
 function draw(s){
  if(!s)return;
  const w=WORLDS[s.region],W=canvas.width,H=canvas.height,rect=canvas.getBoundingClientRect?.(),cw=rect?.width||W,ch=rect?.height||H,ratio=W/cw;
  if(region!==s.region){if(layer){layer.width=0;layer.height=0;}layer=typeof document!=='undefined'?document.createElement('canvas'):null;
   if(layer?.getContext){layer.width=w.width*40;layer.height=w.height*40;const g=layer.getContext('2d');if(g){g.scale(40,40);drawGround(g,w);}else layer=null;}region=s.region;camera=null;
  }
  const reduced=!!motion?.matches,palette=PALETTES[s.region];
  const land=cw>ch&&ch<550,top=(land?14:s.active?(cw<360?228:216):(cw<360?145:128))*ratio,bottom=(land?102:145)*ratio,left=(land?218:8)*ratio,right=8*ratio;
  const aw=Math.max(1,W-left-right),ah=Math.max(1,H-top-bottom),enemy=s.active&&s.enemies.find(e=>e.id===s.active);
  const focus=enemy?{x:s.player.x*.6+enemy.x*.4,y:s.player.y*.6+enemy.y*.4}:s.player;
  const wanted=overview?Math.min(aw/w.width,ah/w.height):enemy?Math.max(26*ratio,Math.min(42*ratio*zoom,aw/(Math.abs(enemy.x-s.player.x)+5),ah/(Math.abs(enemy.y-s.player.y)+5))):42*ratio*zoom;
  const size=!camera||overview?wanted:camera.size+(wanted-camera.size)*.12;
  const desired={x:left+aw*.5-focus.x*size,y:top+ah*.49-focus.y*size,size};
  if(overview){desired.x=left+(aw-w.width*size)/2;desired.y=top+(ah-w.height*size)/2;}
  if(!camera||overview)camera=desired;else{camera.x+=(desired.x-camera.x)*.18;camera.y+=(desired.y-camera.y)*.18;camera.size=size;}
  c.fillStyle=palette.shade;c.fillRect(0,0,W,H);c.save();c.translate(camera.x,camera.y);c.scale(size,size);
  // Reuse the fully blocked corner as scenery beyond the world. The camera keeps
  // the snake in the HUD-safe area without revealing flat, empty edge bands.
  if(layer&&!overview){
   const x0=Math.floor(-camera.x/size/4)*4,y0=Math.floor(-camera.y/size/4)*4;
   for(let y=y0;y<(H-camera.y)/size;y+=4)for(let x=x0;x<(W-camera.x)/size;x+=4){
    if(x>=0&&y>=0&&x+4<=w.width&&y+4<=w.height)continue;
    c.drawImage(layer,0,0,160,160,x,y,4,4);
   }
  }
  if(layer)c.drawImage(layer,0,0,w.width,w.height);else drawGround(c,w);
  for(const d of doorsFor(s))drawGate(c,d,palette.accent);
  for(const trap of w.traps){
   const state=trapStage(trap,s.time),color=state==='safe'?'#5c6e5c':state==='warning'?'#e6b74c':'#d66b56';
   for(const q of trap.tiles){rounded(c,q.x+.05,q.y+.05,.9,.9,.08,INK);rounded(c,q.x+.08,q.y+.08,.84,.79,.065,color);
    line(c,[[q.x+.15,q.y+.15],[q.x+.83,q.y+.15]],'#c4cba16e',.035);
    for(let k=0;k<3;k++){const x=q.x+.23+k*.27;c.beginPath();c.moveTo(x-.1,q.y+.72);c.lineTo(x,q.y+(state==='active'?.2:.5));c.lineTo(x+.1,q.y+.72);c.closePath();c.fillStyle=state==='active'?'#fff0cb':'#b7be9c';c.fill();}
    if(state==='warning')text(c,'!',q.x+.5,q.y+.3,.32,'#fff3cd');
   }
  }
  for(const camp of w.camps)if(availableCamp(s,camp)){
   drawCamp(c,camp,s.checkpoint===camp.id,s.time,reduced);
   if(overview)text(c,'C',camp.x,camp.y-.9,.65,'#fff3c6');
  }
  for(const o of w.loot)if(!s.looted.includes(o.id))drawLoot(c,o,!o.requires||s.levers.includes(o.requires));
  drawLever(c,w.lever,s.levers.includes(w.lever.id));
  for(const e of w.encounters){
   const done=cleared(s,e.id);drawShrine(c,e,done);
   if(overview)text(c,done?'✓':e.kind==='boss'?'B':String(e.index+1),e.x,e.y,1.1,done?'#b6df9c':'#ffe5ac');
  }
  if(cleared(s,w.encounters[2].id))drawExit(c,w.exit,false,s.region===2);
  if(s.region>0)drawExit(c,w.back,true);
  for(const h of s.hazards)if(h.region===s.region)drawHazard(c,h,s.time,s.enemies.find(e=>e.id===h.owner));
  for(const pod of s.pods)if(pod.region===s.region&&pod.hp>0){const owner=s.enemies.find(e=>e.id===pod.owner);if(owner)line(c,[[pod.x,pod.y],[owner.x,owner.y]],'#b5b89199',.07);drawPod(c,pod,s.time);}
  for(const e of s.enemies)if(e.region===s.region)monster(c,e,s,reduced);
  const p=s.player;c.save();if(p.invulnUntil>s.time&&Math.floor(s.time*12)%2)c.globalAlpha=.5;
  c.lineCap='round';c.lineJoin='round';const points=s.tail.slice().reverse();
  c.save();c.translate(0,.1);c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.strokeStyle='#193f3538';c.lineWidth=.72;c.stroke();c.restore();
  for(const [color,width]of [[INK,.65],['#9ad54d',.48]]){c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  circle(c,p.x,p.y,.3,'#9ad54d',INK);circle(c,p.x-.07,p.y-.1,.1,'#c5e38a55');c.save();c.translate(p.x,p.y);c.scale(.01,.01);drawFace(c,{x:0,y:0},{x:Math.cos(p.angle),y:Math.sin(p.angle)},70,s.time);c.restore();
  if(p.shield)circle(c,p.x,p.y,.53,null,'#b1dbef');
  if(p.biteUntil>s.time)circle(c,p.x+Math.cos(p.angle)*.7,p.y+Math.sin(p.angle)*.7,.55,null,'#ffe6a1');
  if(s.skillFxUntil>s.time)circle(c,p.x,p.y,3*(1-(s.skillFxUntil-s.time)/.5),null,'#bbe6af');c.restore();
  c.restore();
 }
 return {draw,setView(v){if(v==='toggle')overview=!overview;else if(v==='overview')overview=true;else if(v==='follow')overview=false;else if(v==='in'){zoom=clamp(zoom+.15,.75,1.6);overview=false;}else if(v==='out'){zoom=clamp(zoom-.15,.75,1.6);overview=false;}camera=null;},view:()=>({overview,zoom}),invalidate(){camera=null;},destroy(){if(layer){layer.width=0;layer.height=0;}layer=null;camera=null;}};
}
