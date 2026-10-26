// Simulasi Snake Delivery "Kurir Apel" — MURNI: tanpa React, GSAP, storage, jam, atau RNG global.
// Waktu (`t`, ms simulasi) dan RNG diberikan pemanggil. State bersifat mutable (dimutasi in-place, dikembalikan lewat daftar event).
//
// MODEL
//  - Tubuh = tubuh dasar (`baseLen`, tetap) + segmen kargo (satu per paket yang dibawa), dicatat TERPISAH.
//    Invarian: snake.length === baseLen + cargo.length. Mengantar/membuang kargo memendekkan EKOR; kepala/tubuh dasar tidak pernah terpotong.
//  - Tujuan (site) A/B/C tetap di arena. Pesanan (maks `maxOrders`) = satu paket bertipe T yang menunggu di titik pickup,
//    diantar ke site T. Kapasitas kargo = `capacity`.
//  - Site menerima paket TERTUA yang cocok, SATU per kali kepala MASUK ke sel site (harus keluar-masuk lagi untuk kiriman berikutnya).
//  - Umur paket dihitung saat diambil: jarak rute statis terpendek (BFS) pickup -> site * interval gerak * margin + grace.
//    Paket yang melewati deadline menjadi BASI: kargo dibuang (ekor dipendekkan), skor berkurang (min 0), slot pesanan kosong.
//
// URUTAN EVENT pada satu langkah di waktu `t`:
//   1. paket yang deadline-nya < t menjadi basi (deadline == t MASIH sah: pengantaran pada t yang sama menang atas basi);
//   2. gerak kepala; tabrak tembok/rintangan/tubuh = kalah;
//   3. pickup (tumbuh +1 bila kapasitas cukup);
//   4. pengantaran (paling banyak satu paket);
//   5. pesanan baru diisi bila slot kosong dan jeda sudah lewat.
// Akhir shift: langkah/pengantaran yang jatuh tepat pada `shiftMs` diproses SEBELUM hasil dievaluasi (dilakukan pemanggil).
//
// Legacy fixed-shift reachability: titik pickup dipilih dari sel yang secara STATIS dapat dicapai dari posisi awal (BFS tanpa tubuh).
// Legacy alone does not model moving body. Mayhem validates the whole queue
// through real stepSim transitions (body, cargo, time, gates, lanes and traffic).
import { sameCell, bodyAfterMove, isOpposite } from '../sim/grid';
import { PACKAGE_KINDS } from './missions';
import { barrierState, trafficState } from './city';
import { findDeliveryRoute } from './routing';

export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
export const TYPES = { A: { label: 'Apel' }, B: { label: 'Surat' }, C: { label: 'Kotak' } };
export const TYPE_IDS = ['A', 'B', 'C'];

// Parameter awal (dapat diubah): maksimum pesanan aktif 2, kapasitas kargo 3, shift 120 dtk, target 5 pengantaran.
export const DEFAULT_CONFIG = {
  shiftMs: 120000, target: 5, maxOrders: 2, capacity: 3,
  margin: 2.2, graceMs: 5000, spawnDelayMs: 800, minPickupDist: 4,
  points: 10, quickBonus: 5, stalePenalty: 5,
};

export const ARENA_MAP = [
  '.................',
  '.................',
  '..A...........B..',
  '.................',
  '....##.....##....',
  '....#.......#....',
  '.................',
  '.................',
  '.................',
  '....#.......#....',
  '....##.....##....',
  '.................',
  '.................',
  '........C........',
  '.................',
];
export const START = { snake: [[8, 7], [7, 7], [6, 7]], dir: 'R' };

