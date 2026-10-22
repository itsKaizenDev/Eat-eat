import { conePoints, distance, rayDistance, TAU } from './geometry';
import { nearby, torchView } from './sim';
import { living } from './navigation';
import { spikePhase } from './threats';

const INK = '#11292e', GOLD = '#ffd57b', TEAL = '#79e7c4';
function rounded(c, x, y, w, h, r, fill, stroke) {
  c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = .035; c.stroke(); }
}
function circle(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function text(c, value, x, y, size = .26, color = '#e9f3e5') { c.font = `700 ${size}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(value, x, y); }
function diamond(c, x, y, color, size = .26) {
  c.beginPath(); c.moveTo(x, y - size); c.lineTo(x + size * .8, y); c.lineTo(x, y + size); c.lineTo(x - size * .8, y); c.closePath(); c.fillStyle = color; c.fill();
  c.beginPath(); c.moveTo(x, y - size); c.lineTo(x, y + size); c.strokeStyle = '#ffffff88'; c.lineWidth = .03; c.stroke();
}
function floor(c, l) {
  c.fillStyle = '#152c33'; c.fillRect(-1, -2, l.width + 2, l.height + 4);
  for (let y = 0; y < l.height; y++) for (let x = 0; x < l.width; x++) {
    if (l.map[y][x] === ' ') continue;
    c.fillStyle = (x + y) % 2 ? '#324c50' : '#355155'; c.fillRect(x, y, 1, 1);
    c.strokeStyle = '#263f44'; c.lineWidth = .025; c.strokeRect(x + .04, y + .04, .92, .92);
    if ((x * 7 + y * 13) % 17 === 0) { c.strokeStyle = '#466266'; c.beginPath(); c.moveTo(x + .2, y + .4); c.lineTo(x + .45, y + .45); c.lineTo(x + .5, y + .62); c.stroke(); }
    if (l.map[y][x] === '#' || l.map[y][x] === 'C') { c.fillStyle = '#142c3388'; c.fillRect(x + .1, y + .15, 1, 1); }
  }
  l.shadows.forEach(z => { circle(c, z.x, z.y, z.radius, '#171e4470'); circle(c, z.x, z.y, z.radius * .65, '#2d255d55'); });
}
function wall(c, x, y, crate) {
  if (crate) {
    rounded(c, x + .08, y + .03, .84, .88, .09, '#a17c4b', '#d3b27a');
    rounded(c, x + .16, y + .12, .68, .65, .02, '#7c5a35');
    c.strokeStyle = '#bf9a61'; c.lineWidth = .12; c.beginPath(); c.moveTo(x + .18, y + .14); c.lineTo(x + .82, y + .76); c.moveTo(x + .82, y + .14); c.lineTo(x + .18, y + .76); c.stroke();
  } else {
    rounded(c, x + .025, y - .12, .95, 1.08, .08, '#526b6e');
    rounded(c, x + .04, y - .12, .92, .65, .07, '#7c9290', '#a2b3a6');
    c.strokeStyle = '#344e55'; c.lineWidth = .04; c.beginPath(); c.moveTo(x + .06, y + .68); c.lineTo(x + .95, y + .68); c.moveTo(x + .45, y + .68); c.lineTo(x + .45, y + .93); c.stroke();
  }
}
function vision(c, s, g, color) {
  const radial = g.fov === TAU, points = conePoints(s, g, radial ? 96 : 48);
  c.beginPath(); c.moveTo(radial ? points[0].x : g.x, radial ? points[0].y : g.y);
  points.forEach(p => c.lineTo(p.x, p.y)); c.closePath(); c.fillStyle = color; c.fill();
  c.lineWidth = .025; c.strokeStyle = color.replace(/\.[0-9]+\)$/, radial ? '.22)' : '.55)'); c.stroke();
}
function stun(c, a, s) {
  if (a.stunnedUntil > s.time) { circle(c, a.x, a.y - .7, .23, '#76d9da'); text(c, 'Ⅱ', a.x, a.y - .7, .26, INK); }
}
function dog(c, a, s, reduced) {
  c.save(); c.translate(a.x, a.y); c.rotate(a.facing);
  const stride = !reduced && a.stunnedUntil <= s.time && a.path.length ? Math.sin(s.time * 20) * .08 : 0;
  c.fillStyle = '#10262b88'; c.beginPath(); c.ellipse(0, .12, .45, .26, 0, 0, TAU); c.fill();
  c.strokeStyle = '#987052'; c.lineWidth = .11; c.lineCap = 'round'; c.beginPath(); c.moveTo(-.28, 0); c.quadraticCurveTo(-.65, -.03, -.53, -.27); c.stroke();
  for (const x of [-.24, .17]) for (const y of [-.24, .19]) rounded(c, x+stride, y, .13, .16, .05, '#a77a54');
  rounded(c, -.33, -.23, .6, .46, .18, '#8b6649', '#c09b72');
  rounded(c, .1, -.24, .12, .48, .04, a.tethered ? '#73b7c6' : '#d1776c');
  rounded(c, .14, -.24, .45, .48, .13, '#b48c5d');
  for (const y of [-1,1]) { c.fillStyle = '#40362e'; c.beginPath(); c.moveTo(.16,y*.15); c.lineTo(.08,y*.4); c.lineTo(.35,y*.22); c.closePath(); c.fill(); }
  rounded(c, .45, -.12, .24, .24, .09, '#d9bb87'); circle(c, .64, 0, .07, INK);
  for (const y of [-.12,.12]) circle(c, .4, y, .045, a.state === 'CHASE' ? '#ff816a' : INK);
  c.restore();
  text(c, a.tethered ? 'IKAT' : 'ANJING', a.x, a.y + .55, .18, '#e5cda5');
  if (a.barkUntil > s.time) { circle(c, a.x, a.y - .7, .24, '#edab70'); text(c, 'GUK!', a.x, a.y - .7, .18, INK); }
  stun(c, a, s);
}
function beast(c, a, s, reduced) {
  // A hollow mouth and trailing smoke; no gore. The den stays at the fixed origin.
  c.save(); c.translate(a.home.x, a.home.y); c.rotate(Math.atan2(a.dy, a.dx));
  if (a.entrance === 'false-door') {
    rounded(c, -.47, -.48, .3, .96, .08, '#6d677b', '#b4a1c3'); rounded(c, -.43, -.4, .3, .8, .1, '#101522');
  } else { circle(c, -.2, 0, .43, '#101621'); }
  c.restore();
  c.save(); c.translate(a.x, a.y); c.rotate(Math.atan2(a.dy, a.dx));
  const pulse = reduced ? 0 : Math.sin(s.time * 4) * .035;
  for (let i = 3; i >= 0; i--) { c.globalAlpha = 1 - i * .18; circle(c, -.17-i*.14, Math.sin(i*2+s.time)*pulse, .35-i*.04, '#252036'); }
  c.globalAlpha = 1; c.fillStyle = '#151421'; c.beginPath(); c.ellipse(.06, 0, .49, .35+pulse, 0, 0, TAU); c.fill();
  for (const y of [-.17,.17]) { circle(c, .24, y, .085, '#ab7eae'); circle(c, .27, y, .045, a.state === 'WINDUP' || a.state === 'RUSH' ? '#ff9d8c' : '#e5bfdc'); }
  if (a.state === 'RUSH' || a.state === 'WINDUP') {
    rounded(c, .25, -.14, .35, .28, .12, '#070f18', '#b98baf');
    for (const y of [-.09,.09]) for (const x of [.33,.45]) { c.fillStyle = '#e6d5e9'; c.beginPath(); c.moveTo(x,y); c.lineTo(x+.06,y); c.lineTo(x+.03,y*.15); c.closePath(); c.fill(); }
  }
  c.restore(); stun(c, a, s);
}
function actor(c, a, player, s, reduced) {
  const t = reduced ? 0 : s.time, bob = player && a.moving ? Math.sin(a.stride * 14) * .035 : Math.sin(t * 2) * .014;
  c.save(); c.translate(a.x, a.y + bob);
  if (player && a.hidden) c.globalAlpha = .48;
  c.fillStyle = '#0b202a88'; c.beginPath(); c.ellipse(0, .22, .38, .16, 0, 0, Math.PI * 2); c.fill();
  const moving = player ? a.moving : a.path?.length;
  const foot = moving && !reduced ? Math.sin(t * 14) * .07 : 0;
  if (player) {
    // Coiled emerald snake explorer with scarf, satchel, eyes and a directional snout.
    c.strokeStyle = '#4da776'; c.lineWidth = .15; c.lineCap = 'round'; c.beginPath(); c.moveTo(-.05, .2); c.quadraticCurveTo(-.53, .4, -.45, .04 + foot); c.stroke();
    rounded(c, -.26, -.13, .52, .48, .18, '#63c48b', '#b6e6a8');
    rounded(c, -.27, .02, .54, .09, .035, '#e9b86d'); rounded(c, .17, .02, .19, .24, .05, '#a86e44');
    c.rotate(a.facing);
    rounded(c, -.25, -.28, .58, .47, .18, s.status === 'lost' ? '#b1b799' : '#83da9a', '#d6f4b6');
    rounded(c, .05, -.22, .32, .36, .13, '#a7e8a2');
    for (const y of [-.14, .1]) { circle(c, .09, y, .09, '#fff9e6'); circle(c, .125, y, .045, INK); }
    c.strokeStyle = INK; c.lineWidth = .025; c.beginPath(); c.moveTo(.25, .04); c.lineTo(.33, .02); c.stroke();
    c.fillStyle = '#426657'; c.beginPath(); c.moveTo(-.33, -.18); c.lineTo(-.03, -.39); c.lineTo(.15, -.19); c.closePath(); c.fill();
  } else {
    const alert = a.state === 'CHASE' || a.cameraReport, armor = a.kind === 'runner' ? '#d78675' : a.kind === 'warden' ? '#9ba8c1' : '#c5a87a';
    rounded(c, -.24, .15 + foot, .17, .2, .06, '#182d3e'); rounded(c, .08, .15 - foot, .17, .2, .06, '#182d3e');
    rounded(c, -.29, -.22, .58, .53, .13, armor, '#e3dfc2');
    rounded(c, -.32, -.32, .64, .4, .15, '#53657b', '#a0b7c6');
    c.save(); c.rotate(a.facing); rounded(c, .1, -.14, .26, .27, .07, '#e8c9a7');
    circle(c, .23, -.07, .04, alert ? '#d94e49' : INK); circle(c, .23, .07, .04, alert ? '#d94e49' : INK);
    c.fillStyle = GOLD; c.beginPath(); c.moveTo(.43, 0); c.lineTo(.31, -.06); c.lineTo(.31, .06); c.closePath(); c.fill(); c.restore();
    rounded(c, -.34, -.44, .68, .1, .04, armor); circle(c, 0, -.46, .07, a.kind === 'warden' ? '#9d86db' : '#dc9c6d');
    const symbol = a.cameraReport ? '!' : { PATROL: '•', SUSPICIOUS: '?', INVESTIGATE: '?', CHASE: '!', SEARCH: '…', RETURN: '↶' }[a.state];
    if (a.state !== 'PATROL' || a.suspicion > .05) { circle(c, 0, -.8, .2, alert ? '#dd6655' : '#f0c477'); text(c, symbol, 0, -.8, .28, INK); }
    if (a.suspicion > .01) { rounded(c, -.3, -.6, .6, .07, .02, '#152c33'); rounded(c, -.3, -.6, .6 * a.suspicion, .07, .02, alert ? '#fa8271' : GOLD); }
    if (a.kind === 'runner') text(c, '»', 0, .12, .32, '#fff2d2');
  }
  c.restore();
  if (!player) stun(c, a, s);
}
export function createPuzzleRenderer(canvas) {
  const c = canvas.getContext('2d');
  let cache = null, cachedLevel = null, cachedSize = '', reduced = false;
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const updateMotion = () => { reduced = !!media?.matches; }; updateMotion(); media?.addEventListener?.('change', updateMotion);
  function draw(s) {
    if (!s) return;
    const l = s.level, w = canvas.width, h = canvas.height, size = Math.min(w / (l.width + .6), h / (l.height + 2.2));
    const ox = (w - l.width * size) / 2, oy = (h - l.height * size) / 2 + size * .25;
    const transform = ctx => ctx.setTransform(size, 0, 0, size, ox, oy);
    c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,w,h);
    if (cachedLevel !== l || cachedSize !== `${w},${h}`) {
      cachedLevel = l; cachedSize = `${w},${h}`;
      cache = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (cache) { cache.width = w; cache.height = h; const cc = cache.getContext('2d'); transform(cc); floor(cc, l); }
    }
    if (cache) c.drawImage(cache, 0, 0); else { transform(c); floor(c, l); }
    transform(c);
    text(c, 'DUNGEON  /  SHADOW HEIST', 4.5, -.85, .26, '#98b9b6');
    c.textAlign = 'right'; c.fillStyle = GOLD; c.font = '700 .27px system-ui'; c.fillText(`${String(l.number).padStart(2,'0')}   ${l.name}`, l.width - .2, -.85);
    const bob = reduced ? 0 : Math.sin(s.time * 3) * .05;
    // The full map remains visible. Detection cones are clipped by the same ray caster as AI.
    l.torches.forEach(t => vision(c, s, torchView(s, t), 'rgba(255,202,106,.12)'));
    s.crystals.forEach(g => vision(c, s, g, g.suspicion > .4 ? 'rgba(245,113,134,.25)' : 'rgba(179,146,244,.18)'));
    s.guards.filter(g=>living(g)&&g.stunnedUntil<=s.time).forEach(g => vision(c, s, g, g.state === 'CHASE' || g.cameraReport ? 'rgba(255,111,98,.23)' : 'rgba(255,221,140,.17)'));
    s.dogs.filter(living).forEach(d => {
      if (d.stunnedUntil <= s.time) vision(c,s,{...d,facing:0,fov:TAU},d.state==='CHASE'?'rgba(245,153,105,.10)':'rgba(196,180,145,.045)');
      if (d.tethered) {
        c.save(); c.setLineDash([.09,.13]); c.strokeStyle='#9fc4cc70'; c.lineWidth=.035;
        c.beginPath(); c.arc(d.home.x,d.home.y,d.leash,0,TAU); c.stroke(); c.setLineDash([]);
        c.strokeStyle='#abc8c9'; c.lineWidth=.055; c.beginPath(); c.moveTo(d.home.x,d.home.y); c.lineTo(d.x,d.y); c.stroke();
        circle(c,d.home.x,d.home.y,.11,'#648f9b'); c.restore();
      }
    });
    s.beasts.forEach(b => {
      const warning=b.state==='WINDUP'||b.state==='RUSH',a=Math.atan2(b.dy,b.dx),length=Math.min(b.length,rayDistance(s,b.home,a,b.length,false));
      c.save(); c.strokeStyle=warning?'#ed7a8eb0':'#b095b650'; c.lineWidth=warning?.72:.09; if(!warning)c.setLineDash([.12,.2]);
      c.beginPath();c.moveTo(b.home.x,b.home.y);c.lineTo(b.home.x+b.dx*length,b.home.y+b.dy*length);c.stroke();c.restore();
      for(let i=1;i<length;i+=1.5){c.save();c.translate(b.home.x+b.dx*i,b.home.y+b.dy*i);c.rotate(a);text(c,'›',0,0,.35,warning?'#ffd9da':'#ba9bb4');c.restore();}
    });
    (l.hazards||[]).forEach(t=>{
      const phase=spikePhase(s,t),color=phase==='active'?'#e87d6c':phase==='warning'?GOLD:'#637678';
      rounded(c,t.x-.4,t.y-.35,.8,.7,.08,'#1c333a',color);
      for(const dx of [-.22,0,.22]){c.fillStyle=color;c.beginPath();c.moveTo(t.x+dx-.08,t.y+.15);c.lineTo(t.x+dx+.08,t.y+.15);c.lineTo(t.x+dx,t.y-(phase==='active'?.26:.02));c.closePath();c.fill();}
    });
    s.traps.forEach(t=>{circle(c,t.x,t.y,.32,'#253940');c.beginPath();c.arc(t.x,t.y,.32,.2,Math.PI-.2);c.arc(t.x,t.y,.32,Math.PI+.2,TAU-.2);c.strokeStyle='#81e4ca';c.lineWidth=.07;c.stroke();text(c,'×',t.x,t.y,.34,TEAL);});
    for (const n of s.noises) if (n.type !== 'footstep' || n.radius > 2) {
      const progress = Math.min(1, (s.time - (n.until - n.duration)) / n.duration);
      c.beginPath(); c.arc(n.x, n.y, .3 + Math.min(2, n.radius) * progress, 0, Math.PI * 2); c.strokeStyle = `rgba(255,221,150,${.5 * (1 - progress)})`; c.lineWidth = .04; c.setLineDash([.09,.09]); c.stroke(); c.setLineDash([]);
    }
    l.hides.forEach(z => { rounded(c, z.x - .4, z.y - .4, .8, .8, .2, '#373756', '#9d90c0'); text(c, 'F', z.x, z.y, .3, '#d1c8ee'); });
    l.portals.forEach(z => { circle(c, z.x, z.y, .4, '#235b67'); c.beginPath(); c.ellipse(z.x, z.y, .34, .22, 0, 0, Math.PI*2); c.strokeStyle = '#94d9ef'; c.lineWidth = .065; c.stroke(); text(c, z.label, z.x, z.y, .24); });
    l.plates.forEach(z => { const active = s.opened.has(z.door); rounded(c, z.x-.37,z.y-.31,.74,.62,.08,active?'#639f84':'#837a5d',GOLD); text(c,s.crossed.has(z.door)?'✓':s.gateTimers[z.door]>s.time?String(Math.ceil(s.gateTimers[z.door]-s.time)):'P',z.x,z.y,.3); });
    const ready = s.artifacts === l.artifacts.length;
    circle(c, l.exit.x, l.exit.y, .46, ready ? '#3f9e81' : '#345b54'); c.strokeStyle = ready ? TEAL : '#8eaf9b'; c.lineWidth = .06; c.stroke(); text(c, '↥', l.exit.x, l.exit.y, .6, '#d7f5c7'); text(c, 'KELUAR', l.exit.x, l.exit.y + .65, .21, TEAL);
    const objects = [];
    for (let y = 0; y < l.height; y++) for (let x = 0; x < l.width; x++) if ('#C'.includes(l.map[y][x])) objects.push({ y: y + .82, draw: () => wall(c,x,y,l.map[y][x] === 'C') });
    l.doors.forEach(d => objects.push({ y:d.y+.25, draw:() => {
      const open = s.opened.has(d.id); rounded(c,d.x-.46,d.y-.52,.92,1.02,.08,open?'#2b504b':'#67583d',open?'#70ad96':GOLD);
      if (!open) { for(let i=-.3;i<=.3;i+=.2) rounded(c,d.x+i-.035,d.y-.45,.07,.8,.02,'#d5be83'); circle(c,d.x,d.y,.19,'#493c28'); }
      text(c,open?'✓':d.kind==='plate'?'P':d.label||d.key.toUpperCase(),d.x,d.y,.26,open?TEAL:GOLD);
    }}));
    [...l.keys,...l.artifacts,...l.loot].filter(o=>!s.collected.has(o.id)).forEach(o=>objects.push({y:o.y,draw:()=>{
      circle(c,o.x,o.y+.2,.24,'#0e242c80');
      if(o.kind==='artifact'){circle(c,o.x,o.y,.42,'#77dfff14');diamond(c,o.x,o.y-.08+bob,'#8cdded',.31);text(c,'RELIK',o.x,o.y+.45,.18,'#b5f3f5');}
      else if(o.kind==='loot'){circle(c,o.x,o.y+bob,.22,'#eec374');circle(c,o.x,o.y+bob,.15,'#ac7b35');text(c,String(o.value||1),o.x,o.y+bob,.23,'#fff1ae');}
      else {circle(c,o.x-.1,o.y-.05+bob,.13,GOLD);c.strokeStyle=GOLD;c.lineWidth=.08;c.beginPath();c.moveTo(o.x,o.y+bob);c.lineTo(o.x+.23,o.y+.15+bob);c.lineTo(o.x+.29,o.y+.04+bob);c.stroke();text(c,o.key.toUpperCase(),o.x,o.y+.42,.23,GOLD);}
    }}));
    l.levers.forEach(o=>objects.push({y:o.y,draw:()=>{rounded(c,o.x-.28,o.y-.07,.56,.34,.06,'#6c7b75',GOLD);c.strokeStyle=GOLD;c.lineWidth=.09;c.beginPath();c.moveTo(o.x,o.y+.1);c.lineTo(o.x+(s.activated.has(o.id)?.19:-.19),o.y-.3);c.stroke();circle(c,o.x+(s.activated.has(o.id)?.19:-.19),o.y-.3,.1,s.activated.has(o.id)?TEAL:GOLD);text(c,o.label,o.x,o.y+.43,.24,GOLD);}}));
    l.bells.forEach(o=>objects.push({y:o.y,draw:()=>{rounded(c,o.x-.2,o.y-.2,.4,.4,.16,'#d2a653');circle(c,o.x,o.y+.23,.07,GOLD);}}));
    l.torches.forEach(o=>objects.push({y:o.y,draw:()=>{rounded(c,o.x-.07,o.y-.1,.14,.4,.03,'#98664b');diamond(c,o.x,o.y-.2,'#ffd586',.22);}}));
    s.crystals.forEach(o=>objects.push({y:o.y,draw:()=>{rounded(c,o.x-.25,o.y+.04,.5,.27,.06,'#817697');c.save();c.translate(o.x,o.y-.18);c.rotate(o.facing);rounded(c,-.24,-.16,.5,.32,.07,o.triggered?'#ec796c':'#a89ec6','#ded6f3');rounded(c,.2,-.12,.16,.24,.04,'#34374c');circle(c,.29,0,.07,o.triggered?'#ffdfbc':'#b6eff0');c.restore();text(c,o.triggered?'CCTV !':'CCTV',o.x,o.y+.48,.18,o.triggered?'#ffaaa1':'#d4c4f4');}}));
    s.guards.filter(living).forEach(g=>objects.push({y:g.y+.2,draw:()=>actor(c,g,false,s,reduced)}));
    s.dogs.filter(living).forEach(d=>objects.push({y:d.y+.2,draw:()=>dog(c,d,s,reduced)}));
    s.beasts.forEach(b=>objects.push({y:b.y+.2,draw:()=>beast(c,b,s,reduced)}));
    objects.push({y:s.player.y+.22,draw:()=>actor(c,s.player,true,s,reduced)});
    objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    for(const cloud of s.smoke){c.globalAlpha=Math.min(.65,(cloud.until-s.time)*.4);circle(c,cloud.x,cloud.y,cloud.radius,'#bec8d8');circle(c,cloud.x-.4,cloud.y-.2,cloud.radius*.7,'#e2ddeb');c.globalAlpha=1;}
    if(!reduced) for(const f of s.fx){const p=(s.time-f.at)/.8;c.globalAlpha=1-p;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;diamond(c,f.x+Math.cos(a)*p*.7,f.y+Math.sin(a)*p*.7-p*.3,f.kind==='artifact'?'#9af4ff':GOLD,.08);}c.globalAlpha=1;}
    const interaction=nearby(s);
    if(interaction){rounded(c,interaction.x-.22,interaction.y-.88,.44,.37,.08,'#eef4d8',INK);text(c,'E',interaction.x,interaction.y-.69,.25,INK);}
    if(s.player.hidden){text(c,'SEMBUNYI',s.player.x,s.player.y-.65,.2,'#d9c8fa');}
    if(s.status==='won') {text(c,'RELIK AMAN',l.width/2,l.height+.55,.38,TEAL);}
    else text(c,'AMATI  ·  MENYELINAP  ·  ALIHKAN  ·  AMBIL  ·  KELUAR',l.width/2,l.height+.55,.22,'#9eb9b3');
    c.setTransform(1,0,0,1,0,0);
  }
  return { draw, invalidate(){cachedSize='';}, destroy(){cache=null;media?.removeEventListener?.('change',updateMotion);} };
}
