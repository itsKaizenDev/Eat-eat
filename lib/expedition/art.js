// Presentation only: all decoration stays inside the existing collision tiles.
// The shared Dungeon primitives and K-Snake face keep the modes in one art family.
import { circle, rounded, text, diamond } from '../puzzle/art';

const TAU = Math.PI * 2;
export const INK = '#253e35';
export const PALETTES = [
  { floor:'#ccbc89', floorLight:'#dfcfa0', floorDark:'#ad9d70', edge:'#3d6041', rim:'#76964c', foliage:'#6e964b', foliageLight:'#9bb465', shade:'#294b36', stone:'#828b6a', accent:'#edca7c' },
  { floor:'#a4b49b', floorLight:'#bec9ac', floorDark:'#819780', edge:'#365b5b', rim:'#739189', foliage:'#6a8d80', foliageLight:'#a3b88d', shade:'#28494d', stone:'#778e86', accent:'#cbb0da' },
  { floor:'#c0bba4', floorLight:'#d5cfb7', floorDark:'#a19d8a', edge:'#4c625b', rim:'#8c9d7a', foliage:'#75976b', foliageLight:'#b0c28b', shade:'#344b45', stone:'#8f9c8b', accent:'#e2b986' },
];
function line(c, pts, color = INK, width = .045) {
  c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.strokeStyle=color; c.lineWidth=width; c.lineCap='round'; c.lineJoin='round'; c.stroke();
}
function oval(c,x,y,rx,ry,fill,stroke=INK,angle=0) {
  c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);
  if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=.045;c.stroke();}
}
function polygon(c,points,fill,stroke=INK) {
  c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
  c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.045;c.lineJoin='round';c.stroke();}
}
function leaf(c,x,y,size,color,angle=0) {
  oval(c,x,y,size,size*.48,color,INK,angle);
  line(c,[[x-size*.6*Math.cos(angle),y-size*.6*Math.sin(angle)],[x+size*.6*Math.cos(angle),y+size*.6*Math.sin(angle)]],'#e4e9ad66',.025);
}
function hash(x,y) { return ((Math.imul(x+13,73856093)^Math.imul(y+7,19349663))>>>0)%997; }