// ---------- arena ----------
export function parseArena(map, start, extras = {}) {
  const h = map.length, w = map[0].length;
  const arena = { ...extras, features:extras.features||{gates:[],blocks:[],traffic:[],lanes:[],bumps:[]}, w, h, obstacle: new Uint8Array(w * h), sites: {}, start: { snake: start.snake.map(([x, y]) => ({ x, y })), dir: start.dir }, errors: [] };
  map.forEach((row, y) => {
    if (row.length !== w) arena.errors.push(`baris ${y} panjang ${row.length}, seharusnya ${w}`);
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#') arena.obstacle[y * w + x] = 1;
      else if (TYPE_IDS.includes(c)) { if (arena.sites[c]) arena.errors.push(`site ${c} muncul lebih dari sekali`); else arena.sites[c] = { x, y }; }
      else if (c !== '.') arena.errors.push(`karakter tidak dikenal '${c}' di (${x},${y})`);
    }
  });
  TYPE_IDS.forEach(t => { if (!arena.sites[t]) arena.errors.push(`site ${t} tidak ada`); });
  const inb = (p) => p.x >= 0 && p.y >= 0 && p.x < w && p.y < h;
  arena.start.snake.forEach((p, i) => {
    if (!inb(p)) arena.errors.push(`segmen awal ${i} di luar arena`);
    else if (arena.obstacle[p.y * w + p.x]) arena.errors.push(`segmen awal ${i} di atas rintangan`);
    if (i > 0 && Math.abs(p.x - arena.start.snake[i - 1].x) + Math.abs(p.y - arena.start.snake[i - 1].y) !== 1) arena.errors.push(`segmen awal ${i} tidak bersebelahan`);
  });
  const d = DIRS[start.dir];
  if (!d) arena.errors.push('arah awal tidak valid');
  else if (arena.start.snake.length >= 2 && (arena.start.snake[0].x - arena.start.snake[1].x !== d.x || arena.start.snake[0].y - arena.start.snake[1].y !== d.y)) arena.errors.push('arah awal tidak sesuai kepala-leher');
  if (!arena.errors.length) {
    const reach = bfs(arena, arena.start.snake[0]);
    TYPE_IDS.forEach(t => { const s = arena.sites[t]; if (reach[s.y * w + s.x] < 0) arena.errors.push(`site ${t} tidak terjangkau dari posisi awal`); });
  }
  return arena;
}

// Jarak langkah statis (4 arah, tanpa tubuh) dari `from` ke semua sel; -1 = tidak terjangkau.
export function bfs(arena, from) {
  const { w, h, obstacle } = arena;
  const dist = new Int16Array(w * h).fill(-1);
  const q = [from.y * w + from.x];
  dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const cur = q[i], cx = cur % w, cy = (cur - cx) / w;
    for (const k of ['U', 'D', 'L', 'R']) {
      const nx = cx + DIRS[k].x, ny = cy + DIRS[k].y;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (obstacle[ni] || dist[ni] !== -1) continue;
      dist[ni] = dist[cur] + 1; q.push(ni);
    }
  }
  return dist;
}
export const routeDistance = (arena, a, b) => bfs(arena, a)[b.y * arena.w + b.x];

// ---------- state ----------
export function createState({ arena, config, rng, interval, t }) {
  if (arena.errors.length) throw new Error('arena tidak valid: ' + arena.errors.join('; '));
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  const start = t || 0;
  const state = {
    arena, cfg, rng, interval, t: start,
    snake: arena.start.snake.map(p => ({ ...p })), dir: { ...DIRS[arena.start.dir] }, baseLen: arena.start.snake.length,
    cargo: [], orders: [], delivered: 0, stale: 0, score: 0, nextId: 1, nextSpawnAt: start,
    status: 'playing', reason: null, braking:false, delayUntil:0, streak:0, bestStreak:0, damaged:0, completed:[], failureLog:[], breakdown:{base:0,speed:0,integrity:0,efficiency:0,combo:0,objective:0,penalty:0}, incidents:{}, moveCount:0, finishApplied:false, warnings:new Set(), featureState:{},
    siteDist: Object.fromEntries(TYPE_IDS.map(k => [k, bfs(arena, arena.sites[k])])),
    reach: bfs(arena, arena.start.snake[0]),
  };
  updateFeatures(state,start,[]);
  spawnOrders(state, start, []);
  return state;
}

const idx = (s, p) => p.y * s.arena.w + p.x;
export const pickups = (s) => s.orders.filter(o => !o.picked);
export const siteAt = (s, p) => TYPE_IDS.find(k => sameCell(s.arena.sites[k], p)) || null;
export const lifeLeft = (c, t) => Math.max(0, c.deadline - t);

export const cargoUnits = s => s.cargo.reduce((n,c)=>n+(c.size||1),0);
export const movementInterval = s => Math.round(s.interval*(1+.18*s.cargo.filter(c=>c.kind==='heavy').length));
function shrinkTail(s) { while (s.snake.length > s.baseLen + s.cargo.length) s.snake.pop(); }

