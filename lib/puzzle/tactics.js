import { distance, findPath, inVision, rayDistance, tileKey, angleDelta, fits, solid, lineOfSight } from './geometry';
import { beastTiles, laneDistance } from './threats';

// Spikes punish a diverted patrol, not an NPC repeating its authored daily route.
// Keep each plate near that route so a player can still lure a pursuer onto it.
export function arrangeSpikes(input, attempt = 0) {
  const level = JSON.parse(JSON.stringify(input));
  const s = {level, opened:new Set(), smoke:[]};
  const routine = [...level.guards,...level.dogs].flatMap(a => [a,...a.route,
    ...a.route.flatMap((p,i)=>findPath(s,p,a.route[(i+1)%a.route.length]) || [])]);
  const props = [level.spawn,level.exit,...level.keys,...level.levers,...level.artifacts,...level.loot,
    ...level.hides,...level.plates,...level.doors,...level.portals,...level.crystals,...level.torches,
    ...level.bells,...level.guards,...level.dogs,...level.beasts,...level.beasts.flatMap(b=>b.mouth?[b.mouth]:[])];
  const gap = p => Math.min(...routine.map(q=>distance(p,q)));
  for (const h of level.hazards) {
    if (gap(h) >= .7) continue;
    const options=[];
    for(let y=1;y<level.height-1;y++)for(let x=1;x<level.width-1;x++) {
      const p={x:x+.5,y:y+.5},d=gap(p);
      if(level.map[y][x]!=='.'||d<.7||d>3||distance(p,level.spawn)<2.3||
        props.some(q=>distance(p,q)<1)||level.hazards.some(q=>q!==h&&distance(p,q)<1))continue;
      options.push({...p,score:distance(p,h)+d*.2});
    }
    options.sort((a,b)=>a.score-b.score);
    const p=options[attempt%Math.min(4,options.length)];
    if(!p)throw new Error(level.variantId+': no off-patrol spike placement');
    h.x=p.x;h.y=p.y;
  }
  return level;
}

// Patrol instructions are authored on safe ground. This is not runtime hazard
// knowledge: investigating a lure or chasing a player still uses normal navigation.
export function arrangePatrols(input, attempt = 0) {
  const level = JSON.parse(JSON.stringify(input));
  if (!level.beasts.length && !level.hazards.length) return level;
  const s = { level, opened: new Set(), smoke: [] };
  const danger = new Set([...level.beasts.flatMap(b => beastTiles({ ...b, home: b })), ...level.hazards.map(h => tileKey(h.x,h.y))]);
  const actors = [...level.guards, ...level.dogs];
  const props = [level.spawn,level.exit,...level.keys,...level.levers,...level.artifacts,...level.loot,...level.hides,...level.plates,...level.doors,...level.portals,...level.crystals,...level.torches,...level.bells,...level.hazards];
  const floor = [];
  for (let y = 1; y < level.height - 1; y++) for (let x = 1; x < level.width - 1; x++) {
    if (level.map[y][x] === '.' && !danger.has(`${x},${y}`)) floor.push({ x: x + .5, y: y + .5 });
  }
  for (const actor of actors) {
    const otherPosts = actors.filter(a => a !== actor && (a.watch || a.tethered));
    const avoid = new Set([...danger, ...otherPosts.map(a => tileKey(a.x, a.y))]);
    const valid = p => !avoid.has(tileKey(p.x,p.y)) &&
      actors.every(a => a === actor || distance(a,p) >= 1.2) && props.every(q=>distance(q,p)>=1) &&
      distance(p,level.spawn) >= Math.max(actor.range || 0, 3) &&
      level.doors.every(d => distance(d,p) >= 1) && !!findPath(s,actor,p);
    const candidates = floor.filter(valid).sort((a,b) => distance(a,actor)-distance(b,actor));
    let start = {x:actor.x,y:actor.y};
    if (danger.has(tileKey(start.x,start.y)) || props.some(p=>distance(p,start)<1)) {
      start = candidates[attempt % Math.min(3,candidates.length)];
      if (!start) throw new Error(level.variantId + ': no safe patrol start');
      Object.assign(actor,start); actor.home = {...start};
      if (actor.post) actor.post = {...start};
    }
    if (actor.watch || actor.tethered) { actor.route = [start]; continue; }
    const oldEnd = actor.route.findLast(p=>!p.transit) || actor.route.at(-1);
    let path = !avoid.has(tileKey(oldEnd.x,oldEnd.y)) && findPath(s,start,oldEnd,avoid);
    if (!path?.length || attempt) {
      const ends = floor.filter(p => !avoid.has(tileKey(p.x,p.y)) && distance(p,start) >= 2 && otherPosts.every(a=>distance(a,p)>=.9))
        .sort((a,b)=>distance(a,oldEnd)-distance(b,oldEnd));
      const paths = ends.map(p=>findPath(s,start,p,avoid)).filter(p=>p?.length>=2);
      path = paths[attempt % Math.min(6,paths.length)];
    }
    if (!path?.length) throw new Error(level.variantId + ': no safe patrol loop');
    actor.route = [start, ...path.map((p,i)=>({...p,...(i<path.length-1?{transit:true}:{})})),
      ...path.slice(0,-1).reverse().map(p=>({...p,transit:true}))];
    actor.facing = Math.atan2(path[0].y-start.y,path[0].x-start.x);
  }
  return level;
}

