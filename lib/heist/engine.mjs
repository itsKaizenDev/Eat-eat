/** Dungeon Heist v2. Deterministic turn-based stealth: no random enemy moves. */
export const VECTORS = { U: [0,-1], D: [0,1], L: [-1,0], R: [1,0] };
const posKey = (p) => `${p.x},${p.y}`;
const eq = (a,b) => a.x === b.x && a.y === b.y;
const manhattan = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const shifted = (p,d) => ({x:p.x+VECTORS[d][0], y:p.y+VECTORS[d][1]});

export function parseMission(spec) {
  if (!spec || !Array.isArray(spec.map) || !spec.map.length) throw new Error('Peta kosong');
  const height = spec.map.length, width = spec.map[0].length;
  if (spec.map.some(row => row.length !== width)) throw new Error(`Panjang baris tidak sama: ${spec.id}`);
  const tiles = spec.map.map(row => [...row]);
  const things = { player: null, exit: null, loot: [], bonus: [], key: [], switch: [], decoy: [], guards: {} };
  const mark = { P:'player', E:'exit', L:'loot', o:'bonus', K:'key', S:'switch', T:'decoy' };
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const ch = tiles[y][x];
    if (mark[ch]) {
      if (ch === 'P' || ch === 'E') {
        if (things[mark[ch]]) throw new Error(`Duplikat ${ch}: ${spec.id}`);
        things[mark[ch]] = {x,y};
      } else things[mark[ch]].push({x,y});
      tiles[y][x] = '.';
    } else if (/[1-9]/.test(ch)) {
      if(things.guards[ch]) throw new Error(`Penjaga duplikat: ${spec.id}`);
      things.guards[ch] = {x,y}; tiles[y][x]='.';
    } else if (!'#.HDG'.includes(ch)) throw new Error(`Karakter ${ch} tidak dikenal: ${spec.id}`);
  }
  if(!things.player || !things.exit || !things.loot.length) throw new Error(`Harus ada P, E dan minimal satu L: ${spec.id}`);
  const guards = (spec.guards || []).map((g,i) => {
    const spawn = things.guards[String(i+1)];
    if (!spawn) throw new Error(`Spawn penjaga ${i+1} tidak ada: ${spec.id}`);
    const trail = [{...spawn}]; let here = spawn;
    for(const dir of (g.route || '')) {
      if(!VECTORS[dir]) throw new Error(`Rute tidak valid: ${spec.id}`);
      here = shifted(here,dir);
      if(!tiles[here.y]?.[here.x] || tiles[here.y][here.x] === '#' || tiles[here.y][here.x] === 'D' || tiles[here.y][here.x] === 'G') throw new Error(`Patroli menembus dinding: ${spec.id}`);
      trail.push(here);
    }
    if(trail.length > 1 && !eq(trail.at(-1),spawn)) throw new Error(`Patroli harus kembali ke titik awal: ${spec.id}`);
    if(trail.length > 1) trail.pop();
    return {id:i, start:spawn, trail, dir:g.dir || 'D', range:g.range || 3, interval:g.interval || 2, rotate:!!g.rotate};
  });
  if (Object.keys(things.guards).length !== guards.length) throw new Error(`Penjaga tanpa konfigurasi: ${spec.id}`);
  const goalCount = things.loot.length;
  return { ...spec, width, height, tiles, things, guards, goalCount };
}
export function initialState(mission) {
  return {
    player:{...mission.things.player}, facing:'R', turns:0, status:'playing', message:'Cari harta utama. Jangan masuk area penglihatan penjaga.',
    loot:[], bonus:[], keys:[], switches:[], collectedDecoys:[], decoys:0, caught:0, exposure:0,
    noise:null, noiseTTL:0,
    guards:mission.guards.map(g => ({pos:{...g.start}, index:0, dir:g.dir, alert:false})),
  };
}
function has(arr,pos) { return arr.includes(posKey(pos)); }
export function tileAt(m,p) { return m.tiles[p.y]?.[p.x] ?? '#'; }
export function passable(m,s,p) {
  const c=tileAt(m,p);
  return c !== '#' && (c !== 'D' || !!s.keys.length) && (c !== 'G' || !!s.switches.length);
}
function collect(s,list,where) {
  const item = list.findIndex(p=>eq(p,where));
  return item >= 0 && !has(s,where);
}
function lineClear(m,s,a,b) {
  // Supercover approximation: inspect every tile intersecting center-to-center ray.
  const dx=b.x-a.x, dy=b.y-a.y, count=Math.max(Math.abs(dx),Math.abs(dy))*4;
  for(let i=1;i<count;i++) {
    const t=i/count, p={x:Math.round(a.x+dx*t),y:Math.round(a.y+dy*t)};
    if(['#','D','G'].includes(tileAt(m,p)) && !passable(m,s,p)) return false;
  }
  return true;
}
export function sees(m,s,guard,pos) {
  if(tileAt(m,pos)==='H') return false;
  const dx=pos.x-guard.pos.x,dy=pos.y-guard.pos.y;
  if(dx===0&&dy===0) return true;
  const length=Math.abs(dx)+Math.abs(dy), range=m.guards[guard.id]?.range || 3;
  if(length>range) return false;
  const vector=VECTORS[guard.dir], forward=dx*vector[0]+dy*vector[1];
  const lateral=Math.abs(dx*vector[1]-dy*vector[0]);
  if(forward<=0 || lateral>Math.floor(forward/2)+0.5) return false;
  return lineClear(m,s,guard.pos,pos);
}
export function visibleCells(m,s,guard) {
  const list=[];
  for(let y=0;y<m.height;y++) for(let x=0;x<m.width;x++) {
    const cell={x,y}; if(tileAt(m,cell)!=='#' && sees(m,s,guard,cell)) list.push(cell);
  }
  return list;
}
function toward(m,s,start,goal,blocked) {
  if(eq(start,goal)) return null;
  const seen=new Set([posKey(start)]), queue=[{p:start,first:null}];
  for(let i=0;i<queue.length;i++) {
    const {p,first}=queue[i];
    for(const dir of ['U','L','D','R']) {
      const q=shifted(p,dir), k=posKey(q);
      if(seen.has(k) || !passable(m,s,q) || blocked.has(k)) continue;
      if(eq(q,goal)) return first || dir;
      seen.add(k);queue.push({p:q,first:first||dir});
    }
  }
  return null;
}
export function step(m,old,action) {
  if(old.status!=='playing') return {moved:false,state:old,reason:'Sesi sudah selesai'};
  if(action !== 'W' && action !== 'Q' && !VECTORS[action]) return {moved:false,state:old,reason:'Arah tidak dikenal'};
  const s={...old, player:{...old.player}, loot:[...old.loot],bonus:[...old.bonus],keys:[...old.keys],switches:[...old.switches],collectedDecoys:[...old.collectedDecoys],guards:old.guards.map(g=>({...g,pos:{...g.pos}})), message:''};
  let next={...old.player};
  if(VECTORS[action]) {
    next=shifted(old.player,action);
    if(!passable(m,s,next)) return {moved:false,state:old,reason:tileAt(m,next)==='D'?'Pintu butuh kunci.':tileAt(m,next)==='G'?'Gerbang butuh sakelar.':'Ada dinding.'};
    if(s.guards.some(g=>eq(g.pos,next))) return {moved:false,state:old,reason:'Penjaga menghalangi jalan.'};
    s.player=next;s.facing=action;
  }
  if(action==='Q') {
    if(s.decoys<=0) return {moved:false,state:old,reason:'Belum punya batu pengalih perhatian.'};
    let p={...s.player};
    for(let i=0;i<3;i++) { const n=shifted(p,s.facing); if(!passable(m,s,n)) break; p=n; }
    if(eq(p,s.player)) return {moved:false,state:old,reason:'Tidak bisa melempar ke tembok.'};
    s.decoys--;s.noise=p;s.noiseTTL=4;s.message='Batu dilempar! Penjaga terdekat menyelidiki suara.';
  }
  s.turns++;
  if(collect(s.loot,m.things.loot,next)) {s.loot.push(posKey(next));s.message='Artefak berhasil diambil!';}
  if(collect(s.bonus,m.things.bonus,next)) {s.bonus.push(posKey(next));s.message='Harta bonus ditemukan.';}
  if(collect(s.keys,m.things.key,next)) {s.keys.push(posKey(next));s.message='Kunci didapat. Pintu kayu sekarang terbuka.';}
  if(collect(s.switches,m.things.switch,next)) {s.switches.push(posKey(next));s.message='Sakelar aktif! Gerbang terbuka.';}
  if(collect(s.collectedDecoys,m.things.decoy,next)) {s.collectedDecoys.push(posKey(next));s.decoys++;s.message='Batu pengalih perhatian +1. Tekan Q untuk melempar.';}
  if(eq(next,m.things.exit)) {
    if(s.loot.length===m.goalCount) {s.status='won';s.message='Misi berhasil! Semua artefak utama diamankan.';return {moved:true,state:s};}
    s.message=`Kumpulkan artefak dulu (${s.loot.length}/${m.goalCount}).`;
  }
  // All movement and patrol are atomic per turn. Player always moves first.
  const reserved=new Set();
  s.guards=s.guards.map((g,i)=>{
    const def=m.guards[i]; let pos={...g.pos},dir=g.dir,index=g.index;
    const investigate=!!s.noise && manhattan(pos,s.noise)<=6;
    if(s.turns%def.interval===0) {
      if(investigate && !eq(pos,s.noise)) {
        const blocked=new Set([...reserved,...s.guards.filter(other=>other!==g).map(other=>posKey(other.pos))]);
        const d=toward(m,s,pos,s.noise,blocked);
        if(d) {const n=shifted(pos,d);if(!reserved.has(posKey(n))) {pos=n;dir=d;}}
      } else if(def.trail.length>1) {
        // Move toward the NEXT waypoint, never jump to it. Necessary after decoys
        // or when the player temporarily blocks the patrol corridor.
        const targetIndex=(index+1)%def.trail.length;
        const target=def.trail[targetIndex];
        const blocked=new Set([...reserved,...s.guards.filter(other=>other!==g).map(other=>posKey(other.pos))]);
        const d=toward(m,s,pos,target,blocked);
        if(d) {
          const n=shifted(pos,d);
          if(!reserved.has(posKey(n))) {pos=n;dir=d;}
        }
        if(eq(pos,target)) index=targetIndex;
      } else if(def.trail.length===1) {
        // Stationary sentries can scan 4 directions, if configured.
        if(def.rotate) dir={U:'R',R:'D',D:'L',L:'U'}[dir];
      }
    }
    reserved.add(posKey(pos));return {...g,pos,dir,index,alert:investigate};
  });
  if(s.noiseTTL>0) {s.noiseTTL--;if(s.noiseTTL===0)s.noise=null;}
  const touching=s.guards.some(g=>eq(g.pos,s.player));
  const detected=s.guards.some(g=>sees(m,s,g,s.player));
  s.exposure=detected?old.exposure+1:0;
  s.caught=old.caught+(detected && !old.exposure ? 1:0);
  if(touching || s.exposure>=2) {s.status='lost';s.message='Tertangkap penjaga! Coba cari rute lain atau bersembunyi.';}
  else if(detected) s.message='TERLIHAT! Kamu punya satu giliran untuk keluar dari pandangan.';
  else if(!s.message) s.message=tileAt(m,s.player)==='H'?'Aman dalam persembunyian.':'Tetap waspada. Pelajari pola patroli.';
  return {moved:true,state:s};
}
export function grade(m,s) {
  if(s.status!=='won') return 0;
  return (s.caught===0?1:0) + (s.bonus.length===m.things.bonus.length?1:0) + (s.turns <= (m.par || 30) ?1:0);
}
/** BFS feasibility check, without decoys: ensures every included mission has a valid route. */
export function findSolution(m, limit=180000) {
  const first=initialState(m), queue=[{s:first,path:''}],visited=new Set();
  const encode=s=>[posKey(s.player),s.turns%12,s.loot.join('|'),s.keys.join('|'),s.switches.join('|'),s.exposure,s.guards.map(g=>posKey(g.pos)+g.index+g.dir).join(';')].join('/');
  visited.add(encode(first));
  for(let i=0;i<queue.length && i<limit;i++) {
    const {s,path}=queue[i];
    for(const a of ['U','D','L','R','W']) {
      const r=step(m,s,a);if(!r.moved||r.state.status==='lost')continue;
      if(r.state.status==='won')return path+a;
      const k=encode(r.state);if(visited.has(k))continue;
      visited.add(k);queue.push({s:r.state,path:path+a});
    }
  }
  return null;
}