function makeOrder(s, t) {
  if(s.cfg.mayhem)return makeMayhemOrder(s,t);
  const { arena, cfg } = s;
  const head = s.snake[0];
  const taken = new Set(s.snake.map(p => idx(s, p)));
  s.orders.forEach(o => { if (!o.picked) taken.add(idx(s, o.pickup)); });
  TYPE_IDS.forEach(k => taken.add(idx(s, arena.sites[k])));
  const cand = [];
  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) {
    const i = y * arena.w + x;
    if (arena.obstacle[i] || s.reach[i] < 0 || taken.has(i)) continue;
    if (Math.abs(x - head.x) + Math.abs(y - head.y) < cfg.minPickupDist) continue;
    cand.push({ x, y });
  }
  if (!cand.length) return null; // tidak ada sel yang valid: coba lagi nanti (tidak pernah looping tanpa batas)
  const type = TYPE_IDS[Math.floor(s.rng() * TYPE_IDS.length)];
  const cell = cand[Math.floor(s.rng() * cand.length)];
  return { id: s.nextId++, type, pickup: cell, picked: false, createdAt: t };
}

function spawnOrders(s, t, ev) {
  if(s.cfg.mayhem&&(s.cargo.length||s.orders.length))return;
  while (s.orders.length < s.cfg.maxOrders && t >= s.nextSpawnAt) {
    const o = makeOrder(s, t);
    if (!o) break;
    s.orders.push(o); ev.push({ type: 'orderSpawn', order: o });
  }
}

function freeSlot(s, t) { s.nextSpawnAt = Math.max(s.nextSpawnAt, t + s.cfg.spawnDelayMs); }

// Paket yang deadline-nya LEWAT (< t) menjadi basi. deadline == t masih sah.
export function expireStale(s, t, ev) {
  for (let i = s.cargo.length - 1; i >= 0; i--) {
    const c = s.cargo[i];
    if (t <= c.deadline) continue;
    s.cargo.splice(i, 1);
    s.orders = s.orders.filter(o => o.id !== c.id);
    shrinkTail(s);
    applyPenalty(s);
    s.stale++; s.streak=0; s.failureLog.push({id:c.id,kind:c.kind||'standard',reason:'expired',at:t});s.failureLog=s.failureLog.slice(-8);
    freeSlot(s, t);
    ev.push({ type: 'stale', cargo: c });
  }
  if(s.cfg.mayhem)for(const order of [...s.orders])if(!order.picked&&t>order.deadline){
    s.orders=s.orders.filter(o=>o.id!==order.id);s.stale++;s.streak=0;applyPenalty(s);freeSlot(s,t);s.failureLog.push({id:order.id,kind:order.kind,reason:'pickup-expired',at:t});s.failureLog=s.failureLog.slice(-8);ev.push({type:'orderExpired',order});
  }

}

// Waktu berjalan tanpa gerakan (antar-langkah): paket basi + pengisian pesanan.
export function advanceTime(s, t, ev) {
  if (s.status !== 'playing') return;
  if(!Number.isFinite(t)||t<s.t)return;
  s.t = t;
  updateFeatures(s,t,ev);
  expireStale(s, t, ev);
  spawnOrders(s, t, ev);
  if(s.cfg.mayhem)for(const o of s.orders){const left=(o.deadline||Infinity)-t;if(left<=7000&&!s.warnings.has(o.id)){s.warnings.add(o.id);ev.push({type:'deadline',id:o.id});}}
}