export function drawGround(c,w) {
  const p=PALETTES[w.region],walk=(x,y)=>w.map[y]?.[x]==='.';
  const grove=(x,y)=>x>=0&&y>=0&&x+1<w.width&&y+1<w.height&&[[0,0],[1,0],[0,1],[1,1]].every(([dx,dy])=>!walk(x+dx,y+dy));
  c.fillStyle=p.edge;c.fillRect(0,0,w.width,w.height);
  for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++) {
    const h=hash(x,y);
    if(walk(x,y)) {
      c.fillStyle=p.floor;c.fillRect(x,y,1,1);
      // Quiet, low contrast marks: no artificial grid or decorative blockers on the road.
      if(h%3===0)oval(c,x+.5,y+.58,.45,.18,p.floorLight+'44',null,(h%5)*.4);
      if(h%7===0) {
        oval(c,x+.22,y+.76,.06,.035,p.floorDark+'88',null);
        line(c,[[x+.64,y+.25],[x+.77,y+.23]],p.floorLight,.025);
      }
      if(w.region===2&&h%4===0) {
        rounded(c,x+.12,y+.19,.7,.56,.1,p.floorLight+'55');
        line(c,[[x+.19,y+.72],[x+.66,y+.72]],p.floorDark+'60',.025);
      }
    }
  }
  // Worn arena medallions replace the old dotted rectangle around each fight.
  c.save();c.beginPath();
  for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++)if(walk(x,y))c.rect(x,y,1,1);
  c.clip();
  for(const e of w.encounters) {
    const r=e.kind==='boss'?3.4:2.25;
    oval(c,e.x,e.y,r,r*.83,p.floorLight+'35',null);
    c.setLineDash([.12,.34]);circle(c,e.x,e.y,r,null,p.floorDark+'44');c.setLineDash([]);
    for(let k=0;k<8;k++) {
      const a=k*TAU/8;c.save();c.translate(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);c.rotate(a);
      line(c,[[-.12,-.08],[.08,0],[-.12,.08]],p.floorDark+'66',.045);c.restore();
    }
  }
  c.restore();
  for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++)if(!walk(x,y)) {
    const h=hash(x,y),near=[[0,-1],[0,1],[-1,0],[1,0]].some(([dx,dy])=>walk(x+dx,y+dy));
    c.save();c.beginPath();c.rect(x,y,1,1);c.clip();
    if(w.region===1) {
      c.fillStyle=h%3?'#3b6463':'#3e6866';c.fillRect(x,y,1,1);
      line(c,[[x+.12,y+.7],[x+.4,y+.66],[x+.68,y+.7]],'#a0b6a14d',.025);
      if(h%3===0) {
        oval(c,x+.48,y+.47,.29,.17,'#6e9780');
        line(c,[[x+.48,y+.47],[x+.72,y+.37]],'#355c53',.045);
      }
      if(h%7===0)for(const d of [-.12,.12]) {
        line(c,[[x+.48+d,y+.9],[x+.45+d,y+.2]],'#a5b77f',.035);
        oval(c,x+.45+d,y+.27,.045,.13,'#bda379');
      }
    } else if(w.region===2) {
      rounded(c,x+.035,y+.08,.93,.86,.1,'#3c534d',INK);
      rounded(c,x+.04,y+.025,.92,.7,.1,h%3?p.stone:'#849583',INK);
      line(c,[[x+.14,y+.1],[x+.8,y+.1]],'#d2d5ac',.035);
      line(c,[[x+.16,y+.78],[x+.78,y+.78]],'#263d35',.04);
      if(h%4===0)line(c,[[x+.6,y+.12],[x+.48,y+.32],[x+.6,y+.45]],'#526b59',.035);
      if(h%3===0)leaf(c,x+.28,y+.18,.17,p.foliage,-.3);
    } else {
      c.fillStyle=h%2?'#426643':'#466c44';c.fillRect(x,y,1,1);
      if(grove(Math.floor(x/2)*2,Math.floor(y/2)*2)) {
        // Larger trees are drawn after the base tiles, only on complete blocked 2×2 patches.
      } else if(h%5===0) {
        oval(c,x+.52,y+.65,.38,.27,'#284a34',null);
        polygon(c,[[x+.15,y+.58],[x+.27,y+.2],[x+.68,y+.18],[x+.87,y+.51],[x+.73,y+.78],[x+.31,y+.76]],'#788462');
        polygon(c,[[x+.2,y+.53],[x+.32,y+.25],[x+.65,y+.23],[x+.77,y+.48]],'#9aa77a',null);
        line(c,[[x+.54,y+.29],[x+.46,y+.48],[x+.57,y+.59]],'#566d51',.03);
      } else {
        oval(c,x+.5,y+.72,.43,.2,'#284a3499',null);
        line(c,[[x+.51,y+.76],[x+.48,y+.3]],'#846b43',.14);
        for(const [dx,dy,r]of [[.28,.52,.24],[.71,.5,.24],[.51,.65,.24],[.5,.3,.29]])oval(c,x+dx,y+dy,r,r*.78,h%3?p.foliage:'#628d48');
        oval(c,x+.43,y+.23,.16,.09,p.foliageLight,null,-.3);
        line(c,[[x+.23,y+.49],[x+.39,y+.43]],'#c9d48a77',.025);
      }
    }
    // A continuous inside rim marks the exact collision boundary in every biome.
    if(near)for(const [dx,dy,pts]of [[0,-1,[[x,y+.05],[x+1,y+.05]]],[0,1,[[x,y+.95],[x+1,y+.95]]],[-1,0,[[x+.05,y],[x+.05,y+1]]],[1,0,[[x+.95,y],[x+.95,y+1]]]])if(walk(x+dx,y+dy)) {
      line(c,pts,INK,.12);line(c,pts,p.rim,.045);
    }
    c.restore();
  }
  if(w.region===0)for(let y=0;y<w.height;y+=2)for(let x=0;x<w.width;x+=2)if(grove(x,y)) {
    const h=hash(x,y),cx=x+1,cy=y+1;
    oval(c,cx,cy+.5,.84,.33,'#253f3288',null);
    line(c,[[cx,cy+.7],[cx-.06,cy-.35]],'#283f32',.27);
    line(c,[[cx,cy+.7],[cx-.06,cy-.35]],'#8d7148',.17);
    for(const [dx,dy,r]of [[-.48,.17,.42],[.5,.1,.43],[-.37,-.35,.46],[.39,-.4,.46],[0,-.55,.38],[0,.31,.49],[0,-.05,.48]]) {
      oval(c,cx+dx,cy+dy,r,r*.76,h%3?p.foliage:'#638a49');
      oval(c,cx+dx-.05,cy+dy-.12,r*.64,r*.3,h%2?'#91ad5f':'#a0b66a',null,-.25);
    }
    line(c,[[cx-.39,cy+.18],[cx-.14,cy+.03]],'#d5dc9970',.03);
    if(h%3===0)leaf(c,cx+.52,cy+.61,.21,'#9cb374',-.7);
  }
}

