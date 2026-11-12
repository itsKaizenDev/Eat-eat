import { conePoints, distance, rayDistance, TAU } from './geometry';
import { nearby, torchView } from './sim';
import { living } from './navigation';
import { spikePhase } from './threats';

import { cameraView } from './view';
import * as art from './art';
const { INK, GOLD, TEAL, rounded, circle, text, diamond, floor, wall, actor, goblin, mimic, spider, beast } = art;

function vision(c, s, g, color) {
  const radial = g.fov === TAU, points = conePoints(s, g, radial ? 96 : 48);
  c.beginPath(); c.moveTo(radial ? points[0].x : g.x, radial ? points[0].y : g.y);
  points.forEach(p => c.lineTo(p.x, p.y)); c.closePath(); c.fillStyle = color; c.fill();
  c.lineWidth = .025; c.strokeStyle = color.replace(/\.[0-9]+\)$/, radial ? '.22)' : '.55)'); c.stroke();
}

import { bossGround, bossBody, bossBar, bossDirections } from './bossArt';

export function createPuzzleRenderer(canvas, { domHud = false } = {}) {
  const c = canvas.getContext('2d');
  let zoom = 1, overview = false;
  let cache = null, cachedLevel = null, cachedSize = '', reduced = false; const cam = { level: null, x: 0, y: 0 };
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const updateMotion = () => { reduced = !!media?.matches; }; updateMotion(); media?.addEventListener?.('change', updateMotion);
  function draw(s, transition) {
    if (!s) return;
    const l = s.level, w = canvas.width, h = canvas.height;
    const iris = transition?.kind === 'arrival' ? transition : null;
    if (iris) transition = null;
    else if (transition?.kind === 'ascentStory') transition = { ...transition, kind: 'ascent' };
    if (cam.level !== l) { if (cam.level) overview = false; Object.assign(cam, { level: l, x: s.player.x, y: s.player.y }); }
    const blend = reduced ? 1 : .2;
    cam.x += (s.player.x - cam.x) * blend; cam.y += (s.player.y - cam.y) * blend;
    const view = cameraView(l, { width: w, height: h, cssWidth: canvas.clientWidth || w, cssHeight: canvas.clientHeight || h }, cam, { zoom, overview, domHud });
    const { size } = view;
    let { ox, oy } = view;
    if (iris && !reduced) {
      // Center the snake for the opening, then settle into the normal camera bounds.
      const p = Math.max(0, (iris.progress - .5) * 2);
      const settle = p * p * (3 - 2 * p);
      ox += (w / 2 - s.player.x * size - ox) * (1 - settle);
      oy += (h / 2 - s.player.y * size - oy) * (1 - settle);
    }
    const shake = transition && !reduced && transition.kind === 'descent'
      ? Math.sin(transition.progress * 31) * Math.sin(transition.progress * Math.PI) * size * .11 : 0;
    const transform = ctx => ctx.setTransform(size, 0, 0, size, ox + shake, oy - shake * .43);
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
    // Nearby patrol hints expose intent, not the player's unseen location.
    for (const a of [...s.guards, ...s.dogs].filter(living)) {
      if (distance(a, s.player) > 6 || a.stunnedUntil > s.time) continue;
      c.save();
      if (a.charge) {
        c.strokeStyle = a.charge.stage === 'rush' ? '#f97862' : '#f6cd78'; c.lineWidth = .22; c.setLineDash([.15, .14]);
        c.beginPath(); c.moveTo(a.charge.origin.x, a.charge.origin.y); c.lineTo(a.charge.target.x, a.charge.target.y); c.stroke();
      } else if (a.state === 'PATROL' && !a.watch && a.path?.length) {
        c.globalAlpha = .38; c.strokeStyle = '#bcd2bf'; c.lineWidth = .045; c.setLineDash([.1, .17]); c.beginPath(); c.moveTo(a.x, a.y);
        a.path.slice(0, 3).forEach(p => c.lineTo(p.x, p.y)); c.stroke();
      }
      c.setLineDash([]); c.globalAlpha = 1;
      const cue = a.reactingUntil > s.time ? '!' : a.evadingUntil > s.time ? '↗' : a.trafficWaiting ? 'Ⅱ' : a.charge ? a.charge.stage === 'brace' ? '!' : a.charge.stage === 'recover' ? '…' : '»' : '';
      if (cue) text(c, cue, a.x, a.y - .65, .32, '#ffe5ae');
      if (a.awareness === 'veteran') {
        c.strokeStyle = '#ffe5ae'; c.lineWidth = .055;
        for (const offset of [-.07, .07]) { c.beginPath(); c.moveTo(a.x - .13, a.y - .46 + offset); c.lineTo(a.x, a.y - .38 + offset); c.lineTo(a.x + .13, a.y - .46 + offset); c.stroke(); }
      }
      if (a.specialty === 'warden') circle(c, a.x, a.y, .42, null, '#c1a8d5');
      c.restore();
    }
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
      if (b.kind === 'cinder') {
        if (b.state === 'WINDUP' && b.shotEnd) art.cinderWarning(c, b);
        return;
      }
      if (b.kind === 'hunter') {
        if (b.mark && (b.state === 'TELEGRAPH' || b.state === 'STRIKE')) art.hunterCue(c, b);
        return;
      }
      if (b.kind === 'echo') {
        if (b.mark && (b.state === 'TELEGRAPH' || b.state === 'STRIKE')) {
          const points = Array.from({ length: 49 }, (_, i) => {
            const angle = i * TAU / 48;
            const radius = rayDistance(s, b.mark, angle, b.strike, false);
            return { x: b.mark.x + Math.cos(angle) * radius, y: b.mark.y + Math.sin(angle) * radius };
          });
          art.echoCue(c, b, points);
        }
        return;
      }
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
    art.exit(c, l.exit, ready, l.boss?.descent);
    if (transition) art.cinematicGate(c, transition.kind === 'descent' ? s.player : l.exit, transition, reduced);
    const objects = [];
    // A mimic occupies a solid crate tile: paint its crate once, at the same depth.
    const mimicCells = new Set(s.beasts.filter(b => b.kind === 'mimic').map(b => Math.floor(b.x) + ',' + Math.floor(b.y)));
    for (let y = 0; y < l.height; y++) for (let x = 0; x < l.width; x++) {
      if ('#C'.includes(l.map[y][x]) && !(l.map[y][x] === 'C' && mimicCells.has(x + ',' + y))) objects.push({ y: y + .82, draw: () => {
        // A foreground wall must not erase a nearby actor or interactable.
        const behind = [s.player, ...s.guards.filter(living), ...s.dogs.filter(living), ...l.keys, ...l.levers, ...l.artifacts].some(p => Math.abs(p.x - x - .5) < .75 && p.y < y + .3 && p.y > y - .85);
        c.save(); if (behind) c.globalAlpha = .35; wall(c, x, y, l.map[y][x] === 'C', l.chapter === 'inferno'); c.restore();
      } });
    }
    l.doors.forEach(d => objects.push({ y: d.y + .25, draw: () => art.door(c, d, s) }));
    [...l.keys, ...l.artifacts, ...l.loot].filter(o => !s.collected.has(o.id) && (o.locked !== 'boss' || s.boss?.defeated)).forEach(o => objects.push({ y: o.y, draw: () => art.pickup(c, o, bob) }));
    l.levers.forEach(o => objects.push({ y: o.y, draw: () => art.lever(c, o, s) }));
    l.bells.forEach(o => objects.push({ y: o.y, draw: () => art.bell(c, o) }));
    l.torches.forEach(o => objects.push({ y: o.y, draw: () => art.torch(c, o, s, reduced) }));
    s.crystals.forEach(o => objects.push({ y: o.y, draw: () => art.camera(c, o) }));
    if (s.boss) objects.push({ y: l.boss.y + 1.4, draw: () => bossBody(c, s) });
    s.guards.filter(living).forEach(g=>objects.push({y:g.y+.2,draw:()=>actor(c,g,false,s,reduced)}));
    s.dogs.filter(living).forEach(d=>objects.push({y:d.y+.2,draw:()=>goblin(c,d,s,reduced)}));
    for (const b of s.beasts) {
      const dropping = b.kind === 'spider' && b.mark && (b.state === 'TELEGRAPH' || b.state === 'STRIKE');
      objects.push({ y: (dropping ? b.mark.y : b.y) + .32, draw: () => {
        if (b.kind === 'mimic') mimic(c, b, s, reduced);
        else if (b.kind === 'spider') spider(c, b, s, reduced);
        else if (b.kind === 'echo') art.echoBody(c, b, s, reduced);
        else if (b.kind === 'cinder') art.cinderBody(c, b);
        else if (b.kind === 'hunter') art.hunterBody(c, b, s, reduced);
        else beast(c, b, s, reduced);
      } });
      if (b.kind === 'cinder' && b.bolt) objects.push({ y: b.bolt.y + .35, draw: () => art.emberBolt(c, b) });
    }
    objects.push({ y: s.player.y + .22, draw: () => {
      if (!transition) {
        actor(c, s.player, true, s, reduced);
        return;
      }
      const p = transition.progress, scale = reduced ? 1 : 1 - .07 * p;
      c.save();
      c.translate(s.player.x, s.player.y + (reduced ? 0 : (transition.kind === 'descent' ? .075 : -.055) * p));
      c.scale(scale, scale);
      actor(c, { ...s.player, x: 0, y: 0 }, true, s, reduced);
      c.restore();
    } });
    objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    for (const a of [...s.guards, ...s.dogs].filter(living)) if (a.hp < a.maxHp || a.poisonUntil > s.time) {
      const bleeding = a.bleedUntil > s.time, poisoned = a.poisonUntil > s.time, x = a.x - .36, y = a.y - .85;
      rounded(c, x - .03, y - .025, .78, .15, .045, '#211e26');
      c.fillStyle = bleeding ? '#ef786c' : '#e1b971'; c.fillRect(x, y, .72 * a.hp / a.maxHp, .1);
      if (poisoned) diamond(c, a.x - .48, y + .045, '#c6a8ff', .12);
      if (bleeding) {
        c.fillStyle = '#ef786c'; c.beginPath(); c.moveTo(a.x + .47, y - .03);
        c.quadraticCurveTo(a.x + .32, y + .19, a.x + .47, y + .19);
        c.quadraticCurveTo(a.x + .62, y + .19, a.x + .47, y - .03); c.fill();
      }
    }
    for (const b of s.beasts) if (b.fedUntil > s.time) text(c, 'TELAN', b.x, b.y - .65, .2, '#f7aa8f');
    for(const cloud of s.smoke){c.globalAlpha=Math.min(.65,(cloud.until-s.time)*.4);circle(c,cloud.x,cloud.y,cloud.radius,'#bec8d8');circle(c,cloud.x-.4,cloud.y-.2,cloud.radius*.7,'#e2ddeb');c.globalAlpha=1;}
    if(!reduced) for(const f of s.fx){const p=(s.time-f.at)/.8;c.globalAlpha=1-p;const color=['spikes','bleeding','devoured'].includes(f.kind)?'#de736f':({ artifact: '#9af4ff', frost: '#9ce6ff', poison: '#be91ef', stealthPotion: '#c1acef' }[f.kind] || GOLD);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;diamond(c,f.x+Math.cos(a)*p*.7,f.y+Math.sin(a)*p*.7-p*.3,color,.08);}c.globalAlpha=1;}
    const interaction=nearby(s);
    if(interaction){rounded(c,interaction.x-.22,interaction.y-.88,.44,.37,.08,'#eef4d8',INK);text(c,'E',interaction.x,interaction.y-.69,.25,INK);}
    if (s.player.stealth || s.player.hidden) text(c, 'STEALTH', s.player.x, s.player.y - .65, .2, '#d9c8fa');
    if (s.player.wardUntil > s.time) circle(c, s.player.x, s.player.y + .03, .48, '#e9cb6030', '#eed88a');
    if(s.status==='won') {text(c,'RELIK AMAN',l.width/2,l.height+.55,.38,TEAL);}

    c.setTransform(1,0,0,1,0,0);
    if (s.boss) { const ratio = w / (canvas.clientWidth || w); if (!domHud) bossBar(c, s, w, ratio, (canvas.clientWidth < 600 ? 118 : 100) * ratio); bossDirections(c, s, {size, ox, oy}, w, h, ratio); }
    if (iris && iris.progress < 1) {
      const x = ox + size * s.player.x, y = oy + size * s.player.y;
      const maxRadius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
      const p = iris.progress;
      c.fillStyle = '#000';
      if (reduced) {
        c.globalAlpha = 1 - p;
        c.fillRect(0, 0, w, h);
        c.globalAlpha = 1;
      } else {
        const radius = maxRadius * p * p * (3 - 2 * p);
        c.beginPath();
        c.rect(0, 0, w, h);
        if (radius > 0) c.arc(x, y, radius, 0, TAU);
        c.fill('evenodd');
      }
    }
  }
  return { draw, view: () => ({ zoom, overview }), setView(value) {
    if (value === 'toggle') overview = !overview;
    else if (value === 'in' || value === 'out') {
      overview = false; const steps = [.8, 1, 1.3, 1.65], index = steps.indexOf(zoom);
      zoom = steps[Math.max(0, Math.min(steps.length - 1, index + (value === 'in' ? 1 : -1)))];
    }
  }, invalidate(){cachedSize='';}, destroy(){cache=null;media?.removeEventListener?.('change',updateMotion);} };
}