export function stepSim(s, dirKey, t, options = {}) {
  const ev = [];
  if (s.status !== 'playing'||!Number.isFinite(t)||t<s.t) return ev;
  s.t = t;
  expireStale(s, t, ev);
  if(s.cfg.mayhem&&(dirKey==='W'||s.braking||t<s.delayUntil)){applyTraffic(s,t,ev);if(!options.planning)spawnOrders(s,t,ev);return ev;}
  let d = DIRS[dirKey] || s.dir;
  if(isOpposite(s.dir,d))d=s.dir;
  s.dir = { ...d };
  const head = s.snake[0], target = { x: head.x + d.x, y: head.y + d.y };
  const { arena, cfg } = s;
  if (target.x < 0 || target.y < 0 || target.x >= arena.w || target.y >= arena.h || arena.obstacle[idx(s, target)]) {
    s.status = 'lost'; s.reason = 'crash'; ev.push({ type: 'crash', cause: 'wall' }); return ev;
  }
  if(s.cfg.mayhem){const obstacle=cityBlocked(s,target,d,t);if(obstacle){ev.push({type:obstacle});applyTraffic(s,t,ev);return ev;}}
  const order = s.orders.find(o => !o.picked && sameCell(o.pickup, target));
  let growing = false;
  if (order) { if (cargoUnits(s)+(PACKAGE_KINDS[order.kind]?.size||1)<=cfg.capacity&&!s.cargo.some(c=>c.id===order.id)) growing = true; else ev.push({ type: 'pickupBlocked', order }); }
  if (bodyAfterMove(s.snake, growing).some(p => sameCell(p, target))) {
    s.status = 'lost'; s.reason = 'crash'; ev.push({ type: 'crash', cause: 'body' }); return ev;
  }
  s.snake.unshift(target);
  if (!growing) s.snake.pop();
  s.moveCount++;for(const c of s.cargo)c.steps=(c.steps||0)+1;
  if (growing) {
    order.picked = true;
    const lifeMs = order.lifeMs||Math.round(s.siteDist[order.type][idx(s, target)] * s.interval * cfg.margin + cfg.graceMs);
    const size=PACKAGE_KINDS[order.kind]?.size||1;
    const pkg = { id: order.id, type: order.type,kind:order.kind||'standard',size,integrity:100,remaining:order.stops?order.stops.slice():[order.type],steps:0,baseline:order.distance||s.siteDist[order.type][idx(s,target)],pickedAt:t,lifeMs,deadline:order.deadline??t+lifeMs };
    s.cargo.push(pkg);
    ev.push({ type: 'pickup', cargo: pkg });
  }
  const site = siteAt(s, target);
  if (site) {
    // Semua paket tujuan ini diantar bersamaan; bonus tetap dihitung per paket.
    const matching = s.cargo.filter(c => (c.remaining||[c.type]).includes(site));
    for (const c of matching) {
      if(s.cfg.mayhem){deliverMayhem(s,c,site,t,ev);continue;}
      const quick = lifeLeft(c, t) >= c.lifeMs * 0.5;
      s.cargo = s.cargo.filter(pkg => pkg.id !== c.id);
      s.orders = s.orders.filter(o => o.id !== c.id);
      shrinkTail(s);
      const pts = cfg.points + (quick ? cfg.quickBonus : 0);
      s.score += pts; s.delivered++;
      freeSlot(s, t);
      ev.push({ type: 'deliver', cargo: c, points: pts, quick, site });
    }
  }
  if(s.cfg.mayhem)applyTraffic(s,t,ev);
  if(s.cfg.mayhem&&s.delivered>=cfg.target){s.status='won';s.reason='target';finishBonuses(s);}
  if(!options.planning)spawnOrders(s,t,ev);
  return ev;
}

// Hasil akhir shift: menang bila target tercapai. Dipanggil pemanggil SETELAH semua langkah <= shiftMs diproses.
export function finishShift(s) {
  if (s.status !== 'playing') return s.status;
  s.status = s.delivered >= s.cfg.target ? 'won' : 'lost';
  s.reason = 'time';
  if(s.cfg.mayhem)finishBonuses(s);
  return s.status;
}

