import { createRng } from '../sim/rng';
import { findPath, lineOfSight, distance } from './geometry';

export const ROUND_SHAPES = ['round', 'L', 'C', 'T', 'cavern', 'ruins'];
export const ROUND_VARIANT_SHAPES = [...ROUND_SHAPES, 'cavern', 'ruins'];
export const SHAPE_LABELS = { round: 'Bulat', L: 'L', C: 'C', T: 'T', cavern: 'Gua Abstrak', ruins: 'Reruntuhan' };
const centre = p => ({ x: p.x + .5, y: p.y + .5 });
const key = p => `${p.x},${p.y}`;
const neighbours = p => [[1,0],[-1,0],[0,1],[0,-1]].map(([x,y]) => ({ x: p.x + x, y: p.y + y }));
const manhattan = (a,b) => Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
function flood(map, start) {
  const seen = new Map([[key(start), 0]]), queue = [start];
  for (let i=0; i<queue.length; i++) for (const p of neighbours(queue[i])) {
    if (map[p.y]?.[p.x] === '.' && !seen.has(key(p))) { seen.set(key(p), seen.get(key(queue[i])) + 1); queue.push(p); }
  }
  return seen;
}
function shuffled(items, rng) {
  const result = items.slice();
  for (let i=result.length-1; i>0; i--) { const j=Math.floor(rng()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
function footprint(shape, x, y, variant) {
  if (shape === 'cavern') {
    const lobes = [[6,6,5.5,5], [12,6 + variant * 2,5,4.6], [8 + variant * 2,11,5.5,4.5]];
    return lobes.some(([cx,cy,rx,ry]) => ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1);
  }
  if (shape === 'ruins') {
    const left = 1 + Math.floor((Math.sin(y*.72 + variant*4)+1)*1.7);
    const right = 17 - Math.floor((Math.cos(y*.55 + variant*3)+1)*1.5);
    return x >= left && x <= right && !(x > 11 && y < 4) && !(x < 7 && y > 12) && !(x > 13 && y > 10);
  }
  if (shape === 'round') return ((x-9)/8.5)**2 + ((y-8)/7.5)**2 <= 1;
  if (shape === 'L') return x <= 7 || y >= 10;
  if (shape === 'C') return x <= 6 || y <= 5 || y >= 11;
  return y <= 6 || (x >= 6 && x <= 12);
}
function rotate(x, y, turns) {
  if (turns === 1) return { x: 6-y, y: x };
  if (turns === 2) return { x: 4-x, y: 6-y };
  if (turns === 3) return { x: y, y: 4-x };
  return { x, y };
}

// Generation runs during build:campaign. Only variants with a successful temporal
// replay are shipped, so starting a round on a phone is just a small random choice.
export function generateRound(base, seed, shape) {
  if (!ROUND_SHAPES.includes(shape)) throw new RangeError('Bentuk denah tidak dikenal');
  const rng = createRng(seed), n = base.number, width = 19, height = 17, outline = rng();
  let map = Array.from({length:height}, (_,y) => Array.from({length:width}, (_,x) =>
    x>0 && y>0 && x<width-1 && y<height-1 && footprint(shape,x,y,outline) ? '.' : ' '));
  const originalFloor=[];
  for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) if(map[y][x]==='.') originalFloor.push({x,y});
  const candidates=[];
  for(const p of originalFloor) for(let turns=0;turns<4;turns++) candidates.push({...p,turns});
  let vault = null, outside = null;
  for (const candidate of shuffled(candidates,rng)) {
    const at=(x,y)=>{const p=rotate(x,y,candidate.turns);return {x:p.x+candidate.x,y:p.y+candidate.y};};
    const cells=[];
    for(let y=0;y<7;y++) for(let x=0;x<5;x++) cells.push(at(x,y));
    if(!cells.every(p=>map[p.y]?.[p.x]==='.')) continue;
    const approach=at(2,-1), plate=at(-1,1);
    if(map[approach.y]?.[approach.x]!=='.' || (n>=20 && map[plate.y]?.[plate.x]!=='.')) continue;
    const test=map.map(r=>r.slice());
    for(const p of cells) test[p.y][p.x]='#';
    const reachable=flood(test,approach), exterior=originalFloor.length-cells.length;
    if(reachable.size<70 || reachable.size!==exterior) continue;
    vault={at,cells,approach,plate}; outside=reachable; break;
  }
  if(!vault) return null;
  const {at,approach,plate}=vault;
  for(let y=0;y<7;y++) for(let x=0;x<5;x++) {
    const p=at(x,y), wall=x===0||x===4||y===0||y===6||(n>=16&&y===2);
    map[p.y][p.x]=wall?'#':'.';
  }
  const door=at(2,0), seal=at(2,2), shortcut=at(0,1);
  map[door.y][door.x]='.';
  if(n>=16)map[seal.y][seal.x]='.';
  if(n>=20)map[shortcut.y][shortcut.x]='.';
  const exterior=originalFloor.filter(p=>outside.has(key(p)));
  const used=new Set([key(approach),key(plate)]);
  // Cover never disconnects the exterior or the approaches to either vault entrance.
  const coverCount=n<4?3:5+Math.floor(n/12); let cover=0;
  for(const p of shuffled(exterior,rng)) {
    if(cover>=coverCount)break;
    if(manhattan(p,approach)<2 || manhattan(p,plate)<2)continue;
    map[p.y][p.x]='C';
    const test=map.map(r=>r.slice());test[door.y][door.x]='#';if(n>=20)test[shortcut.y][shortcut.x]='#';
    const open=flood(test,approach);
    if(open.size!==outside.size-cover-1) {map[p.y][p.x]='.';continue;}
    cover++;
  }
  const available=exterior.filter(p=>map[p.y][p.x]==='.');
  function pick(filter=()=>true) {
    const options=available.filter(p=>!used.has(key(p))&&filter(p));
    if(!options.length)return null;
    const p=options[Math.floor(rng()*options.length)];used.add(key(p));return p;
  }
  const spawn=pick(p=>outside.get(key(p))>=Math.max(...outside.values())*.65);
  if(!spawn)return null;
  const spawnCentre=centre(spawn), exit={...spawnCentre};
  const lock=n>=4, machinery=n>=16;
  const keyPoint=lock?pick(p=>manhattan(p,spawn)>3):null;
  const leverPoint=machinery?pick(p=>manhattan(p,spawn)>3&&(!keyPoint||manhattan(p,keyPoint)>3)):null;
  if((lock&&!keyPoint)||(machinery&&!leverPoint))return null;
  const doors=lock?[{id:'vault',...centre(door),kind:'key',key:'a'}]:[];
  if(machinery)doors.push({id:'seal',...centre(seal),kind:'lever',label:'A'});
  if(n>=20)doors.push({id:'shortcut',...centre(shortcut),kind:'plate',label:'P'});
  const keys=keyPoint?[{id:'key-a',...centre(keyPoint),key:'a',kind:'key'}]:[];
  const levers=leverPoint?[{id:'lever-a',...centre(leverPoint),label:'A',doors:['seal']}]:[];
  const plates=n>=20?[{id:'plate-a',...centre(plate),door:'shortcut',duration:n===37?10:7}]:[];
  const artifacts=[{id:'relic-a',...centre(at(2,4)),kind:'artifact'}];
  if(n>=46){const p=pick(q=>manhattan(q,spawn)>5);if(!p)return null;artifacts.push({id:'relic-b',...centre(p),kind:'artifact'});}
  const loot=[];
  for(let i=0;i<(n>=35?8:n>=10?6:4);i++){const p=pick(q=>manhattan(q,spawn)>2);if(!p)return null;loot.push({id:`loot-${i}`,...centre(p),kind:'loot',value:5});}
  const hides=[];
  for(let i=0;i<3;i++){const p=pick();if(!p)return null;hides.push({id:`hide-${i}`,...centre(p)});}
  const shadows=[...hides.map(h=>({...h,radius:1.1})),{...spawnCentre,radius:1.1}];
  const guards=[];
  for(let i=0;i<base.guards.length;i++) {
    const a=pick(p=>manhattan(p,spawn)>6 && guards.every(g=>manhattan(centre(p),g)>3));
    if(!a)return null;
    const reach=flood(map,a);
    const b=pick(p=>manhattan(p,spawn)>5 && reach.get(key(p))>=2 && reach.get(key(p))<=5);
    if(!b)return null;
    const start=centre(a), end=centre(b);
    const next=findPath({level:{width,height,map,doors},opened:new Set()},start,end)?.[0];
    if(!next)return null;
    const fast=n>=20&&i===base.guards.length-1;
    guards.push({...base.guards[i],...start,route:[start,end],facing:Math.atan2(next.y-start.y,next.x-start.x),
      kind:fast?'runner':base.guards[i].kind,speed:base.guards[i].speed*(fast?1.18:1),
      range:n<6?2.8:3.2+Math.min(.5,n/100),pause:1.2+rng()*1.8,dwell:.8+rng()*.7});
  }
  const torches=[],crystals=[],bells=[],portals=[];
  if(n>=26){const p=pick();if(!p)return null;torches.push({...centre(p),range:3.4,fov:Math.PI*2,facing:0});}
  if(n>=27){const p=pick(q=>manhattan(q,spawn)>6);if(!p)return null;const facing=rng()*Math.PI*2;crystals.push({id:'eye-a',...centre(p),range:3.6,fov:.75,facing,baseFacing:facing,rate:.4,phase:rng()*Math.PI*2,sweep:1});}
  if(n>=21){const p=pick();if(!p)return null;bells.push(centre(p));}
  if(n>=40)for(let i=0;i<2;i++){const p=pick();if(!p)return null;portals.push({id:`portal-${i}`,...centre(p),pair:`portal-${1-i}`,label:'I'});}
  const beasts=[],dogs=[],hazards=[];
  if(n>=30) {
    const lanes=[];
    for(const origin of available.filter(p=>!used.has(key(p))&&manhattan(p,spawn)>6))for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const back=map[origin.y-dy]?.[origin.x-dx];
      if(back==='.'||back==='C')continue;
      let length=0;
      while(length<6&&map[origin.y+dy*(length+1)]?.[origin.x+dx*(length+1)]==='.'&&!doors.some(d=>d.x===origin.x+dx*(length+1)+.5&&d.y===origin.y+dy*(length+1)+.5))length++;
      if(length<3)continue;
      const escape=Array.from({length},(_,i)=>({x:origin.x+dx*(i+1),y:origin.y+dy*(i+1)})).filter(p=>map[p.y+dx]?.[p.x+dy]==='.'||map[p.y-dx]?.[p.x-dy]==='.');
      if(escape.length<2)continue;
      const across=Math.abs((spawn.x-origin.x)*dy-(spawn.y-origin.y)*dx),along=(spawn.x-origin.x)*dx+(spawn.y-origin.y)*dy;
      if(across<1&&along>=0&&along<=length)continue;
      lanes.push({id:'shadow-0',...centre(origin),dx,dy,length,speed:8,entrance:rng()<.5?'false-door':'wall'});
    }
    if(!lanes.length)return null;
    const beast=lanes[Math.floor(rng()*lanes.length)];beasts.push(beast);used.add(key({x:Math.floor(beast.x),y:Math.floor(beast.y)}));
  }
  let dogSafeArea=null;
  if(n>=35) {
    const geometry={level:{width,height,map,doors},opened:new Set(doors.map(d=>d.id)),smoke:[]};
    let safeMap=map.map(r=>r.slice());
    for(const d of doors)safeMap[Math.floor(d.y)][Math.floor(d.x)]='#';
    for(let i=0;i<2;i++) {
      let chosen=null;
      for(const a of shuffled(available.filter(p=>!used.has(key(p))&&Math.hypot(p.x-spawn.x,p.y-spawn.y)>6&&guards.every(g=>manhattan(centre(p),g)>2)),rng)) {
        const reach=flood(map,a);
        const options=i===0?[a]:shuffled(available.filter(p=>!used.has(key(p))&&manhattan(p,spawn)>6&&reach.get(key(p))>=2&&reach.get(key(p))<=4),rng).slice(0,8);
        for(const b of options) {
          const path=findPath({level:{width,height,map,doors},opened:new Set()},centre(a),centre(b));
          if(!path)continue;
          const poses=[centre(a),...path],test=safeMap.map(r=>r.slice());
          for(const p of available)if(poses.some(d=>distance(d,centre(p))<=5.2&&lineOfSight(geometry,d,centre(p),false)))test[p.y][p.x]='#';
          if(test[spawn.y][spawn.x]!=='.')continue;
          const safe=flood(test,spawn);
          if(!safe.has(key(approach))||safe.size<40)continue;
          chosen={a,b,test,safe};break;
        }
        if(chosen)break;
      }
      if(!chosen)return null;
      const {a,b,test,safe}=chosen;
      used.add(key(a));used.add(key(b));safeMap=test;dogSafeArea=safe;
      dogs.push({id:`dog-${i}`,...centre(a),route:[centre(a),centre(b)],facing:0,range:4.8,speed:4.8,tethered:i===0,leash:2.3});
    }
    // Reserve a connected route around both dogs' patrol zones. Never put a
    // required exterior pickup in an isolated safe pocket or under a chain.
    for(const object of [...keys,...levers,...loot,...artifacts]) {
      const cell=key({x:Math.floor(object.x),y:Math.floor(object.y)});
      if(outside.has(cell)&&!dogSafeArea.has(cell)) {
        const p=pick(q=>manhattan(q,spawn)>2&&dogSafeArea.has(key(q)));
        if(!p)return null;
        Object.assign(object,centre(p));
      }
    }
  }
  const trapCount=n>=35?5:n>=20?3:n>=8?1:0;
  for(let i=0;i<trapCount;i++) {
    const p=pick(q=>manhattan(q,spawn)>3&&neighbours(q).filter(t=>map[t.y]?.[t.x]==='.').length>=3);
    if(!p)return null;
    hazards.push({id:`spikes-${i}`,...centre(p),kind:'spikes',period:5.5,active:1.25,phase:rng()*5.5});
  }
  // Draw only the wall ring around actual rooms; distant void stays empty.
  const floor=map.map(r=>r.slice());
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(floor[y][x]===' ') {
    const adjacent=[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor[y+dy]?.[x+dx]==='.'));
    if(adjacent)map[y][x]='#';
  }
  return {...base,width,height,map:map.map(r=>r.join('')),spawn:spawnCentre,exit,keys,doors,levers,plates,artifacts,loot,hides,shadows,guards,torches,crystals,bells,portals,beasts,dogs,hazards,
    shape,shapeLabel:SHAPE_LABELS[shape],variantId:`${base.id}-${shape}-${seed>>>0}`,roundSeed:seed>>>0,
    par:n<6?120:n<16?180:n<36?240:300,
    tip:`Denah ${SHAPE_LABELS[shape]}; posisi berubah tiap ronde. ${base.tip}`,intro:base.tip};
}

export function chooseRound(base, variants, rng, previous) {
  if(!variants?.length)return base;
  // Change the footprint too, even if the RNG happens to repeat the same value.
  const choices=variants.filter(v=>v.shape!==previous?.shape);
  const pool=choices.length?choices:variants;
  return pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
}
