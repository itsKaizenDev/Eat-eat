// Shared geometry for movement, navigation, perception and the visible cones.
export const TAU = Math.PI * 2;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const tileKey = (x, y) => `${Math.floor(x)},${Math.floor(y)}`;
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// Spider webs slow every creature inside the nest radius until the spider has struck and recovers.
export const WEB_SLOW = .55;
export function speedFactor(s, a) {
  return s.beasts?.some(b => b.kind === 'spider' && b.state !== 'RECOVER' && distance(a, b) <= b.web) ? WEB_SLOW : 1;
}
export function solid(s, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  const ch = s.level.map[y]?.[x];
  if (ch !== '.') return true;
  return s.level.doors.some(d => d.x === x + .5 && d.y === y + .5 && !s.opened.has(d.id));
}
export function fits(s, x, y, r = .23) {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) {
    for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
      if (!solid(s, tx, ty)) continue;
      const cx = Math.max(tx, Math.min(x, tx + 1)), cy = Math.max(ty, Math.min(y, ty + 1));
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r - 1e-9) return false;
    }
  }
  return true;
}
export function moveBody(s, body, dx, dy, r = .23) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / .15));
  for (let i = 0; i < n; i++) {
    if (fits(s, body.x + dx / n, body.y, r)) body.x += dx / n;
    if (fits(s, body.x, body.y + dy / n, r)) body.y += dy / n;
  }
}
// DDA stops at the exact tile edge. Smoke uses the exact ray/circle intersection.
export function rayDistance(s, from, angle, range, smoke = true) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let x = Math.floor(from.x), y = Math.floor(from.y);
  if (solid(s, x, y)) return 0;
  const sx = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1;
  const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy);
  let tx = (dx >= 0 ? x + 1 - from.x : from.x - x) * ddx;
  let ty = (dy >= 0 ? y + 1 - from.y : from.y - y) * ddy;
  let limit = range;
  for (let i = 0; i < s.level.width + s.level.height + 4; i++) {
    let t;
    if (tx < ty) { t = tx; tx += ddx; x += sx; } else { t = ty; ty += ddy; y += sy; }
    if (t > range) break;
    if (solid(s, x, y)) { limit = Math.max(0, t); break; }
  }
  if (smoke) for (const cloud of s.smoke) {
    const ox = from.x - cloud.x, oy = from.y - cloud.y;
    const c = ox * ox + oy * oy - cloud.radius ** 2;
    if (c < 0) { limit = 0; break; }
    const b = ox * dx + oy * dy, disc = b * b - c;
    if (disc >= 0) { const t = -b - Math.sqrt(disc); if (t >= 0) limit = Math.min(limit, t); }
  }
  return limit;
}
export function lineOfSight(s, from, to, smoke = true) {
  const d = distance(from, to);
  return d < .001 || rayDistance(s, from, Math.atan2(to.y - from.y, to.x - from.x), d, smoke) >= d - 1e-7;
}
export function inVision(s, observer, target) {
  return distance(observer, target) <= observer.range &&
    Math.abs(angleDelta(Math.atan2(target.y - observer.y, target.x - observer.x), observer.facing)) <= observer.fov / 2 &&
    lineOfSight(s, observer, target);
}
export function conePoints(s, observer, count = 48) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const a = observer.facing - observer.fov / 2 + observer.fov * i / count;
    const d = rayDistance(s, observer, a, observer.range);
    points.push({ x: observer.x + Math.cos(a) * d, y: observer.y + Math.sin(a) * d });
  }
  return points;
}
// Small authored rooms: BFS is optimal on the uniform-cost four-neighbour grid.
export function findPath(s, from, to, avoid = null) {
  const start = tileKey(from.x, from.y), end = tileKey(to.x, to.y);
  const q = [[Math.floor(from.x), Math.floor(from.y)]], prev = new Map([[start, null]]);
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i], key = `${x},${y}`;
    if (key === end) {
      const path = []; let k = end;
      while (k !== start) { const [px, py] = k.split(',').map(Number); path.push({ x: px + .5, y: py + .5 }); k = prev.get(k); }
      return path.reverse();
    }
    for (const [nx, ny] of [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]]) {
      const k = `${nx},${ny}`;
      if (!prev.has(k) && !solid(s, nx, ny) && (!avoid?.has(k) || k === end)) { prev.set(k, key); q.push([nx, ny]); }
    }
  }
  return null;
}
// Sound travels along open corridors; each closed door adds three tiles of attenuation.
// Solid stone/crates do not transmit it directly. Cost is calculated once per event.
export function soundField(s, source, radius) {
  const q = [{ x: Math.floor(source.x), y: Math.floor(source.y), cost: 0 }];
  const costs = new Map([[tileKey(source.x, source.y), 0]]);
  while (q.length) {
    q.sort((a, b) => a.cost - b.cost);
    const p = q.shift();
    for (const [x, y] of [[p.x + 1, p.y], [p.x - 1, p.y], [p.x, p.y + 1], [p.x, p.y - 1]]) {
      const ch = s.level.map[y]?.[x];
      if (ch !== '.') continue;
      const cost = p.cost + 1 + (solid(s, x, y) ? 3 : 0), k = `${x},${y}`;
      if (cost <= radius && (!costs.has(k) || cost < costs.get(k))) { costs.set(k, cost); q.push({ x, y, cost }); }
    }
  }
  return costs;
}
