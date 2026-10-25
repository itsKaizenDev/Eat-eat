import { compactLevel } from './layout';
import { createRng } from '../sim/rng';
import { levelPlan } from './generator';
import { beastTiles } from './threats';
import { distance, findPath, lineOfSight, inVision, rayDistance, tileKey } from './geometry';
const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const key = p => tileKey(p.x, p.y);
const near = p => dirs.map(([x, y]) => ({ x: p.x + x, y: p.y + y }));
const minDistance = (p, list) => list.length ? Math.min(...list.map(q => distance(p, q))) : Infinity;
const copy = value => JSON.parse(JSON.stringify(value));

// Shared by the bank builder and future generation. A failed placement is rejected,
// never silently shipped with a missing unlocked monster.
export function arrangeRound(input, attempt = 0, diagnostics = null, { keepSecurity = false, keepMonsters = false } = {}) {
  const L = copy(compactLevel(input)), rng = createRng((L.roundSeed ^ 0x713ab591 ^ attempt * 7919) >>> 0);
  const geo = { level: L, opened: new Set(), smoke: [] };
  const fail = reason => { if (diagnostics) diagnostics.reason = reason; return null; };
  const floor = p => L.map[Math.floor(p.y)]?.[Math.floor(p.x)] === '.';
  const degree = p => near(p).filter(floor).length;
  const doorTiles = new Set(L.doors.map(key));
  const queue = [L.spawn], reached = new Set([key(L.spawn)]);
  for (let i = 0; i < queue.length; i++) for (const p of near(queue[i])) if (floor(p) && !doorTiles.has(key(p)) && !reached.has(key(p))) { reached.add(key(p)); queue.push(p); }
  // Degree alone mistakes a harmless wall-side alcove for a chokepoint. Find
  // real articulation cells: a sentry must not disconnect the reachable floor.
  const cut = new Set(), entered = new Map(), low = new Map(); let clock = 0;
  function visit(p, parent = null) {
    const k = key(p); entered.set(k, ++clock); low.set(k, clock); let children = 0;
    for (const q of near(p)) if (reached.has(key(q))) {
      const t = key(q); if (t === parent) continue;
      if (!entered.has(t)) { children++; visit(q,k); low.set(k,Math.min(low.get(k),low.get(t))); if (parent !== null && low.get(t) >= entered.get(k)) cut.add(k); }
      else low.set(k,Math.min(low.get(k),entered.get(t)));
    }
    if (parent === null && children > 1) cut.add(k);
  }
  visit(L.spawn);
  const props = [L.spawn, ...L.keys, ...L.levers, ...L.artifacts, ...L.loot, ...L.hides, ...L.plates, ...L.doors, ...L.portals, ...L.crystals, ...L.torches, ...L.bells, ...L.hazards];
  const important = [L.spawn, ...L.keys, ...L.levers, ...L.artifacts, ...L.doors, ...L.plates, ...L.portals];
  const occupied = [];
  const wide = queue.filter(p => degree(p) >= 3 && minDistance(p, props) >= .95);
  const required = [...props.filter(p => reached.has(key(p))), ...L.guards.flatMap(g => g.route), ...L.dogs.flatMap(d => d.route)];
  function severs(p) {
    if (!cut.has(key(p))) return false;
    const q = [L.spawn], seen = new Set([key(L.spawn)]), blocked = key(p);
    for (let i=0;i<q.length;i++) for (const t of near(q[i])) if (key(t)!==blocked && reached.has(key(t)) && !seen.has(key(t))) {seen.add(key(t));q.push(t);}
    return required.some(t => key(t)!==blocked && reached.has(key(t)) && !seen.has(key(t)));
  }
  const posts = queue.filter(p => degree(p) >= 1 && minDistance(p,props) >= .95 && !severs(p));
  // Keep the original guarded target and sector. Shift posts off chokepoints,
  // and put patrol endpoints in rooms rather than on their narrow thresholds.
  for (const g of keepSecurity ? [] : L.guards) {
    if (g.watch) {
      const aim = g.watch[0], range = Math.min(2.6, Math.max(.5, rayDistance(geo, g, aim, 2.6, false) - .15));
      const target = { x: g.x + Math.cos(aim) * range, y: g.y + Math.sin(aim) * range };
      const targets = [target, ...(g.role === 'relic' ? [...L.artifacts, ...L.doors.filter(d => d.id === 'vault')] : [...L.keys, ...L.levers, ...(L.transitions || [])]).filter(p => distance(p,g) < 7)];
      const options = targets.flatMap((focus, index) => posts.filter(p => distance(p, g) <= (attempt < 4 ? 4.2 : 7) && minDistance(p, occupied) >= 1.4 && distance(p, L.spawn) > (L.number < 6 ? 3 : 5) && distance(p, focus) >= 1 && distance(p, focus) <= g.range + .8 && lineOfSight(geo, p, focus, false))
        .map(p => ({ p, a: Math.atan2(focus.y - p.y, focus.x - p.x), score: distance(p, g) + index * .8 + rng() * Math.min(2, attempt * .16) })));
      const pick = options.filter(o => !inVision(geo, { ...g, ...o.p, facing: o.a }, L.spawn)).sort((a, b) => a.score - b.score)[0];
      if (!pick) return fail('post-' + g.role);
      Object.assign(g, pick.p, { post: { ...pick.p }, home: { ...pick.p }, facing: pick.a, watch: [pick.a, pick.a + (g.watch[1] - aim)] });
      g.route = [{ ...pick.p }]; occupied.push(pick.p);
    } else {
      const stops = [];
      for (const original of g.route) {
        const options = wide.filter(p => distance(p, original) <= (attempt < 4 ? 3.2 : attempt < 10 ? 7 : 30) && minDistance(p, occupied) >= 1.2 && minDistance(p, stops) >= 2 && distance(p, L.spawn) > (L.number < 6 ? 3.5 : 5.5))
          .map(p => ({ p, score: distance(p, original) + rng() * Math.min(1.5, attempt * .12) })).sort((a, b) => a.score - b.score);
        const pick = options.find(o => !stops.length || findPath(geo, stops[0], o.p)?.length >= 2);
        if (!pick) return fail('patrol-' + g.role);
        stops.push({ ...pick.p });
      }
      Object.assign(g, stops[0], { route: stops, home: { ...stops[0] } });
      const next = findPath(geo, g, stops[1])?.[0]; if (!next) return fail('patrol-path');
      g.facing = Math.atan2(next.y - g.y, next.x - g.x); occupied.push(...stops);
      if (inVision(geo, g, L.spawn)) return fail('patrol-spawn');
    }
  }
  // Separate dog homes and human posts. Tethered dogs have an open pocket for
  // their leash, never a mandatory doorway occupied by a stationary dog.
  for (const d of keepSecurity ? [] : L.dogs) {
    const options = wide.filter(p => distance(p, d) <= (attempt < 4 ? 4 : 7) && minDistance(p, occupied) >= 1.6 && distance(p, L.spawn) > d.range + .3)
      .map(p => ({ p, score: distance(p, d) + rng() * Math.min(1, attempt * .1) })).sort((a, b) => a.score - b.score);
    const pick = options[0]; if (!pick) return fail('dog-home');
    Object.assign(d, pick.p);
    if (d.tethered) d.route = [{ ...pick.p }];
    else {
      const end = wide.filter(p => distance(p, pick.p) >= 3 && distance(p, d.route.at(-1)) <= 8 && minDistance(p, occupied) >= 1.3 && distance(p, L.spawn) > d.range + .3)
        .sort((a, b) => distance(a, d.route.at(-1)) - distance(b, d.route.at(-1))).find(p => findPath(geo, pick.p, p));
      if (!end) return fail('dog-route'); d.route = [{ ...pick.p }, { ...end }];
    }
    d.home = { ...pick.p }; occupied.push(pick.p);
  }
  const npcs = [...L.guards, ...L.dogs];
  if (keepSecurity) occupied.push(...npcs.flatMap(a => [a,...a.route]));
  const patrol = npcs.flatMap(a => [a, ...a.route, ...(a.route.length > 1 ? findPath(geo, a.route[0], a.route[1]) || [] : [])]);
  const openGeo = { ...geo, opened: new Set(L.doors.map(d => d.id)) };
  const mission = [L.spawn, ...L.keys, ...L.levers, ...L.artifacts, L.exit];
  const traffic = mission.flatMap((p, i) => i ? findPath(openGeo, mission[i - 1], p) || [] : [p]);
  const visibleNPC = p => minDistance(p, patrol.filter(q => lineOfSight(geo, p, q, false)));
  const trafficDistance = p => minDistance(p, traffic);
  const sameRoom = p => visibleNPC(p) <= 3;
  const safeHome = p => minDistance(p, props) >= 1.05 && distance(p, L.spawn) >= 5.5 && minDistance(p, occupied) >= 1.6;
  const bodies = [];
  const separate = p => bodies.every(b => distance(p, b) >= 3.5);
  const routeSurvives = forbidden => {
    const avoid = new Set(forbidden.map(key));
    return [L.spawn, ...L.keys, ...L.levers].every(p => findPath(geo, L.spawn, p, avoid) !== null);
  };
  const ranked = options => options.sort((a, b) => b.score - a.score);
  const select = options => { const list = ranked(options); return list[Math.min(list.length - 1, Math.floor(rng() * Math.min(4 + attempt, list.length)))] || null; };
  const beasts = [];
  for (const kind of levelPlan(L.number).monsters) {
    const prior = keepMonsters && L.beasts.find(b => b.kind === kind);
    if (prior && separate(prior) && sameRoom(prior.kind === 'mimic' ? prior.mouth : prior)) { beasts.push(prior); bodies.push(prior); continue; }
    if (kind === 'shadow') {
      const options = [];
      for (const p of queue.filter(p => safeHome(p) && separate(p) && sameRoom(p))) for (const [dx, dy] of dirs) {
        if (floor({ x: p.x - dx, y: p.y - dy }) || L.map[Math.floor(p.y - dy)]?.[Math.floor(p.x - dx)] === 'C') continue;
        let length = 0;
        while (length < 6 && floor({ x: p.x + dx * (length + 1), y: p.y + dy * (length + 1) }) && !doorTiles.has(key({ x: p.x + dx * (length + 1), y: p.y + dy * (length + 1) }))) length++;
        if (length < 3) continue;
        const lane = Array.from({ length: length + 1 }, (_, i) => ({ x: p.x + dx * i, y: p.y + dy * i }));
        const escape = lane.slice(1).filter(q => floor({ x: q.x + dy, y: q.y + dx }) || floor({ x: q.x - dy, y: q.y - dx })).length;
        if (escape < 2 || lane.some(q => minDistance(q, important) < .75)) continue;
        const use = Math.min(...lane.map(trafficDistance)); if (use > 3) continue;
        options.push({ data: { id: 'shadow-0', kind, ...p, dx, dy, length, speed: 8, windup: 1.2, entrance: rng() < .5 ? 'false-door' : 'wall' }, score: 12 - use * 2 - visibleNPC(p) + escape * .3 + rng() });
      }
      const pick = select(options); if (!pick) return fail('monster-shadow'); beasts.push(pick.data); bodies.push(pick.data);
    } else if (kind === 'mimic') {
      const options = [];
      // Existing crates first; a new edge crate is allowed only when it leaves
      // the mission connected and has the same usable floor area.
      const covers = [];
      for (let y = 1; y < L.height - 1; y++) for (let x = 1; x < L.width - 1; x++) if (L.map[y][x] === 'C' || L.map[y][x] === '.' && near({ x: x + .5, y: y + .5 }).some(q => L.map[Math.floor(q.y)]?.[Math.floor(q.x)] === '#')) covers.push({ x: x + .5, y: y + .5 });
      for (const p of covers.filter(p => safeHome(p) && separate(p))) for (const mouth of near(p).filter(q => floor(q) && reached.has(key(q)) && !doorTiles.has(key(q)))) {
        const npc = visibleNPC(mouth), use = trafficDistance(mouth);
        if (npc > 3 || minDistance(mouth, patrol) < 1.05 || minDistance(mouth, important) < 1.6 || use > 3 || !routeSurvives([p, mouth])) continue;
        options.push({ data: { id: 'mimic-0', kind, ...p, fx: mouth.x - p.x, fy: mouth.y - p.y, mouth, trigger: 1.5, reach: 1.15, windup: .9, recover: 2.2 }, score: 12 - use * 2 - npc + (L.map[Math.floor(p.y)][Math.floor(p.x)] === 'C' ? 1 : 0) + rng() });
      }
      const pick = select(options); if (!pick) return fail('monster-mimic');
      const b = pick.data, map = L.map.map(r => r.split('')); map[Math.floor(b.y)][Math.floor(b.x)] = 'C'; L.map = map.map(r => r.join(''));
      // A newly added crate cannot sever any existing patrol or gated objective.
      if (npcs.some(a => a.route.some(p => findPath(geo, a, p) === null)) || mission.some((p,i) => i && findPath(openGeo, mission[i-1], p) === null)) return fail('mimic-route');
      beasts.push(b); bodies.push(b);
    } else if (kind === 'spider') {
      const options = [];
      for (const p of queue.filter(p => floor(p) && safeHome(p) && separate(p) && degree(p) >= 3 && sameRoom(p))) {
        const use = trafficDistance(p), npc = minDistance(p, patrol);
        const webFloor = queue.filter(q => distance(p, q) <= 1.9 && lineOfSight(geo, p, q, false)).length;
        if (npc < 1.05 || minDistance(p, important) < 2.2 || use > 3 || webFloor < 6 || !routeSurvives(queue.filter(q => distance(p,q)<=1.9))) continue;
        options.push({ data: { id: 'spider-0', kind, ...p, web: 1.9, strike: .55, windup: 1.2, recover: 3 }, score: 12 - use * 2 - visibleNPC(p) + webFloor * .2 + rng() });
      }
      const pick = select(options); if (!pick) return fail('monster-spider'); beasts.push(pick.data); bodies.push(pick.data);
    }
  }
  const danger = new Set(beasts.flatMap(b => beastTiles({ ...b, home: {x:b.x,y:b.y}, ...(b.kind==='mimic'?{trigger:b.reach}:{}) })));
  const keyGeo = {...geo,opened:new Set(L.doors.filter(d=>d.kind==='key').map(d=>d.id))};
  if (L.keys.some(p=>findPath(geo,L.spawn,p,danger)===null) || L.levers.some(p=>findPath(keyGeo,L.spawn,p,danger)===null) || L.artifacts.some(p=>findPath(openGeo,L.spawn,p,danger)===null)) return fail('combined-monster-bypass');
  if (beasts.some(b => !sameRoom(b.kind === 'mimic' ? b.mouth : b))) return fail('inactive-monster-room');
  L.beasts = beasts; L.plan = levelPlan(L.number);
  L.metrics = { ...L.metrics, monsters: beasts.map(b => b.kind) };
  L.arranged = 1; L.polished = true;
  return L;
}