// Mayhem uses the same movement transaction above; these helpers extend orders,
// hazards and validation without another game loop or a different collision rule.
export function cloneState(s) {
 return {...s,snake:s.snake.map(p=>({...p})),dir:{...s.dir},cargo:s.cargo.map(c=>({...c,remaining:c.remaining?.slice()})),orders:s.orders.map(o=>({...o,pickup:o.pickup?{...o.pickup}:null,stops:o.stops?.slice()})),completed:s.completed.slice(),failureLog:s.failureLog.slice(),breakdown:{...s.breakdown},incidents:{...s.incidents},warnings:new Set(s.warnings),featureState:{...s.featureState}};
}
export function routeTo(s,target,options={}) {
 return findDeliveryRoute(s,target,{clone:cloneState,move:stepSim,interval:movementInterval,...options});
}
export function replayInputs(s,path) {for(const d of path){stepSim(s,d,s.t+movementInterval(s),{planning:true});if(s.status!=='playing')break;}return s;}
export function proveOrder(s,order) {
 const c=cloneState(s);c.braking=false;c.orders=c.orders.filter(o=>o.id!==order.id);c.orders.push({...order,deadline:Infinity,lifeMs:Infinity});
 const path=[],initialCompleted=new Set(c.completed.map(x=>x.id));let pickupAt=0,completedAt=0;
 // Validate the whole queue: a second pickup may grow the body on another
 // order's route, so individual static or isolated proofs are insufficient.
 for(let guard=0;guard<12;guard++){
  if(!c.orders.length)break;
  const pending=[...c.orders].sort((a,b)=>a.deadline-b.deadline)[0],cargo=c.cargo.find(x=>x.id===pending.id);
  const goal=cargo?(cargo.remaining||[cargo.type]).map(type=>c.arena.sites[type]).sort((a,b)=>routeDistance(c.arena,c.snake[0],a)-routeDistance(c.arena,c.snake[0],b))[0]:pending.pickup;
  const route=routeTo(c,goal,{maxNodes:1000});if(!route?.length)return null;
  for(const d of route){const ev=stepSim(c,d,c.t+movementInterval(c),{planning:true});path.push(d);if(ev.some(e=>e.type==='pickup'&&e.cargo.id===order.id))pickupAt=path.length;if(ev.some(e=>e.type==='deliver'&&e.cargo.id===order.id))completedAt=path.length;}
  if(c.status==='lost'||c.stale>s.stale)return null;
  if(c.status==='won')break;
 }
 if(!completedAt||c.cargo.some(x=>x.id===order.id)||!c.completed.some(x=>x.id===order.id&&!initialCompleted.has(x.id)))return null;
 // Reaching the target is sufficient; otherwise every queued order must fit.
 if(c.status!=='won'&&c.orders.length)return null;
 return {path,duration:c.t-s.t,steps:path.length,transportSteps:completedAt-pickupAt};
}
function makeMayhemOrder(s,t) {
 const pool=s.cfg.pool||['standard'],kind=pool[(s.nextId-1)%pool.length],rules=PACKAGE_KINDS[kind],head=s.snake[0],cells=[];
 const features=s.arena.features,taken=[...s.snake,...Object.values(s.arena.sites),...s.orders.filter(o=>!o.picked).map(o=>o.pickup),...features.gates,...features.blocks,...features.bumps,...features.lanes,...features.traffic.flatMap(c=>c.route)];
 for(let y=1;y<s.arena.h-1;y++)for(let x=1;x<s.arena.w-1;x++)if(!s.arena.obstacle[y*s.arena.w+x]&&!taken.some(p=>p.x===x&&p.y===y)&&Math.abs(head.x-x)+Math.abs(head.y-y)>=4)cells.push({x,y});
 for(let attempt=0;attempt<Math.min(12,cells.length);attempt++){
  const pickup=cells.splice(Math.floor(s.rng()*cells.length),1)[0],type=TYPE_IDS[Math.floor(s.rng()*3)],stops=kind==='multi'?[type,TYPE_IDS[(TYPE_IDS.indexOf(type)+1+Math.floor(s.rng()*2))%3]]:[type];
  const order={id:s.nextId,type,kind,pickup,picked:false,createdAt:t,stops};const proof=proveOrder(s,order);if(!proof)continue;
  if(t+proof.duration>s.cfg.shiftMs-500)continue;
  const lifeMs=Math.ceil(proof.duration*rules.margin+rules.grace);
  s.nextId++;return {...order,lifeMs,deadline:t+lifeMs,proof:{steps:proof.steps,duration:proof.duration},distance:proof.transportSteps,reward:rules.reward};
 }
 return null;
}
function updateFeatures(s,t,ev) {
 if(!s.cfg.mayhem)return;
 const f=s.arena.features,states=[...[...f.gates,...f.blocks].map(p=>({id:p.id,state:barrierState(p,t),kind:'gate'})),...f.traffic.map(car=>({id:car.id,state:trafficState(car,t).warning?'warning':'clear',kind:'traffic'}))];
 for(const item of states){const before=s.featureState[item.id];s.featureState[item.id]=item.state;if(before!==undefined&&before!==item.state&&['warning','closed'].includes(item.state))ev.push({type:'obstacle',id:item.id,kind:item.kind,state:item.state});}
}
function cityBlocked(s,target,d,t) {
 const f=s.arena.features;
 if(f.lanes.some(p=>sameCell(p,target)&&(p.dx!==d.x||p.dy!==d.y)))return 'laneBlocked';
 if([...f.gates,...f.blocks].some(p=>sameCell(p,target)&&barrierState(p,t)==='closed'&&!s.snake.some(body=>sameCell(body,p))))return 'gateBlocked';
 return null;
}
function applyPenalty(s) {
 const amount=Math.min(s.score,Math.max(0,s.cfg.stalePenalty));s.score-=amount;
 if(s.cfg.mayhem)s.breakdown.penalty=(s.breakdown.penalty||0)-amount;
}
function failCargo(s,c,t,reason,ev) {
 s.cargo=s.cargo.filter(x=>x.id!==c.id);s.orders=s.orders.filter(x=>x.id!==c.id);shrinkTail(s);s.stale++;s.streak=0;applyPenalty(s);freeSlot(s,t);
 s.failureLog.push({id:c.id,kind:c.kind,reason,at:t});s.failureLog=s.failureLog.slice(-8);ev.push({type:'cargoFailed',cargo:c,reason});
}
function applyTraffic(s,t,ev) {
 const f=s.arena.features,head=s.snake[0];
 const hits=[...f.bumps.filter(p=>sameCell(p,head)).map(p=>({id:'bump-'+idx(s,p),cell:p})),...f.traffic.map(car=>({...trafficState(car,t),id:car.id})).filter(c=>c.active&&s.snake.some(p=>sameCell(p,c.cell)))];
 for(const hit of hits) {
  if((s.incidents[hit.id]||0)>t)continue;s.incidents[hit.id]=t+2600;s.delayUntil=t+560;s.streak=0;ev.push({type:'impact',id:hit.id});
  for(const c of [...s.cargo])if(c.kind==='fragile'){c.integrity=Math.max(0,c.integrity-35);s.damaged++;ev.push({type:'cargoDamage',cargo:{...c}});if(c.integrity===0)failCargo(s,c,t,'damaged',ev);}
 }
}
export function scoreDelivery(c,t,streak=1) {
 if(!Number.isFinite(t)||!Number.isFinite(c.pickedAt)||t<c.pickedAt||!Number.isFinite(c.deadline)||t>c.deadline||!Number.isFinite(c.lifeMs)||c.lifeMs<=0)return {base:PACKAGE_KINDS[c.kind]?.reward||18,speed:0,integrity:0,efficiency:0,combo:0};
 const quick=(c.deadline-t)/c.lifeMs>=.45;
 return {base:PACKAGE_KINDS[c.kind]?.reward||18,speed:quick?(c.kind==='express'?12:5):0,integrity:c.kind==='fragile'?Math.round(c.integrity/10):0,efficiency:c.steps<=(c.baseline||0)+2?5:0,combo:Math.min(4,Math.max(0,streak-1))*3};
}
function deliverMayhem(s,c,site,t,ev) {
 if(!(c.remaining||[c.type]).includes(site))return;
 c.remaining=(c.remaining||[c.type]).filter(type=>type!==site);
 if(c.remaining.length){ev.push({type:'drop',cargo:{...c},site,left:c.remaining.length});return;}
 s.streak++;s.bestStreak=Math.max(s.bestStreak,s.streak);const breakdown=scoreDelivery(c,t,s.streak),points=Object.values(breakdown).reduce((n,v)=>n+v,0);
 for(const [key,value]of Object.entries(breakdown))s.breakdown[key]+=value;
 s.score+=points;s.delivered++;s.completed.push({id:c.id,kind:c.kind,integrity:c.integrity,points,at:t});s.cargo=s.cargo.filter(x=>x.id!==c.id);s.orders=s.orders.filter(o=>o.id!==c.id);shrinkTail(s);freeSlot(s,t);
 ev.push({type:'deliver',cargo:c,points,quick:breakdown.speed>0,site,streak:s.streak,perfect:c.integrity===100&&breakdown.speed>0});
}
export function finishBonuses(s) {
 if(s.finishApplied)return;s.finishApplied=true;
 const bonus=s.delivered>=s.cfg.target?(s.stale===0?15:0)+(s.bestStreak>=3?10:0):0;
 s.breakdown.objective=bonus;s.score+=bonus;
 s.rank=s.status==='won'?(s.stale===0&&s.damaged===0?'S':s.stale<=1?'A':'B'):'D';s.stars=s.status==='won'?(s.rank==='S'?3:s.rank==='A'?2:1):0;
}