// Author tactical relationships after the footprint and roster have been chosen.
// This runs offline. Gameplay loads the accepted bank without layout work per frame.
export function arrangeTactics(input, { exitRank = 0, scanPosts = false, keepPortals = false } = {}) {
  const level = JSON.parse(JSON.stringify(input));
  const closed = { level, opened: new Set(), smoke: [] };
  const open = { ...closed, opened: new Set(level.doors.map(d => d.id)) };
  const floor = [];
  for (let y = 1; y < level.height - 1; y++) for (let x = 1; x < level.width - 1; x++) {
    if (level.map[y][x] === '.') floor.push({ x: x + .5, y: y + .5 });
  }
  const props = [level.spawn, ...level.keys, ...level.levers, ...level.artifacts, ...level.loot,
    ...level.hides, ...level.plates, ...level.doors, ...level.crystals, ...level.torches,
    ...level.bells, ...level.hazards, ...level.guards, ...level.dogs];
  const dangers = new Set(level.beasts.flatMap(b => beastTiles({ ...b, home: b })));
  const free = p => props.every(q => distance(p, q) >= 1.2) && !dangers.has(tileKey(p.x, p.y));
  const entry=distanceField(closed,level.spawn), relics=level.artifacts.map(r=>distanceField(open,r));
  const away=p=>relics.every(d=>(d.get(tileKey(p.x,p.y))??0)>=8);

  for (const guard of level.guards) {
    guard.awareness = guard.fast || guard.role === 'investigator' ? 'veteran' : 'rookie';
    if (!guard.watch || !scanPosts) continue;
    const primary = guard.watch[0];
    // Scan a real doorway or stretch of floor while leaving an observation gap.
    const choices = floor.filter(p => distance(guard, p) >= 1.6 && distance(guard, p) <= guard.range)
      .map(p => ({ p, angle: Math.atan2(p.y - guard.y, p.x - guard.x) }))
      .filter(({ p, angle }) => Math.abs(angleDelta(angle, primary)) >= 1.1 &&
        rayDistance(closed, guard, angle, guard.range, false) >= distance(guard, p) &&
        !inVision(closed, { ...guard, facing: angle }, level.spawn))
      .sort((a, b) => Math.abs(angleDelta(a.angle, guard.watch[1])) - Math.abs(angleDelta(b.angle, guard.watch[1])));
    if (choices.length) guard.watch[1] = choices[0].angle;
  }

  if (level.portals.length && !keepPortals) {
    const candidates = floor.filter(p => free(p) && entry.has(tileKey(p.x,p.y)) && away(p));
    let pair = null;
    let best = -Infinity;
    for (const a of candidates) {
      const routes=distanceField(open,a);
      for (const b of candidates) {
      if (distance(a, b) < 3) continue;
      const travel = routes.get(tileKey(b.x,b.y)) ?? 0;
      if (travel < 8) continue;
      // A pair links distinct parts of the route, with a safe landing footprint.
      const score = travel - distance(a, level.portals[0]) * .15 - distance(b, level.portals[1]) * .15;
      if (score > best) { pair = [a, b]; best = score; }
    }
    }
    if (!pair) throw new Error(level.variantId + ': no useful portal pair');
    level.portals.forEach((p, i) => Object.assign(p, pair[i]));
  }

  // Alternate extraction stages use a separate, reachable exit after the vault.
  // Other stages retain their return journey, so players learn both structures.
  level.flow = 'return';
  level.exit = {...level.spawn};
  if (level.number >= 6 && level.number % 3 === 0) {
    const last = level.artifacts.at(-1);
    const candidates = floor.filter(p => free(p) && level.portals.every(q => distance(p, q) >= 2) &&
      distance(p, level.spawn) >= 4 && away(p) &&
      level.guards.every(g => !inVision(open, g, p)) && entry.has(tileKey(p.x,p.y)));
    candidates.sort((a, b) => distance(b, level.spawn) - distance(a, level.spawn));
    const exits = candidates.filter(p => (findPath(open, last, p)?.length ?? 0) >= 8);
    const exit = exits[exitRank % Math.max(1,exits.length)];
    if (exit) { level.exit = { ...exit }; level.flow = 'extraction'; }
  }
  level.goal = `Ambil ${level.artifacts.length} relik, lalu menuju pintu keluar hijau.`;
  level.tip = tacticalTip(level);
  if (level.tutorial) level.tip = input.tip;
  return level;
}

