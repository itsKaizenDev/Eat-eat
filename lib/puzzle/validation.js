import { createState, step, action, FIXED_DT, SPEEDS } from './sim';
import { solid, findPath, distance, lineOfSight, inVision, fits, tileKey, rayDistance, angleDelta } from './geometry';
import { dogSees, laneDistance, beastTiles, spikePhase } from './threats';
import { AREA_TOLERANCE, levelPlan } from './generator';


// Roster, growth and monster budget of a generated round must match the level plan.
export function validatePlan(level) {
  const errors = [], plan = levelPlan(level.number), roles = level.guards.map(g => g.role);
  for (const role of new Set([...plan.roles, ...roles])) if (plan.roles.filter(r => r === role).length !== roles.filter(r => r === role).length) errors.push(`Peran ${role} tidak sesuai rencana level`);
  if (level.guards.filter(g => g.fast).length !== plan.fast) errors.push('Jumlah penjaga cepat tidak sesuai');
  const dogs = level.dogs; if (dogs.filter(d => d.tethered).length !== plan.dogs.tethered || dogs.filter(d => !d.tethered).length !== plan.dogs.free) errors.push('Jumlah anjing tidak sesuai');
  if (level.beasts.length !== plan.monsters.length) errors.push('Jumlah monster utama tidak sesuai');
  if (level.crystals.length > plan.cameras || (plan.cameras && !level.crystals.length)) errors.push('Jumlah kamera di luar batas level');
  const usable = level.map.join('').split('').filter(c => c === '.' || c === 'C').length;
  if (Math.abs(usable - plan.area) > AREA_TOLERANCE) errors.push(`Luas lantai ${usable} di luar pita ${plan.area}`);
  for (const g of level.guards) {
    if (g.role === 'relic' && !g.watch) errors.push('Penjaga relik tidak punya pola pandang');
    if (g.watch && distance(g, g.post) > .01) errors.push('Pos penjaga tidak sinkron');
  }
  return errors;
}
// Nothing may die or alarm while the player stands still: routine patrols never wipe out the defence.
export function idleSurvival(level, seconds = 45) {
  const s = createState(level), actors = [...s.guards,...s.dogs];
  const movement = new Map(actors.map(a=>[a.id,{x:a.x,y:a.y,at:0}])); let stuck = null;
  for (let t = 0; t < seconds; t += FIXED_DT) {
    step(s, { gait: 'sneak' }, FIXED_DT); if (s.status !== 'playing') break;
    for (const a of actors.filter(a=>a.alive)) {
      const m = movement.get(a.id);
      if (distance(a,m) > .15 || a.watch || a.tethered || a.pause > 0 || a.stunnedUntil > s.time || ['SEARCH','SUSPICIOUS'].includes(a.state) || a.avoidTiles?.size) Object.assign(m,{x:a.x,y:a.y,at:s.time});
      if (a.trafficWaiting && s.time-m.at > 8) {stuck=a.id;break;}
    }
    if(stuck)break;
  }
  const dead = actors.filter(a => !a.alive).length;
  return { ok: s.status === 'playing' && !dead && s.alerts === 0 && !stuck, dead, alerts: s.alerts, status: s.status, ...(stuck?{stuck}: {}) };
}

