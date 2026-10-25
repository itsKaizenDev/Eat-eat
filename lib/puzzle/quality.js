import { findPath, distance, tileKey, lineOfSight, inVision } from './geometry';
// Topology scoring is deliberately separate from executable mission proofs.
// A high score never certifies timed gates, patrol safety, or combat fairness.
export function mapQuality(level) {
  const geo = { level, opened: new Set(level.doors.map(d => d.id)), gateTimers: {}, smoke: [], time: 0, crossed: new Set() };
  const floor = []; for (let y = 0; y < level.height; y++) for (let x = 0; x < level.width; x++) if (level.map[y][x] === '.') floor.push({ x: x + .5, y: y + .5 });
  const path = findPath(geo, level.spawn, level.artifacts[0]);
  const separation = path?.length ?? 0, minimum = level.number <= 5 ? 10 : Math.max(14, Math.ceil(Math.sqrt(floor.length) * 1.15));
  const points = [level.spawn, ...level.keys, ...level.levers, ...level.artifacts, level.exit], route = [], disconnected = [];
  for (let i = 1; i < points.length; i++) { const p = findPath(geo, points[i - 1], points[i]); if (!p) disconnected.push(i); else route.push(...p); }
  const purposes = [...route, ...level.loot, ...level.hides, ...level.portals, ...level.plates];
  const remote = floor.filter(p => purposes.every(q => distance(p, q) > 3)).length;
  const portalDistances = level.portals.map(p => findPath(geo, p, level.artifacts[0])?.length ?? 0);
  const errors = [...(level.beasts.some(b => distance(b, level.spawn) < 5.5) ? ['unsafe-beast-entry'] : []), ...(separation < minimum ? ['entry-too-close'] : []), ...(disconnected.length ? ['disconnected-objectives'] : []), ...(portalDistances.some(d => d < 8) ? ['portal-too-close'] : [])];
  const score = Math.round(Math.max(0, Math.min(100, 60 * Math.min(1, separation / (minimum * 1.5)) + 30 * (1 - remote / Math.max(1, floor.length)) + 10 * (portalDistances.every(d => d >= 8) ? 1 : 0))));
  return { score, errors, floor: floor.length, separation, minimum, remote, routeTiles: new Set(route.map(p => tileKey(p.x, p.y))).size, portalDistances };
}
export function entryCandidates(level, { security = true } = {}) {
  const geo = { level, opened: new Set(), gateTimers: {}, smoke: [], time: 0, crossed: new Set() };
  const open = { ...geo, opened: new Set(level.doors.map(d => d.id)) }, out = [];
  const props = [...level.keys, ...level.artifacts, ...level.levers, ...level.loot, ...level.hides, ...level.portals, ...level.plates, ...level.hazards];
  for (let y = 1; y < level.height - 1; y++) for (let x = 1; x < level.width - 1; x++) {
    if (level.map[y][x] !== '.') continue;
    const p = { x: x + .5, y: y + .5 };
    if (props.some(q => distance(p, q) < 1.4) || security && [...level.guards, ...level.dogs].some(g => distance(p, g) < 2.5) || level.crystals.some(g => inVision(geo, g, p))) continue;
    if (security && level.guards.some(g => inVision(geo, g, p)) || level.keys.some(k => !findPath(geo, p, k)) || !findPath(geo, level.spawn, p)) continue;
    if (level.beasts.some(b => distance(p, b.kind === 'mimic' ? b.mouth : b) < 5.5)) continue;
    const d = findPath(open, p, level.artifacts[0])?.length || 0;
    out.push({ ...p, distance: d });
  }
  return out.sort((a, b) => b.distance - a.distance || a.y - b.y || a.x - b.x);
}