export function tacticalTip(level) {
  if(level.tutorial)return level.tip;
  const parts=[level.flow==='extraction'?'Pintu keluar terpisah dari titik masuk. Periksa peta sebelum mengambil relik.':'Bawa relik kembali ke pintu masuk. Koin emas opsional.'];
  if(level.number>=30)parts.push('Pancing penjaga ke monster dari luar pandangan. Tembok dan asap menutup penglihatan. Veteran bertanda dua garis bereaksi lebih cepat.');
  else if(level.number>=20)parts.push('Penjaga merah bergerak lebih cepat. Tunggu duri padam sebelum melintas.');
  if(level.number>=25)parts.push('Warden: keluar ke samping saat ia bersiap, lalu manfaatkan jeda pulihnya.');
  return parts.join(' ');
}

// Offline candidates: nests are close enough to bait from patrols, while their
// attack lanes avoid the ordinary patrol path. The simulator makes the final decision.
export function shadowPlacements(level) {
  const b=level.beasts.find(b=>b.kind==='shadow');if(!b)return [];
  const s={level,opened:new Set(),smoke:[]};
  const patrol=[...level.guards,...level.dogs].flatMap(a=>[a,...a.route,...a.route.flatMap((p,i)=>findPath(s,p,a.route[(i+1)%a.route.length])||[])]);
  const props=[level.spawn,level.exit,...level.keys,...level.levers,...level.artifacts,...level.loot,...level.hides,...level.portals,...level.plates,...level.hazards,...level.crystals,...level.doors,...level.beasts.filter(a=>a!==b)];
  const choices=[];
  for(let y=1;y<level.height-1;y++)for(let x=1;x<level.width-1;x++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p={x:x+.5,y:y+.5};
    if(!fits(s,p.x,p.y)||!solid(s,x-dx,y-dy)||distance(p,level.spawn)<5.5||props.some(q=>distance(p,q)<1.2)||!patrol.some(q=>distance(q,p)<=3&&lineOfSight(s,p,q,false)))continue;
    for(const length of [6,5,4,3]){
      if(rayDistance(s,p,Math.atan2(dy,dx),length+.24,false)<length+.24)continue;
      const candidate={...b,...p,home:p,dx,dy,length};
      const danger=q=>{const d=laneDistance(candidate,q);return d.along>=-.4&&d.along<=length+.4&&d.across<.75;};
      if(patrol.some(danger)||[level.spawn,level.exit,...level.portals].some(danger))continue;
      delete candidate.home;choices.push({candidate,score:distance(p,b)+(6-length)*2});break;
    }
  }
  return choices.sort((a,b)=>a.score-b.score).map(({candidate})=>{const copy=JSON.parse(JSON.stringify(level));Object.assign(copy.beasts.find(b=>b.kind==='shadow'),candidate);return copy;});
}

function distanceField(s,from){
 const q=[from],d=new Map([[tileKey(from.x,from.y),0]]);
 for(let i=0;i<q.length;i++){const p=q[i],cost=d.get(tileKey(p.x,p.y));for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,y:p.y+dy},key=tileKey(n.x,n.y);if(!d.has(key)&&!solid(s,n.x,n.y)){d.set(key,cost+1);q.push(n);}}}
 return d;
}