function eyes(c,size,alert) {
  for(const side of [-1,1]) {
    oval(c,size*.43,side*size*.26,size*.14,size*.12,alert?'#ffe2a0':'#fff1cf');
    circle(c,size*.48,side*size*.26,size*.058,INK);
    circle(c,size*.5,side*size*.28-size*.025,size*.021,'#fffdf0');
  }
}

export function drawMonster(c,e,s,reduced=false) {
  const big=e.kind==='boss',mob=e.kind==='mob',size=big?1.25:mob?.42:.72;
  const hit=e.hitUntil>s.time,windup=e.stage==='windup',dead=e.stage==='dead';
  const moving=e.stage==='active'||(mob&&e.path?.length>0),stride=reduced||!moving?0:Math.sin(s.time*13)*.07;
  const color=hit?'#fff2cd':({root:'#967b50',vine:'#83a365',spore:'#ac82b3',fungus:'#ac82b3',boar:'#a87d58',frog:'#83a365',mantis:'#8cb55e',centipede:'#87998a',cocoon:'#c6c9aa',crawler:'#8cb55e',spitter:'#8d97ad'})[e.type]||'#8cb55e';
  c.save();c.translate(e.x,e.y);if(dead)c.globalAlpha=.25;
  oval(c,0,.2,size*1.05,size*.57,'#172f353d',null);
  let lift=0;
  if(e.pattern==='leap'&&e.stage==='active'&&!e.landed&&Number.isFinite(e.leapAt)&&e.leapUntil>e.leapAt)lift=Math.sin(Math.max(0,Math.min(1,(s.time-e.leapAt)/(e.leapUntil-e.leapAt)))*Math.PI)*.7;
  c.translate(0,-lift);c.rotate(e.facing||0);
  if(['mantis','centipede','crawler','spitter'].includes(e.type))for(const side of [-1,1])for(let k=0;k<3;k++) {
    const x=(k-1)*size*.48;
    line(c,[[x,side*size*.25],[x-size*.24+stride,side*size*.7],[x+size*.16+stride,side*size*.9]],INK,mob?.09:.12);
    line(c,[[x,side*size*.25],[x-size*.24+stride,side*size*.7],[x+size*.16+stride,side*size*.9]],color,mob?.045:.06);
  }
  if(e.type==='boar') {
    for(const side of [-1,1])for(const x of [-.45,.32])rounded(c,x*size-.12,side*size*.44-.1,.26,.22,.07,'#5c5541',INK);
    oval(c,-size*.13,0,size*.95,size*.65,color);
    // Layered armour, snout and tusks retain a readable boar silhouette.
    rounded(c,-size*.65,-size*.5,size*.9,size,.19,'#737f6c',INK);
    line(c,[[-size*.35,-size*.38],[-size*.35,size*.38]],'#c4c89c',.065);
    for(const side of [-1,1]) {
      polygon(c,[[size*.02,side*size*.43],[size*.05,side*size*.85],[size*.4,side*size*.53]],color);
      polygon(c,[[size*.58,side*size*.25],[size*1.08,side*size*.58],[size*.86,side*size*.12]],'#f0ddb2');
    }
    rounded(c,size*.28,-size*.32,size*.65,size*.64,.14,'#c69e7a',INK);
    for(const side of [-1,1])oval(c,size*.79,side*size*.15,.035,.065,'#695745',null);
  } else if(['spore','fungus'].includes(e.type)) {
    if(big)for(let k=0;k<5;k++){const a=Math.PI*.5+k*Math.PI/4;leaf(c,Math.cos(a)*size*.6,Math.sin(a)*size*.6,size*.4,'#7e9c76',a);}
    rounded(c,-size*.35,-size*.37,size*.95,size*.74,.22,'#e4d7b0',INK);
    oval(c,-size*.25,0,size*.82,size*.88,color);
    oval(c,-size*.4,-size*.12,size*.48,size*.56,hit?'#fff6d9':'#c19ac4',null);
    for(const [x,y,r]of [[-.55,-.35,.13],[-.62,.24,.11],[-.14,-.54,.14],[-.12,.49,.12]])oval(c,x*size,y*size,r*size,r*size*.75,'#ead5ae');
    if(big)for(const side of [-1,1]) {leaf(c,size*.1,side*size*.72,size*.28,'#9faf7c',side);circle(c,size*.27,side*size*.85,.1,'#edcb87',INK);}
  } else if(e.type==='root') {
    for(const side of [-1,1])for(const k of [-1,1]) {
      line(c,[[k*size*.3,side*size*.3],[k*size*.65,side*size*.72],[k*size*.83,side*size*.88]],INK,.24);
      line(c,[[k*size*.3,side*size*.3],[k*size*.65,side*size*.72],[k*size*.83,side*size*.88]],color,.16);
      leaf(c,k*size*.7,side*size*.77,size*.24,'#8ba15c',side*k*.6);
    }
    oval(c,-.1,0,size*.83,size*.71,color);
    oval(c,-size*.12,0,size*.55,size*.46,'#b49661');
    oval(c,-size*.14,0,size*.34,size*.29,null,'#806940');
    line(c,[[-size*.62,-size*.3],[-size*.45,-size*.15],[-size*.62,size*.1]],'#675a3d',.055);
    for(const side of [-1,1])leaf(c,-size*.45,side*size*.43,size*.31,'#849e59',side*.6);
  } else if(e.type==='vine') {
    for(let k=0;k<7;k++) {
      const a=k*TAU/7;leaf(c,Math.cos(a)*size*.67,Math.sin(a)*size*.67,size*.43,hit?'#fff0c8':k%2?'#92ae69':'#75945e',a);
    }
    oval(c,0,0,size*.62,size*.58,color);
    for(let k=0;k<5;k++) {const a=k*TAU/5;oval(c,Math.cos(a)*size*.25,Math.sin(a)*size*.25,size*.3,size*.22,hit?'#fff2cc':'#d9a276',INK,a);}
    circle(c,0,0,size*.22,'#edc875',INK);
  } else if(e.type==='centipede') {
    for(let k=3;k>=0;k--) {
      oval(c,-k*.25,0,.32,.35,k%2?'#9eac94':color);
      line(c,[[-k*.25-.11,-.22],[-k*.25-.11,.21]],'#d5d8ae',.035);
    }
    diamond(c,-.82,0,'#eac17a',.18);
    for(const side of [-1,1])line(c,[[.13,side*.22],[.3,side*.48],[.46,side*.53]],'#c6b78c',.05);
  } else if(e.type==='cocoon') {
    for(const side of [-1,1])leaf(c,-size*.3,side*size*.6,size*.4,'#7f9c70',side*.5);
    oval(c,0,0,size*.8,size*.9,color);
    for(let k=-2;k<=2;k++)line(c,[[-size*.52,k*size*.25],[size*.55,k*size*.25+size*.2]],'#879a7d',.055);
    line(c,[[-size*.44,-size*.5],[size*.35,size*.62]],'#f3ebcd',.055);
  } else if(e.type==='frog') {
    for(const side of [-1,1]) {
      oval(c,-size*.45,side*size*.57,size*.43,size*.28,'#68895c',INK,side*.45);
      polygon(c,[[size*.1,side*size*.44],[size*.4,side*size*.85],[size*.7,side*size*.64]],'#a9b97d');
    }
    oval(c,0,0,size*.77,size*.68,color);
    oval(c,size*.35,0,size*.5,size*.4,'#c2c68d');
    for(const side of [-1,1])oval(c,size*.27,side*size*.51,size*.27,size*.25,color);
    for(const [x,y]of [[-.4,-.2],[-.3,.25],[-.1,0]])circle(c,x*size,y*size,.06,'#536f50');
  } else if(e.type==='mantis') {
    oval(c,-size*.35,0,size*.6,size*.31,color);
    for(const side of [-1,1]) {
      leaf(c,-size*.25,side*size*.18,size*.46,'#a7c77c',side*.3);
      line(c,[[size*.2,side*size*.2],[size*.62,side*size*.75],[size*.95,side*size*.4]],INK,.16);
      line(c,[[size*.2,side*size*.2],[size*.62,side*size*.75],[size*.95,side*size*.4]],'#c5d395',.09);
      line(c,[[size*.45,side*size*.2],[size*.63,side*size*.55],[size*.83,side*size*.65]],'#6c8a4c',.035);
    }
    polygon(c,[[size*.1,-size*.38],[size*.77,0],[size*.1,size*.38]],color);
  } else {
    oval(c,-size*.15,0,size*.87,size*.64,color);
    oval(c,-size*.27,-size*.06,size*.56,size*.43,hit?'#fff5d5':e.type==='spitter'?'#b1adbf':'#adbf78');
    for(const dy of [-.19,.19])circle(c,-size*.3,dy*size,.045,'#d4d9a2');
    if(e.type==='spitter')rounded(c,size*.43,-size*.18,size*.38,size*.36,.07,'#657f75',INK);
  }
  eyes(c,size,windup);
  if(windup)line(c,[[size*.22,-size*.4],[size*.53,-size*.35]],'#65513e',.065);
  if(big)for(let k=0;k<3;k++)diamond(c,-size*.48+k*.33,-size*.91,k<e.phase?'#eac67c':'#607c65',.085);
  c.restore();
}

