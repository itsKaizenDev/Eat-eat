import { distance, tileKey, solid, fits, moveBody, findPath, speedFactor } from './geometry';

export const living = actor => actor.alive !== false;
export const mobileActors = s => [...s.guards, ...s.dogs].filter(living);
const CLEARANCE = .54;
const pointKey = p => tileKey(p.x, p.y);
const adjacent = p => [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([x, y]) => ({ x: Math.floor(p.x) + x + .5, y: Math.floor(p.y) + y + .5 }));
const parked = (s, a) => a.stunnedUntil > s.time || a.state === 'PATROL' && (a.watch || a.tethered);
const rank = a => a.state === 'CHASE' ? 0 : a.state === 'INVESTIGATE' ? 1 : 2;
const first = (a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id);
const corridorCache = new WeakMap();

// A one-tile corridor gets one owner until it has cleared the passage. Wide rooms
// remain free to route around each other. Cache topology, never actor state.
function corridors(level) {
  if (corridorCache.has(level)) return corridorCache.get(level);
  const cells = new Map(), narrow = new Set();
  const open = (x, y) => level.map[y]?.[x] === '.';
  for (let y = 0; y < level.height; y++) for (let x = 0; x < level.width; x++) if (open(x, y) && [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length <= 2) narrow.add(`${x},${y}`);
  for (const k of narrow) if (!cells.has(k)) {
    const q = [k]; cells.set(k, k);
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i].split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const t = `${x + dx},${y + dy}`;
        if (narrow.has(t) && !cells.has(t)) { cells.set(t, k); q.push(t); }
      }
    }
  }
  corridorCache.set(level, cells); return cells;
}

export function faceRoute(s, actor, target) {
  const next = target && findPath(s, actor, target)?.[0];
  if (next) actor.facing = Math.atan2(next.y - actor.y, next.x - actor.x);
}
function alignPath(actor, path) {
  if (path?.length) {
    const center = { x: Math.floor(actor.x) + .5, y: Math.floor(actor.y) + .5 }, next = path[0];
    const align = next.x === center.x ? { x: center.x, y: actor.y } : { x: actor.x, y: center.y };
    if (distance(actor, align) > .035) path.unshift(align);
  }
  return path;
}
function constraints(s, actor, limit, crowd = []) {
  const avoid = new Set([...(actor.avoidTiles || []), ...crowd.map(pointKey)]);
  if (limit) for (let y = 0; y < s.level.height; y++) for (let x = 0; x < s.level.width; x++) if (!limit({ x: x + .5, y: y + .5 })) avoid.add(`${x},${y}`);
  return avoid;
}
function canMove(s, actor, candidate, others, limit) {
  return (!limit || limit(candidate)) && fits(s, candidate.x, candidate.y, .21) && others.every(a => distance(a, candidate) >= CLEARANCE || distance(a, candidate) > distance(a, actor) + 1e-6);
}
function move(s, actor, target, amount, others, limit) {
  const d = distance(actor, target); if (d < .001) return false;
  const step = Math.min(d, amount), dx = (target.x - actor.x) / d * step, dy = (target.y - actor.y) / d * step;
  const candidate = { x: actor.x + dx, y: actor.y + dy };
  if (!canMove(s, actor, candidate, others, limit)) return false;
  const before = { x: actor.x, y: actor.y }; moveBody(s, actor, dx, dy, .21);
  if (distance(before, actor) <= .0001) return false;
  actor.facing = Math.atan2(actor.y - before.y, actor.x - before.x); actor.blocked = 0; return true;
}
// Retreat to an actual passing pocket, outside the other NPC's route. Never
// shuffle randomly into the same corridor or teleport through an occupied tile.
function segmentGap(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy;
  const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d)) : 0;
  return distance(p, { x: a.x + dx * t, y: a.y + dy * t });
}
function yieldPath(s, actor, owner, others, limit) {
  const avoid = constraints(s, actor, limit, others), start = pointKey(actor), queue = [{ x: Math.floor(actor.x) + .5, y: Math.floor(actor.y) + .5, path: [] }], seen = new Set([start]);
  const through = new Set([pointKey(owner), ...(owner.path || []).map(pointKey), ...(owner.intent ? [pointKey(owner.intent)] : [])]);
  const options = [];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node.path.length && !through.has(pointKey(node)) && distance(owner, node) >= 1.25 && others.every(a => distance(a, node) >= .85)) {
      options.push(node); if (node.path.length >= 2) break;
    }
    if (node.path.length >= 12) continue;
    for (const p of adjacent(node)) if (!seen.has(pointKey(p)) && !solid(s, p.x, p.y) && !avoid.has(pointKey(p)) && (!limit || limit(p)) && others.every(a => segmentGap(a, node.path.length ? node : actor, p) >= CLEARANCE)) {
      seen.add(pointKey(p)); queue.push({ ...p, path: [...node.path, p] });
    }
  }
  const best = options.sort((a, b) => a.path.length - b.path.length)[0];
  return best?.path;
}
function yieldTo(s, actor, owner, others, limit) {
  if (actor.tethered && !limit) limit = p => distance(actor.home, p) <= actor.leash;
  if (actor.yielding?.owner === owner.id) return true;
  const path = yieldPath(s, actor, owner, others, limit);
  if (!path?.length) return false;
  actor.yielding = { owner: owner.id, path, until: s.time + 12 }; actor.pathAt = -9; return true;
}
function yielding(s, actor, others, amount, limit) {
  const y = actor.yielding; if (!y) return false;
  const owner = others.find(a => a.id === y.owner);
  while (y.path.length && distance(actor, y.path[0]) < .035) y.path.shift();
  if (!owner || y.until < s.time || !y.path.length && distance(owner, actor) > .8 && (!owner.intent || distance(owner, actor) > 1.4 && !(owner.path || []).slice(0, 3).some(p => distance(actor, p) < .8))) {
    actor.yielding = null; actor.pathAt = -9; return false;
  }
  actor.trafficWaiting = true;
  if (y.path.length) move(s, actor, y.path[0], amount, others, limit);
  return true;
}

