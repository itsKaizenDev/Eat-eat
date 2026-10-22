import { distance, tileKey, solid, fits, moveBody, findPath } from './geometry';

export const living = actor => actor.alive !== false;
export const mobileActors = s => [...s.guards, ...s.dogs].filter(living);

// Idle guards face the next actual corridor segment, not a waypoint through a wall.
export function faceRoute(s, actor, target) {
  const next = target && findPath(s, actor, target)?.[0];
  if (next) actor.facing = Math.atan2(next.y - actor.y, next.x - actor.x);
}

export function navigate(s, actor, target, speed, dt, limit = null) {
  if (!target) return false;
  if (distance(actor, target) < .055) return true;
  const key = tileKey(target.x, target.y);
  if (actor.pathTarget !== key || s.time - actor.pathAt > .8 || actor.path.some(p => solid(s, p.x, p.y))) {
    const avoid = actor.blocked > .5 ? new Set(mobileActors(s).filter(h => h !== actor).map(h => tileKey(h.x, h.y))) : null;
    const path = findPath(s, actor, target, avoid);
    actor.path = path || []; actor.unreachable = path === null; actor.pathTarget = key; actor.pathAt = s.time;
    if (path?.length) {
      const center = { x: Math.floor(actor.x) + .5, y: Math.floor(actor.y) + .5 }, next = path[0];
      // Align only the axis perpendicular to this segment. Returning to the cell
      // centre on every replan would make a patrol oscillate instead of advance.
      const align = next.x === center.x ? { x: center.x, y: actor.y } : { x: actor.x, y: center.y };
      if (distance(actor, align) > .035) actor.path.unshift(align);
    }
  }
  if (actor.unreachable) return false;
  while (actor.path.length && distance(actor, actor.path[0]) < .035) actor.path.shift();
  const waypoint = actor.path[0] || target, d = distance(actor, waypoint);
  if (d < .001) return distance(actor, target) < .055;
  const amount = Math.min(d, speed * dt), dx = (waypoint.x - actor.x) / d * amount, dy = (waypoint.y - actor.y) / d * amount;
  const candidate = { x: actor.x + dx, y: actor.y + dy }, others = mobileActors(s).filter(h => h !== actor);
  const allowed = !limit || limit(candidate);
  const blocked = others.some(h => distance(h, candidate) < .44);
  const before = { x: actor.x, y: actor.y };
  if (allowed && !blocked) moveBody(s, actor, dx, dy, .21);
  else if (blocked && actor.blocked > .7 && others.some(h => h.id < actor.id && distance(h, actor) < .75)) {
    for (const [x, y] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const pocket = { x: actor.x + x * .5, y: actor.y + y * .5 };
      if ((!limit || limit(pocket)) && fits(s, pocket.x, pocket.y, .21) && !others.some(h => distance(h, pocket) < .5)) {
        moveBody(s, actor, x * amount, y * amount, .21); actor.pathAt = -9; break;
      }
    }
  }
  if (distance(before, actor) > .0001) {
    actor.facing = Math.atan2(actor.y - before.y, actor.x - before.x); actor.blocked = 0;
  } else actor.blocked += dt;
  return distance(actor, target) < .055;
}