export function drawCamp(c,camp,selected,time,reduced) {
  c.save();c.translate(camp.x,camp.y);
  oval(c,0,.22,.73,.4,'#596b4333',null);
  for(let k=0;k<7;k++){const a=k*TAU/7;oval(c,Math.cos(a)*.4,Math.sin(a)*.24+.12,.09,.07,'#a9a98c');}
  line(c,[[-.3,.24],[.27,-.02]],'#79563c',.12);line(c,[[-.27,-.02],[.29,.24]],'#997149',.1);
  const flicker=reduced?0:Math.sin(time*7)*.025;
  polygon(c,[[-.22,.08],[-.13,-.21],[0,-.48-flicker],[.12,-.22],[.23,.06],[.07,.17]],selected?'#edbd6e':'#d9965c');
  polygon(c,[[-.09,.08],[0,-.21],[.1,.07],[.02,.15]],'#fff0ba',null);
  line(c,[[-.62,-.13],[-.62,-.7]],INK,.06);
  polygon(c,[[-.59,-.69],[-.21,-.62],[-.59,-.41]],selected?'#b7d38c':'#d6c599');
  text(c,'E',0,.67,.28,'#fff1cc');c.restore();
}

export function drawLoot(c,o,ready) {
  c.save();c.translate(o.x,o.y);oval(c,0,.22,.37,.13,'#273f3533',null);
  if(o.kind==='food') {
    oval(c,0,0,.25,.24,'#d98860');line(c,[[0,-.19],[.04,-.32]],'#785b3d',.05);leaf(c,.14,-.24,.12,'#8ca45a',-.4);
    oval(c,-.08,-.08,.055,.08,'#edb283',null);
  } else if(o.kind==='herb') {
    line(c,[[0,.2],[0,-.28]],'#4b7051',.05);for(const side of [-1,1])leaf(c,side*.14,-.04,.2,'#96b67b',side*.6);
    rounded(c,-.16,.15,.32,.09,.025,'#d8ba7d',INK);
  } else {
    rounded(c,-.34,-.19,.68,.49,.08,ready?'#956c43':'#728476',INK);
    rounded(c,-.35,-.29,.7,.27,.08,ready?'#c39a5a':'#8e9d82',INK);
    for(const x of [-.22,.19])rounded(c,x,-.26,.07,.49,.015,'#e2c68e',INK);
    rounded(c,-.065,-.09,.13,.16,.025,ready?'#edd58b':'#c1c5a3',INK);
    if(o.kind==='relic')diamond(c,0,-.35,ready?'#b9d3b2':'#c7bea2',.12);
  }
  c.restore();
}