export function validateLevel(level) {
  const errors = [], s = createState(level), all = [level.spawn, level.exit, ...level.keys, ...level.artifacts, ...level.loot, ...level.levers, ...level.hides, ...level.portals, ...level.plates, ...(level.hazards || []), ...(level.dogs || []), ...(level.beasts || []).filter(b => b.kind !== 'mimic')];
  if (!level.id || level.map.length !== level.height || level.map.some(r => r.length !== level.width || /[^.#C ]/.test(r))) errors.push('Peta atau ID tidak valid');
  for (const o of all) if (!fits(s, o.x, o.y)) errors.push(`Objek tertanam: ${o.id || 'spawn/exit'} (${o.x},${o.y})`);
  if (!level.artifacts.length) errors.push('Misi tidak punya relik');
  const ids = [...level.keys, ...level.artifacts, ...level.loot, ...level.doors, ...level.levers, ...level.plates, ...level.portals].map(o=>o.id);
  if (new Set(ids).size !== ids.length) errors.push('ID objek duplikat');
  for (const d of level.doors) {
    if (d.kind === 'key' && !level.keys.some(k=>k.key===d.key)) errors.push(`Kunci ${d.key} tidak tersedia`);
    if (!['key','lever','plate'].includes(d.kind)) errors.push('Jenis pintu tidak dikenal');
  }
  for (const p of level.plates) if (!level.doors.some(d=>d.id===p.door) || p.duration < 3) errors.push('Pelat tidak valid');
  for (const p of level.portals) if (!level.portals.some(d=>d.id===p.pair && d.pair===p.id)) errors.push('Portal tidak berpasangan');
  // Iterative reachability: a key/lever can open a gate only if the player can first reach it.
  let changed = true;
  while(changed) {
    changed = false;
    for(const k of level.keys) if(findPath(s,level.spawn,k)!==null && !s.keys.has(k.key)) {s.keys.add(k.key);changed=true;}
    for(const d of level.doors) if(d.kind==='key' && s.keys.has(d.key) && !s.opened.has(d.id)) {s.opened.add(d.id);changed=true;}
    for(const l of level.levers) if(findPath(s,level.spawn,l)!==null) for(const id of l.doors) if(!s.opened.has(id)){s.opened.add(id);changed=true;}
  }
  for(const o of [...level.artifacts,level.exit,...level.loot]) if(findPath(s,level.spawn,o)===null) errors.push(`Tidak terjangkau tanpa alat/pintasan: ${o.id||'exit'}`);
  const initial = createState(level);
  for(const c of level.crystals) {
    const pose={...c,facing:c.baseFacing+Math.sin(c.phase)*c.sweep};
    if(!fits(initial,c.x,c.y)||inVision(initial,pose,level.spawn))errors.push('CCTV atau spawn tidak aman');
    if(!Array.from({length:17},(_,i)=>c.baseFacing-c.sweep+i*c.sweep/8).some(a=>rayDistance(initial,c,a,c.range,false)>=2.5))errors.push('CCTV tidak mengawasi jalur terbuka');
  }
  for(const [i,g] of level.guards.entries()) {
    if(!fits(initial,g.x,g.y,.21)) errors.push(`Penjaga ${i} tertanam`);
    for(let j=0;j<g.route.length;j++) if(findPath(initial,g.route[j],g.route[(j+1)%g.route.length])===null) errors.push(`Patroli ${i} terputus`);
    if(inVision(initial,g,level.spawn) || distance(g,level.spawn)<1) errors.push(`Spawn terpapar penjaga ${i}`);
  }
  for (const dog of initial.dogs) {
    if (dogSees(initial, dog) || distance(dog, level.spawn) < 2) errors.push('Spawn terpapar anjing');
    if (!dog.route.length || dog.range < 1 || dog.speed <= 0 || (dog.tethered && dog.leash <= 0)) errors.push('Konfigurasi anjing tidak valid');
    for (const target of dog.route) if (findPath(initial, dog, target) === null) errors.push('Rute anjing terputus');
  }
  for (const beast of initial.beasts.filter(b => b.kind === 'shadow' || !b.kind)) {
    if (Math.abs(beast.dx) + Math.abs(beast.dy) !== 1 || ![0,1,-1].includes(beast.dx) || ![0,1,-1].includes(beast.dy) || beast.length < 3) errors.push('Jalur bayangan tidak lurus');
    if (!solid(initial, beast.x - beast.dx, beast.y - beast.dy)) errors.push('Bayangan harus bersarang dekat tembok');
    if (rayDistance(initial, beast, Math.atan2(beast.dy, beast.dx), beast.length + .24, false) < beast.length + .24) errors.push('Jalur bayangan terhalang');
    const p = laneDistance(beast, level.spawn);
    if (p.across < .7 && p.along >= 0 && p.along <= beast.length) errors.push('Spawn di jalur bayangan');
  }
  for (const trap of level.hazards || []) if (trap.period < 3 || trap.active <= 0 || trap.active >= trap.period - .7 || distance(trap, level.spawn) < 2) errors.push('Jebakan atau spawn tidak aman');
  if (level.arranged) {
    const posts = [...level.guards.filter(a=>a.watch),...level.dogs.filter(a=>a.tethered)];
    for (const a of [...level.guards,...level.dogs]) for (const p of posts) if (a!==p && a.route.some(t=>distance(t,p)<.8)) errors.push('Rute NPC berakhir di pos NPC lain');
    const patrol = [...level.guards,...level.dogs].flatMap(a=>[a,...a.route,...(a.route.length>1?findPath(initial,a.route[0],a.route[1])||[]:[])]);
    for (const b of level.beasts) {const at=b.kind==='mimic'?b.mouth:b;if(!patrol.some(p=>distance(at,p)<=3&&lineOfSight(initial,at,p,false))) errors.push('Monster terpisah dari jalur NPC aktif');}
    const kinds = level.beasts.map(b=>b.kind).sort();
    if (JSON.stringify(kinds)!==JSON.stringify(levelPlan(level.number).monsters.slice().sort())) errors.push('Jenis monster tidak sesuai ambang level');
  }
  if (level.variantId) for (const g of level.guards.filter(g => !g.watch)) {
    const next = findPath(initial, g, g.route[1])?.[0];
    if (!next || Math.abs(angleDelta(g.facing, Math.atan2(next.y-g.y,next.x-g.x))) > .01) errors.push('Penjaga tidak menghadap jalur patroli');
  }
  return errors;
}

// Executable temporal route search. Plans only use sneak/wait/E; no teleportation,
// invulnerability, disabled guards, or gadgets. Forecasts retain hearing and guard states.
const TICKS = 42;
function stepToward(s, target) {
  const tolerance=SPEEDS.sneak*FIXED_DT*.5;
  const direction=d=>Math.abs(d)<=tolerance?0:Math.sign(d);
  // Use the same held cardinal/diagonal inputs available on keyboard and touch.
  step(s,{x:direction(target.x-s.player.x),y:direction(target.y-s.player.y),gait:'sneak'},FIXED_DT);
}
class Heap {
  a=[];
  push(v){const a=this.a; a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].cost<=v.cost)break;a[i]=a[p];i=p;}a[i]=v;}
  pop(){const a=this.a,root=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=last.cost)break;a[i]=a[c];i=c;}a[i]=last;}return root;}
}
function forkState(s) {
  return { ...s, player:{...s.player}, traffic: Object.fromEntries(Object.entries(s.traffic || {}).map(([k,v])=>[k,v ? {...v} : v])), guards:s.guards.map(g=>({...g,known:{...g.known},yielding:g.yielding?{...g.yielding,path:g.yielding.path.slice()}:null,path:g.path.slice(),lastKnown:g.lastKnown?{...g.lastKnown}:null,seenHide:g.seenHide?{...g.seenHide}:null})),
    dogs:s.dogs.map(d=>({...d,known:{...d.known},yielding:d.yielding?{...d.yielding,path:d.yielding.path.slice()}:null,path:d.path.slice(),lastKnown:d.lastKnown?{...d.lastKnown}:null})), beasts:s.beasts.map(b=>({...b})),
    traps:s.traps.map(t=>({...t})), cooldowns:{...s.cooldowns},
    crystals:s.crystals.map(c=>({...c})), keys:new Set(s.keys),collected:new Set(s.collected),opened:new Set(s.opened),activated:new Set(s.activated),crossed:new Set(s.crossed),gateTimers:{...s.gateTimers},
    noises:s.noises.slice(),smoke:s.smoke.slice(),fx:[],events:[] };
}
// A* branches the actual fixed-step simulation, including suspicion, memory and sound.
// Every accepted edge is replayable; this avoids assuming guards remain on patrol.
export function temporalPath(s,target,{horizon=170,maxNodes=12000}={}) {
  const heap=new Heap(), seen=new Set();
  // Actual corridor distance avoids exploding the search around curved/L/C outlines.
  const distances=new Map([[tileKey(target.x,target.y),0]]), queue=[target];
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const p={x:queue[i].x+dx,y:queue[i].y+dy},k=tileKey(p.x,p.y);
    if(!distances.has(k)&&!solid(s,p.x,p.y)){distances.set(k,distances.get(tileKey(queue[i].x,queue[i].y))+1);queue.push(p);}
  }
  const heuristic=p=>distances.get(tileKey(p.x,p.y))??Math.abs(p.x-target.x)+Math.abs(p.y-target.y);
  heap.push({state:forkState(s),depth:0,path:[],cost:heuristic(s.player)});
  let visited=0;
  while(heap.a.length && visited++<maxNodes) {
    const v=heap.pop(), p=v.state.player;
    const key=`${tileKey(p.x,p.y)}:${v.depth}:${[...v.state.guards,...v.state.dogs].map(g=>g.alive+g.state[0]+tileKey(g.x,g.y)+Math.floor(g.suspicion*4)).join('/')+':'+v.state.beasts.map(b=>b.state+tileKey(b.x,b.y)).join('/')}`;
    if(seen.has(key))continue;seen.add(key);
    const safeEnd = Math.max(0,...[...v.state.guards,...v.state.dogs].filter(g=>g.alive).map(g=>g.suspicion),...v.state.crystals.map(c=>c.suspicion)) < .35;
    if ((distance(p,target)<.08 && safeEnd) || (v.state.status==='won' && distance(target,s.level.exit)<.1)) return v.path;
    if(v.depth>=horizon)continue;
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[0,0]]) {
      const dest={x:Math.floor(p.x)+.5+dx,y:Math.floor(p.y)+.5+dy};
      if(solid(v.state,dest.x,dest.y))continue;
      const next=forkState(v.state);
      for(let i=0;i<TICKS;i++) {stepToward(next,dest);if(next.status!=='playing'||next.alerts>s.alerts)break;}
      if ((next.status==='won' && distance(target,s.level.exit)>.1) || next.status==='lost'||next.alerts>s.alerts || (next.status!=='won' && distance(next.player,dest)>.08))continue;
      const exposure=Math.max(0,...[...next.guards,...next.dogs].filter(g=>g.alive).map(g=>g.suspicion),...next.crystals.map(c=>c.suspicion));
      heap.push({state:next,depth:v.depth+1,path:[...v.path,dest],cost:v.depth+1+heuristic(next.player)+exposure*4});
    }
  }
  return null;
}

