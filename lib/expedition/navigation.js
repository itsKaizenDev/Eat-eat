import { distance, fits, findPath, tileKey } from '../puzzle/geometry';

const atCamp = (p, camps) => camps.some(c => distance(p, c) < 1.5);
function occupied(s, e, p) {
  return s.enemies.some(other => other !== e && other.region === e.region && other.kind === 'mob' && other.stage !== 'dead' && distance(p, other) < .58);
}
function clearSegment(s, geo, e, from, to, camps) {
  const n = Math.max(1, Math.ceil(distance(from, to) / .15));
  for (let i = 1; i <= n; i++) {
    const p = { x: from.x + (to.x - from.x) * i / n, y: from.y + (to.y - from.y) * i / n };
    if (!fits(geo, p.x, p.y, .25) || atCamp(p, camps) || occupied(s, e, p)) return false;
  }
  return true;
}
function avoidTiles(s, e, camps, reservations) {
  const avoid = new Set(reservations);
  for (const c of camps) for (let y = Math.floor(c.y - 2); y <= c.y + 2; y++) for (let x = Math.floor(c.x - 2); x <= c.x + 2; x++) {
    if (distance({ x: x + .5, y: y + .5 }, c) < 1.8) avoid.add(`${x},${y}`);
  }
  for (const other of s.enemies) if (other !== e && other.region === e.region && other.kind === 'mob' && other.stage !== 'dead') avoid.add(tileKey(other.x, other.y));
  return avoid;
}
// Reserve the next waypoint before later actors plan. Waiting actors replan
// around bodies and camp boundaries instead of repeating a blocked step.
export function navigateMob(s, geo, e, goal, camps, reservations, dt) {
  if (distance(e, goal) < .15) return;
  const enclosing = camps.filter(c => distance(e, c) < 1.5);
  if (enclosing.length) {
    // A newly unlocked camp may surround an actor already standing there.
    // Let it leave monotonically; the exclusion zone must not imprison it.
    let best = null;
    for (let i = 0; i < 16; i++) {
      const a = Math.atan2(goal.y - e.y, goal.x - e.x) + i * Math.PI / 8;
      const p = { x: e.x + Math.cos(a) * 1.45 * dt, y: e.y + Math.sin(a) * 1.45 * dt };
      if (!fits(geo, p.x, p.y, .25) || occupied(s, e, p) || enclosing.some(c => distance(p, c) <= distance(e, c) + .00001)) continue;
      const score = enclosing.reduce((n, c) => n + distance(p, c), 0) - distance(p, goal) * .1;
      if (!best || score > best.score) best = { ...p, score };
    }
    if (best && !reservations.has(tileKey(best.x, best.y))) { e.facing = Math.atan2(best.y - e.y, best.x - e.x); e.x = best.x; e.y = best.y; reservations.add(tileKey(e.x, e.y)); }
    return;
  }
  let target = goal;
  if (!clearSegment(s, geo, e, e, goal, camps) || reservations.has(tileKey(goal.x, goal.y))) {
    const avoid = avoidTiles(s, e, camps, reservations), key = tileKey(goal.x, goal.y);
    while (e.path?.length && distance(e, e.path[0]) < .12) e.path.shift();
    if (!e.path?.length || e.pathGoal !== key || s.time >= (e.pathAt || 0) || avoid.has(tileKey(e.path[0].x, e.path[0].y))) {
      e.path = findPath(geo, e, goal, avoid) || []; e.pathGoal = key; e.pathAt = s.time + .4;
    }
    target = e.path[0];
    if (!target) return;
  } else e.path = [];
  const key = tileKey(target.x, target.y);
  if (reservations.has(key)) return;
  reservations.add(key);
  const d = distance(e, target), step = Math.min(d, 1.45 * dt);
  const next = { x: e.x + (target.x - e.x) / d * step, y: e.y + (target.y - e.y) / d * step };
  if (fits(geo, next.x, next.y, .25) && !atCamp(next, camps) && !occupied(s, e, next)) {
    e.facing = Math.atan2(next.y - e.y, next.x - e.x); e.x = next.x; e.y = next.y;
  } else e.pathAt = 0;
}