export function drawShrine(c,e,done) {
  c.save();c.translate(e.shrine.x,e.shrine.y);
  oval(c,0,.25,.55,.27,'#263f3533',null);
  rounded(c,-.42,-.08,.84,.4,.12,'#758572',INK);
  rounded(c,-.38,-.28,.76,.37,.1,'#a9b394',INK);
  line(c,[[-.28,-.22],[.27,-.22]],'#e0dbb1',.04);
  diamond(c,0,-.26,done?'#abd5aa':'#eac77f',e.kind==='boss'?.31:.24);
  text(c,done?'✓':String(e.index+1),0,.53,.27,INK);c.restore();
}

export function drawGate(c,d,accent) {
  rounded(c,d.x-.46,d.y-.46,.92,.92,.08,'#665b43',INK);
  for(const dx of [-.3,0,.3])line(c,[[d.x+dx,d.y-.35],[d.x+dx,d.y+.35]],'#b2945e',.1);
  line(c,[[d.x-.37,d.y],[d.x+.37,d.y]],'#e0bb78',.1);
  diamond(c,d.x,d.y,accent,.15);
}

export function drawLever(c,o,on) {
  oval(c,o.x,o.y+.16,.35,.23,'#7d8974');
  rounded(c,o.x-.24,o.y-.13,.48,.32,.08,'#a9b196',INK);
  const dx=on?.18:-.18;
  line(c,[[o.x,o.y],[o.x+dx,o.y-.35]],INK,.09);
  circle(c,o.x+dx,o.y-.35,.12,on?'#a8ce82':'#e8bc77',INK);
}

export function drawPod(c,pod,time) {
  c.save();c.translate(pod.x,pod.y);
  oval(c,0,.2,.39,.17,'#273f3540',null);
  for(let k=0;k<4;k++){const a=k*TAU/4;leaf(c,Math.cos(a)*.2,Math.sin(a)*.2,.23,'#92ab78',a);}
  diamond(c,0,0,pod.hitUntil>time?'#fff4d1':'#e2bc87',.28);
  circle(c,0,0,.085,'#b386ad',INK);c.restore();
}

export function drawExit(c,o,back=false,final=false) {
  c.save();c.translate(o.x,o.y);
  oval(c,0,.2,.65,.34,'#293f3540',null);
  rounded(c,-.55,-.57,1.1,.92,.2,'#85987c',INK);
  rounded(c,-.37,-.43,.74,.69,.2,'#375f4c',INK);
  line(c,[[-.4,-.52],[.39,-.52]],'#d7d5a7',.05);
  text(c,back?'←':final?'FIN':'→',0,-.07,final?.3:.5,'#ead29b');
  for(const side of [-1,1])leaf(c,side*.51,.18,.2,'#a5bc82',side*.8);
  c.restore();
}
