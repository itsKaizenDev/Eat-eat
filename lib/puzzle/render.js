import { conePoints, distance, rayDistance, TAU } from './geometry';
import { nearby, torchView } from './sim';
import { living } from './navigation';
import { spikePhase } from './threats';

import { cameraView } from './view';
import * as art from './art';
const { INK, GOLD, TEAL, rounded, circle, text, diamond, floor, wall, actor, dog, mimic, spider, beast } = art;

function vision(c, s, g, color) {
  const radial = g.fov === TAU, points = conePoints(s, g, radial ? 96 : 48);
  c.beginPath(); c.moveTo(radial ? points[0].x : g.x, radial ? points[0].y : g.y);
  points.forEach(p => c.lineTo(p.x, p.y)); c.closePath(); c.fillStyle = color; c.fill();
  c.lineWidth = .025; c.strokeStyle = color.replace(/\.[0-9]+\)$/, radial ? '.22)' : '.55)'); c.stroke();
}

// ---- Boss arena drawing: floor warnings, weak zones, the guardian's body and the HP / lives bar. ----
function bossGround(c, s) {
  const b = s.boss, rules = s.level.boss; if (!b) return;
  c.save();
  if (b.state === 'TELE' || b.state === 'ACTIVE') {
    const pulse = b.state === 'ACTIVE' ? .62 : .22 + .12 * Math.sin(s.time * 14);
    for (const k of b.danger) { const [x, y] = k.split(',').map(Number); c.globalAlpha = pulse; c.fillStyle = '#ed4a4a'; c.fillRect(x + .04, y + .04, .92, .92); if (b.state === 'TELE') { c.globalAlpha = .7; c.strokeStyle = '#ffd0c8'; c.lineWidth = .05; c.strokeRect(x + .1, y + .1, .8, .8); } }
  }
  rules.weak.forEach((w, i) => {
    const open = b.state === 'WINDOW' && b.targets.includes(i) && !b.used.includes(i), glow = .5 + .5 * Math.sin(s.time * 6);
    c.globalAlpha = open ? .28 + .14 * glow : .1; c.fillStyle = open ? '#ffe27a' : '#9fb3a2'; c.beginPath(); c.arc(w.x, w.y, 1.5, 0, Math.PI * 2); c.fill();
    c.globalAlpha = open ? .95 : .25; c.strokeStyle = open ? '#fff3b0' : '#9fb3a2'; c.lineWidth = open ? .1 : .05; c.setLineDash(open ? [] : [.18, .18]); c.beginPath(); c.arc(w.x, w.y, 1.5, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  });
  c.globalAlpha = 1;
  for (const h of b.heals) { circle(c, h.x, h.y, .3, '#4fd18b'); text(c, '+', h.x, h.y + .02, .34, '#0e2a1a'); }
  c.restore();
}
function bossBody(c, s) {
  const b = s.boss, g = s.level.boss, hit = s.fx.some(f => f.kind === 'bosshit' && s.time - f.at < .25), angry = b.phase >= 4, tele = b.state === 'TELE' || b.state === 'ACTIVE';
  const x = g.x - 1.5, y = g.y - 1.5 + (b.state === 'DEFEATED' ? .45 : Math.sin(s.time * 2) * .05);
  rounded(c, x, y, 3, 3, .35, hit ? '#f6efe0' : b.defeated ? '#4a4452' : angry ? '#5a2a45' : '#3a3150', '#1b1526');
  for (const dx of [-.6, .6]) { circle(c, g.x + dx, g.y - .3, .26, b.defeated ? '#2b2733' : tele ? '#ff6a5a' : '#ffd86a'); circle(c, g.x + dx, g.y - .28, .1, '#1b1526'); }
  rounded(c, g.x - .75, g.y + .35, 1.5, .4, .15, '#1b1526', '#1b1526');
  if (!b.defeated) for (let i = 0; i < 5; i++) text(c, i < b.phase ? '◆' : '◇', g.x - .72 + i * .36, g.y - 1.18, .28, i < b.phase ? '#ffd86a' : '#8a7fa0');
}
function bossBar(c, s, w, k, top) {
  const b = s.boss; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const bw = Math.min(w * .7, 420 * k), bh = 12 * k, x = (w - bw) / 2, y = top + 6 * k;
  c.fillStyle = '#120d1ccc'; c.fillRect(x - 3 * k, y - 3 * k, bw + 6 * k, bh + 20 * k);
  c.fillStyle = '#3b2a4a'; c.fillRect(x, y, bw, bh); c.fillStyle = b.phase >= 4 ? '#ef5b5b' : '#e0a14a'; c.fillRect(x, y, bw * Math.max(0, b.hp) / b.maxHp, bh);
  c.fillStyle = '#f2e9d0'; c.font = `700 ${11 * k}px sans-serif`; c.textAlign = 'left'; c.fillText(`Penjaga · Fase ${Math.min(5, b.phase)}/5 · HP ${Math.max(0, b.hp)}/${b.maxHp}`, x, y + bh + 13 * k);
  c.textAlign = 'right'; c.fillText('♥'.repeat(b.lives) + '♡'.repeat(b.maxLives - b.lives), x + bw, y + bh + 13 * k); c.restore();
}

export function createPuzzleRenderer(canvas) {
  const c = canvas.getContext('2d');
  let zoom = 1, overview = false;
  let cache = null, cachedLevel = null, cachedSize = '', reduced = false; const cam = { level: null, x: 0, y: 0 };
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const updateMotion = () => { reduced = !!media?.matches; }; updateMotion(); media?.addEventListener?.('change', updateMotion);
  function draw(s) {
    if (!s) return;
    const l = s.level, w = canvas.width, h = canvas.height;
    if (cam.level !== l) { if (cam.level) overview = false; Object.assign(cam, { level: l, x: s.player.x, y: s.player.y }); }
    const blend = reduced ? 1 : .2;
    cam.x += (s.player.x - cam.x) * blend; cam.y += (s.player.y - cam.y) * blend;
    const { size, ox, oy } = cameraView(l, { width: w, height: h, cssWidth: canvas.clientWidth || w, cssHeight: canvas.clientHeight || h }, cam, { zoom, overview });
    const transform = ctx => ctx.setTransform(size, 0, 0, size, ox, oy);
    c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,w,h);
    // Cache static world art in world coordinates, including camera-follow mode.
    // Moving the camera changes only the destination transform, never simulation coordinates.
    const worldWidth = l.width + 2, worldHeight = l.height + 4;
    const cacheScale = Math.min(size, 2048 / Math.max(worldWidth, worldHeight));
    const key = String(cacheScale);
    if (cachedLevel !== l || cachedSize !== key) {
      cachedLevel = l; cachedSize = key;
      cache = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (cache) {
        cache.width = Math.ceil(worldWidth * cacheScale); cache.height = Math.ceil(worldHeight * cacheScale);
        const cc = cache.getContext('2d');
        cc.setTransform(cache.width / worldWidth, 0, 0, cache.height / worldHeight, cache.width / worldWidth, 2 * cache.height / worldHeight);
        floor(cc, l);
      }
    }
    transform(c);
    if (cache) c.drawImage(cache, -1, -2, worldWidth, worldHeight); else floor(c, l);
    const bob = reduced ? 0 : Math.sin(s.time * 3) * .05;
    bossGround(c, s);
    // Presentation follows the existing camera; detection cones still use the AI ray caster.
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
      if (b.kind === 'spider') { art.web(c, b); if (b.state === 'TELEGRAPH' || b.state === 'STRIKE') art.strikeCue(c, b); return; }
      if (b.kind === 'mimic') {
        if (b.state === 'WINDUP' || b.state === 'BITE') {
          const points = Array.from({ length: 49 }, (_, i) => { const a = i * TAU / 48, d = rayDistance(s, b.mouth, a, b.reach, false); return { x: b.mouth.x + Math.cos(a) * d, y: b.mouth.y + Math.sin(a) * d }; });
          art.mimicCue(c, b, points);
        }
        return;
      }
      const warning=b.state==='WINDUP'||b.state==='RUSH',a=Math.atan2(b.dy,b.dx),length=Math.min(b.length,rayDistance(s,b.home,a,b.length,false));
      c.save(); if(!warning){c.restore();return;} c.strokeStyle='#ed7a8eb0'; c.lineWidth=.84;
      c.beginPath();c.moveTo(b.home.x,b.home.y);c.lineTo(b.home.x+b.dx*length,b.home.y+b.dy*length);c.stroke();c.restore();
      if(warning)for(let i=1;i<length;i+=1.5){c.save();c.translate(b.home.x+b.dx*i,b.home.y+b.dy*i);c.rotate(a);c.beginPath();c.moveTo(-.08,-.12);c.lineTo(.05,0);c.lineTo(-.08,.12);c.strokeStyle='#f7d7b6';c.lineWidth=.045;c.lineJoin='round';c.stroke();c.restore();}
    });
    (l.hazards || []).forEach(t => art.hazard(c, t, spikePhase(s, t)));
    s.traps.forEach(t => art.trap(c, t, s));
    for (const n of s.noises) if (n.type !== 'footstep' || n.radius > 2) {
      const progress = Math.min(1, (s.time - (n.until - n.duration)) / n.duration);
      c.beginPath(); c.arc(n.x, n.y, .3 + Math.min(2, n.radius) * progress, 0, Math.PI * 2); c.strokeStyle = `rgba(255,221,150,${.5 * (1 - progress)})`; c.lineWidth = .04; c.setLineDash([.09,.09]); c.stroke(); c.setLineDash([]);
    }
    l.hides.forEach(z => art.hide(c, z));
    l.portals.forEach(z => art.portal(c, z));
    l.plates.forEach(z => art.plate(c, z, s));
    const ready = s.artifacts === l.artifacts.length;
    art.exit(c, l.exit, ready);
    const objects = [];
    // A mimic occupies a solid crate tile: paint its crate once, at the same depth.
    const mimicCells = new Set(s.beasts.filter(b => b.kind === 'mimic').map(b => Math.floor(b.x) + ',' + Math.floor(b.y)));
    for (let y = 0; y < l.height; y++) for (let x = 0; x < l.width; x++) {
      if ('#C'.includes(l.map[y][x]) && !(l.map[y][x] === 'C' && mimicCells.has(x + ',' + y))) objects.push({ y: y + .82, draw: () => wall(c, x, y, l.map[y][x] === 'C') });
    }
    l.doors.forEach(d => objects.push({ y: d.y + .25, draw: () => art.door(c, d, s) }));
    [...l.keys, ...l.artifacts, ...l.loot].filter(o => !s.collected.has(o.id)).forEach(o => objects.push({ y: o.y, draw: () => art.pickup(c, o, bob) }));
    l.levers.forEach(o => objects.push({ y: o.y, draw: () => art.lever(c, o, s) }));
    l.bells.forEach(o => objects.push({ y: o.y, draw: () => art.bell(c, o) }));
    l.torches.forEach(o => objects.push({ y: o.y, draw: () => art.torch(c, o, s, reduced) }));
    s.crystals.forEach(o => objects.push({ y: o.y, draw: () => art.camera(c, o) }));
    if (s.boss) objects.push({ y: l.boss.y + 1.4, draw: () => bossBody(c, s) });
    s.guards.filter(living).forEach(g=>objects.push({y:g.y+.2,draw:()=>actor(c,g,false,s,reduced)}));
    s.dogs.filter(living).forEach(d=>objects.push({y:d.y+.2,draw:()=>dog(c,d,s,reduced)}));
    s.beasts.forEach(b=>objects.push({y:(b.kind==='spider' && b.mark && (b.state==='TELEGRAPH'||b.state==='STRIKE')?b.mark.y:b.y)+.32,draw:()=>b.kind==='mimic'?mimic(c,b,s,reduced):b.kind==='spider'?spider(c,b,s,reduced):beast(c,b,s,reduced)}));
    objects.push({y:s.player.y+.22,draw:()=>actor(c,s.player,true,s,reduced)});
    objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    for(const cloud of s.smoke){c.globalAlpha=Math.min(.65,(cloud.until-s.time)*.4);circle(c,cloud.x,cloud.y,cloud.radius,'#bec8d8');circle(c,cloud.x-.4,cloud.y-.2,cloud.radius*.7,'#e2ddeb');c.globalAlpha=1;}
    if(!reduced) for(const f of s.fx){const p=(s.time-f.at)/.8;c.globalAlpha=1-p;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;diamond(c,f.x+Math.cos(a)*p*.7,f.y+Math.sin(a)*p*.7-p*.3,f.kind==='artifact'?'#9af4ff':GOLD,.08);}c.globalAlpha=1;}
    const interaction=nearby(s);
    if(interaction){rounded(c,interaction.x-.22,interaction.y-.88,.44,.37,.08,'#eef4d8',INK);text(c,'E',interaction.x,interaction.y-.69,.25,INK);}
    if(s.player.hidden){text(c,'SEMBUNYI',s.player.x,s.player.y-.65,.2,'#d9c8fa');}
    if(s.status==='won') {text(c,'RELIK AMAN',l.width/2,l.height+.55,.38,TEAL);}

    c.setTransform(1,0,0,1,0,0);
    if (s.boss) { const ratio = w / (canvas.clientWidth || w); bossBar(c, s, w, ratio, (canvas.clientWidth < 600 ? 118 : 100) * ratio); }
  }
  return { draw, view: () => ({ zoom, overview }), setView(value) {
    if (value === 'toggle') overview = !overview;
    else if (value === 'in' || value === 'out') {
      overview = false; const steps = [.8, 1, 1.3, 1.65], index = steps.indexOf(zoom);
      zoom = steps[Math.max(0, Math.min(steps.length - 1, index + (value === 'in' ? 1 : -1)))];
    }
  }, invalidate(){cachedSize='';}, destroy(){cache=null;media?.removeEventListener?.('change',updateMotion);} };
}