export function replayRoute(s, path, { collectTrace = false } = {}) {
  const trace=[];
  for(const target of path) {
    for(let i=0;i<TICKS;i++) {stepToward(s,target);if(s.status!=='playing')break;}
    if(collectTrace)trace.push({x:s.player.x,y:s.player.y,time:s.time});
    if(s.status!=='playing')break;
  }
  return trace;
}
function approaches(s,o) {
  return [[o.x-1,o.y],[o.x+1,o.y],[o.x,o.y-1],[o.x,o.y+1]].map(([x,y])=>({x,y})).filter(p=>!solid(s,p.x,p.y));
}
// Cheap witnesses before branching: replay a geometry route with real waits and
// all live AI, then fall back to temporal A*. This never disables a threat.
function directWitness(s, target) {
  const danger = new Set(s.beasts.flatMap(beastTiles));
  const paths = [findPath(s,s.player,target,danger),findPath(s,s.player,target)];
  for (const route of paths) if (route) for (const wait of [0]) {
    const path = [...Array.from({length:wait},()=>({x:s.player.x,y:s.player.y})),...route], candidate=forkState(s);
    for (const point of path) { replayRoute(candidate,[point]); if(candidate.status!=='playing'||candidate.alerts>s.alerts)break; }
    const awareness = Math.max(0,...[...candidate.guards,...candidate.dogs].filter(a=>a.alive).map(a=>a.suspicion),...candidate.crystals.map(c=>c.suspicion));
    if(candidate.status!=='lost' && candidate.alerts===s.alerts && distance(candidate.player,target)<.08 && awareness<.35 && candidate.time<=s.level.par)return path;
  }
  return null;
}
// Plan against one conservative forecast instead of cloning the entire world
// for every grid edge. The forecast is only a proposal: admission replays it
// with the real visible player, normal AI, collision, damage and alarms.
function forecastWitness(s,target,horizon) {
  const distances=new Map([[tileKey(target.x,target.y),0]]),queue=[target];
  for(let i=0;i<queue.length;i++)for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){
    const p={x:queue[i].x+dx,y:queue[i].y+dy},k=tileKey(p.x,p.y);
    if(!distances.has(k)&&!solid(s,p.x,p.y)){distances.set(k,distances.get(tileKey(queue[i].x,queue[i].y))+1);queue.push(p);}
  }
  if(!distances.has(tileKey(s.player.x,s.player.y)))return null;
  const simulation=forkState(s);simulation.player.hidden=true;
  const danger=new Set(s.beasts.filter(b=>b.kind!=='shadow').flatMap(b=>beastTiles(b.kind==='mimic'?{...b,trigger:b.reach}:b))),fields=[];
  function paint(field) {
    for(const b of simulation.beasts)if(b.kind==='shadow'&&(b.state==='WINDUP'||b.state==='RUSH'))beastTiles(b).forEach(k=>field.add(k));
    for(const a of [...simulation.guards,...simulation.dogs].filter(a=>a.alive)){
      const dog=a.id.startsWith('dog-'),r=a.stunnedUntil>simulation.time?1:Math.ceil(a.range);
      for(let y=Math.floor(a.y)-r;y<=Math.floor(a.y)+r;y++)for(let x=Math.floor(a.x)-r;x<=Math.floor(a.x)+r;x++){
        if(solid(s,x,y))continue;const p={x:x+.5,y:y+.5},d=distance(a,p);
        if(d<.9||a.stunnedUntil<=simulation.time&&(dog?d<=a.range&&lineOfSight(simulation,a,p):inVision(simulation,a,p)))field.add(`${x},${y}`);
      }
    }
    for(const c of simulation.crystals){const r=Math.ceil(c.range);for(let y=Math.floor(c.y)-r;y<=Math.floor(c.y)+r;y++)for(let x=Math.floor(c.x)-r;x<=Math.floor(c.x)+r;x++)if(!solid(s,x,y)&&inVision(simulation,c,{x:x+.5,y:y+.5}))field.add(`${x},${y}`);}
    for(const t of s.level.hazards||[])if(spikePhase(simulation,t)==='active')field.add(tileKey(t.x,t.y));
  }
  function unsafe(depth){
    while(fields.length<=depth){const field=new Set(danger);paint(field);for(let tick=0;tick<TICKS;tick++){step(simulation,{gait:'sneak'},FIXED_DT);if(tick%6===5||tick===TICKS-1)paint(field);}fields.push(field);}
    return fields[depth];
  }
  const heap=new Heap(),seen=new Set(),start={x:Math.floor(s.player.x)+.5,y:Math.floor(s.player.y)+.5,depth:0,previous:null};
  heap.push({...start,cost:distances.get(tileKey(start.x,start.y))});let visited=0;
  while(heap.a.length&&visited++<18000){
    const v=heap.pop(),k=tileKey(v.x,v.y)+':'+v.depth;if(seen.has(k))continue;seen.add(k);
    if(distance(v,target)<.08){
      const path=[];for(let p=v;p.previous;p=p.previous)path.push({x:p.x,y:p.y});path.reverse();
      const actual=forkState(s);for(const p of path){replayRoute(actual,[p]);if(actual.status!=='playing'||actual.alerts>s.alerts)break;}
      const arrived=distance(actual.player,target)<.08||actual.status==='won'&&distance(target,s.level.exit)<.1;
      const awareness=Math.max(0,...[...actual.guards,...actual.dogs].filter(a=>a.alive).map(a=>a.suspicion),...actual.crystals.map(c=>c.suspicion));
      return arrived&&actual.status!=='lost'&&actual.alerts===s.alerts&&awareness<.35&&actual.time<=s.level.par?path:null;
    }
    if(v.depth>=horizon)continue;const field=unsafe(v.depth);if(field.has(tileKey(v.x,v.y)))continue;
    for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1],[0,0]]){const p={x:v.x+dx,y:v.y+dy},k=tileKey(p.x,p.y),d=distances.get(k);if(d===undefined||field.has(k))continue;heap.push({...p,depth:v.depth+1,previous:v,cost:v.depth+1+d});}
  }
  return null;
}
export function verifyMission(level, { bonus = true, horizon = 170, wait = 0, maxNodes = 12000 } = {}) {
  const errors=validateLevel(level);if(errors.length)return {ok:false,errors};
  const s=createState(level), trace=[], checkpoints=[];
  for(let t=0;t<wait;t+=FIXED_DT)step(s,{gait:'sneak'},FIXED_DT);
  function go(target,label) {
    const path=directWitness(s,target)||forecastWitness(s,target,horizon)||temporalPath(s,target,{horizon,maxNodes});
    if(!path) {errors.push(`Tidak ditemukan jalur waktu: ${label} dari ${tileKey(s.player.x,s.player.y)}`);return false;}
    trace.push(...path);replayRoute(s,path);checkpoints.push({label,time:s.time,alerts:s.alerts,status:s.status});
    if(s.status==='lost'||s.alerts){errors.push(`Replay tidak aman: ${label} (${s.status}, alarm ${s.alerts})`);return false;}
    return true;
  }
  for(const k of level.keys)if(!go(k,k.id))return{ok:false,errors,checkpoints};
  for(const l of level.levers){if(!go(l,l.id))return{ok:false,errors,checkpoints};action(s,'interact');}
  for(const d of level.doors.filter(d=>d.kind==='key')) {
    const targets=approaches(s,d).filter(p=>findPath(s,s.player,p)!==null).sort((a,b)=>distance(a,s.player)-distance(b,s.player));
    if(!targets.length||!go(targets[0],d.id))return{ok:false,errors,checkpoints};
    if(!action(s,'interact')||!s.opened.has(d.id)){errors.push(`Interaksi pintu gagal: ${d.id}`);return{ok:false,errors,checkpoints};}
  }
  for(const o of [...level.artifacts,...(bonus?level.loot:[])])if(!go(o,o.id))return{ok:false,errors,checkpoints};
  if(!go(level.exit,'exit'))return{ok:false,errors,checkpoints};
  return {ok:s.status==='won'&&(!bonus||s.result?.stars===3),errors,checkpoints,time:s.time,stars:s.result?.stars,trace};
}