export function navigate(s, actor, target, speed, dt, limit = null) {
  if (!target) return false;
  const others = mobileActors(s).filter(a => a !== actor), amount = speed * speedFactor(s, actor) * dt;
  actor.trafficWaiting = false;
  if (yielding(s, actor, others, amount, limit)) return false;
  if (distance(actor, target) < .055) { actor.intent = null; return true; }
  const key = pointKey(target);
  if (actor.pathTarget !== key || s.time - actor.pathAt > .8 || actor.path.some(p => solid(s, p.x, p.y) || actor.avoidTiles?.has(pointKey(p)))) {
    const crowd = others.filter(a => parked(s, a) || actor.blocked > .25 && !a.yielding);
    let path = findPath(s, actor, target, constraints(s, actor, limit, crowd));
    // Moving traffic may temporarily fill the only route: retain it and queue.
    if (path === null) path = findPath(s, actor, target, constraints(s, actor, limit));
    actor.path = alignPath(actor, path) || []; actor.unreachable = path === null; actor.pathTarget = key; actor.pathAt = s.time;
  }
  if (actor.unreachable) { actor.blocked += dt; return false; }
  while (actor.path.length && distance(actor, actor.path[0]) < .035) actor.path.shift();
  const waypoint = actor.path[0] || target; actor.intent = { ...waypoint };
  const zones = corridors(s.level), here = zones.get(pointKey(actor)), next = zones.get(pointKey(waypoint));
  s.traffic ||= {};
  if (here) s.traffic[here] = s.traffic[here]?.owner === actor.id ? { owner: actor.id, until: s.time + 1 } : s.traffic[here];
  let owner = null;
  if (next && next !== here) {
    const claim = s.traffic[next], incumbent = claim && claim.until > s.time && others.find(a => a.id === claim.owner);
    const inside = others.filter(a => zones.get(pointKey(a)) === next).sort(first);
    owner = incumbent || inside[0];
    if (!owner) s.traffic[next] = { owner: actor.id, until: s.time + 1 };
  }
  if (owner && owner !== actor) {
    actor.trafficWaiting = true;
    // Let the corridor owner exit into this room instead of blocking its mouth.
    if (distance(actor, owner) < 2 || owner.path?.slice(0, 3).some(p => distance(p, actor) < .8)) yieldTo(s, actor, owner, others, limit);
    return false;
  }
  if (move(s, actor, waypoint, amount, others, limit)) {
    const arrived = distance(actor, target) < .055;
    if (arrived) { actor.intent = null; actor.path = []; }
    return arrived;
  }
  // At a crowded bend, centring first can move toward the blocker even when
  // the next corridor segment leads safely away. Take that segment directly.
  if (actor.path.length > 1 && pointKey(actor.path[0]) === pointKey(actor) && move(s, actor, actor.path[1], amount, others, limit)) {
    actor.path.shift(); return false;
  }
  actor.blocked += dt;
  const d = distance(actor, waypoint), candidate = d ? { x: actor.x + (waypoint.x - actor.x) / d * Math.min(d, amount), y: actor.y + (waypoint.y - actor.y) / d * Math.min(d, amount) } : actor;
  const blocker = others.filter(a => distance(a, candidate) < CLEARANCE + .03).sort((a, b) => distance(a, actor) - distance(b, actor))[0];
  if (blocker) {
    actor.trafficWaiting = true;
    if (actor.blocked > .2) {
      if (!parked(s, actor) && (parked(s, blocker) || blocker.yielding?.owner === actor.id || first(actor, blocker) > 0)) {
        if (parked(s, blocker)) actor.pathAt = -9;
        else if (blocker.yielding?.owner !== actor.id) yieldTo(s, actor, blocker, others, limit);
      } else if (!parked(s, blocker) && !yieldTo(s, blocker, actor, mobileActors(s).filter(a => a !== blocker), null)) yieldTo(s, actor, blocker, others, limit);
    }
  }
  return false;
}
