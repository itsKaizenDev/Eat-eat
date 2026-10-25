import { compactLevel } from './layout';
import { createRng } from '../sim/rng';
import { findPath, lineOfSight, distance } from './geometry';
import { AREA_TOLERANCE } from './generator';
import { arrangeRound } from './placement';

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

// Footprints are defined in normalised (u,v) so every level can scale them to its own envelope.
function shapeCell(shape, x, y, W, H, variant) {
  const u = (x - 1) / (W - 3), v = (y - 1) / (H - 3);
  if (shape === 'cavern') {
    const lobes = [[.3, .38, .3, .34], [.7, .4 + (variant - .5) * .2, .3, .32], [.5 + (variant - .5) * .3, .8, .34, .26]];
    return lobes.some(([cx, cy, rx, ry]) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1);
  }
  if (shape === 'ruins') {
    const left = 1 + Math.floor((Math.sin(y * .72 + variant * 4) + 1) * 1.7 * W / 19);
    const right = W - 2 - Math.floor((Math.cos(y * .55 + variant * 3) + 1) * 1.5 * W / 19);
    return x >= left && x <= right && !(u > .62 && v < .24) && !(u < .37 && v > .75) && !(u > .74 && v > .62);
  }
  if (shape === 'round') return ((u - .5) / .5) ** 2 + ((v - .5) / .5) ** 2 <= 1.04;
  // Arms keep at least five tiles of width, so the five-wide vault always has a legitimate home.
  const wide = Math.max(.36, 5.2 / (W - 3)), tall = Math.max(.36, 5.2 / (H - 3));
  if (shape === 'L') return u <= Math.max(.42, wide) || v >= 1 - Math.max(.42, tall);
  if (shape === 'C') return u <= wide || v <= Math.max(.34, 3 / (H - 3)) || v >= 1 - Math.max(.34, 3 / (H - 3));
  const stem = Math.max(.32, wide) / 2;
  return v <= Math.max(.38, 3 / (H - 3)) || (u >= .5 - stem && u <= .5 + stem);
}
function rotate(x, y, turns, VH) {
  if (turns === 1) return { x: VH - 1 - y, y: x };
  if (turns === 2) return { x: 4 - x, y: VH - 1 - y };
  if (turns === 3) return { x: y, y: 4 - x };
  return { x, y };
}
const tiles = (map, ch = '.') => { const out = []; for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) if (ch.includes(map[y][x])) out.push({ x, y }); return out; };
const floorCount = map => tiles(map, '.C').length;
const floorNeighbours = (map, p) => neighbours(p).filter(q => map[q.y]?.[q.x] === '.').length;
// Grow or shrink the outline by single boundary cells until the usable floor is within the level's band.
function fitArea(map, target, locked, rng, anchor) {
  const W = map[0].length, H = map.length, connected = () => flood(map, anchor).size === floorCount(map) - tiles(map, 'C').length;
  for (let guard = 0; guard < 900; guard++) {
    const diff = floorCount(map) - target; if (Math.abs(diff) <= 1) return true;
    if (globalThis.DBG && guard === 0) console.error('fit start', floorCount(map), 'target', target);
    if (diff < 0) {
      let options = [];
      for (const need of [2, 3, 1]) {
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (map[y][x] === ' ' && floorNeighbours(map, { x, y }) === need && !locked.has(`${x},${y}`)) options.push({ x, y });
        if (options.length) break;
      }
      if (!options.length) { if (globalThis.DBG) console.error('grow: no options', diff, floorCount(map)); return false; }
      const p = options[Math.floor(rng() * options.length)]; map[p.y][p.x] = '.';
    } else {
      const options = tiles(map).filter(p => !locked.has(key(p)) && neighbours(p).some(q => map[q.y]?.[q.x] === ' ') && floorNeighbours(map, p) <= 2);
      let done = false;
      for (const p of shuffled(options, rng).slice(0, 40)) { map[p.y][p.x] = ' '; if (connected()) { done = true; break; } map[p.y][p.x] = '.'; }
      if (!done) { if (globalThis.DBG) console.error('shrink: stuck', diff, options.length); return false; }
    }
  }
  return false;
}
const vaultLoss = n => (n < 16 ? 15 : 20);
// Bulkheads split the exterior into sectors; each wall keeps a two-tile doorway per contiguous run.
function addBulkheads(map, count, rng, protect, crowd) {
  const gaps = [], used = [];
  for (let attempt = 0; attempt < 220 && gaps.length < count; attempt++) {
    const vertical = rng() < .5, floor = tiles(map).filter(p => !protect.has(key(p)));
    if (!floor.length) break;
    const axis = vertical ? 'x' : 'y', lo = Math.min(...floor.map(p => p[axis])), hi = Math.max(...floor.map(p => p[axis]));
    const c = Math.round(lo + (hi - lo) * (.3 + rng() * .4));
    if (used.some(u => u.vertical === vertical && Math.abs(u.c - c) < 4)) continue;
    const line = floor.filter(p => p[axis] === c && map[p.y][p.x] === '.').sort((a, b) => a.x - b.x || a.y - b.y);
    const along = vertical ? 'y' : 'x', runs = [];
    for (const p of line) { const last = runs[runs.length - 1]; if (last && last[last.length - 1][along] === p[along] - 1) last.push(p); else runs.push([p]); }
    const long = runs.filter(r => r.length >= 4);
    if (!long.length || long.length > 3) { if (globalThis.DBG) globalThis.DBG.bhRuns = (globalThis.DBG.bhRuns || 0) + 1; continue; }
    // Any protected tile beside the line (door approach, plate) would be walled in or crowded: skip.
    if (line.some(p => crowd.has(key(p)) || neighbours(p).some(q => crowd.has(key(q))))) { if (globalThis.DBG) globalThis.DBG.bhProtect = (globalThis.DBG.bhProtect || 0) + 1; continue; }
    const before = tiles(map).length, saved = map.map(r => r.slice()), doors = [];
    for (const run of runs) {
      if (run.length < 4) continue;
      const door = 1 + Math.floor(rng() * (run.length - 2)); doors.push([run[door - 1], run[door]]);
      run.forEach((p, i) => { if (i !== door - 1 && i !== door) map[p.y][p.x] = '#'; });
    }
    const rest = tiles(map), seed = rest[0], reach = flood(map, seed);
    const sideA = rest.filter(p => p[axis] < c).length, sideB = rest.filter(p => p[axis] > c).length;
    if (reach.size !== rest.length || sideA < 8 || sideB < 8 || before - rest.length < 2) { if (globalThis.DBG) globalThis.DBG.bhCut = (globalThis.DBG.bhCut || 0) + 1; for (let y = 0; y < map.length; y++) map[y] = saved[y]; continue; }
    used.push({ vertical, c });
    for (const [a, b] of doors) gaps.push({ a, b, ...centre({ x: (a.x + b.x) / 2 - .0, y: (a.y + b.y) / 2 - .0 }), vertical });
  }
  return gaps;
}

// Rejection diagnostics: which generation stage refused a seed (keyed by source line).
export const ROUND_FAILS = {};
const fail = tag => { ROUND_FAILS[tag] = (ROUND_FAILS[tag] || 0) + 1; return null; };
// Generation runs during build:campaign. Only variants with a successful temporal
// replay are shipped, so starting a round on a phone is just a small random choice.
export function generateRound(base, seed, shape, { grow = 0, deferPlacement = false, placementAttempt = 0 } = {}) {
  if (!ROUND_SHAPES.includes(shape)) throw new RangeError('Bentuk denah tidak dikenal');
  const n = base.number, plan = base.plan, rng = createRng(seed), width = plan.width + grow * 2, height = plan.height + grow * 2, outline = rng();
  const VH = n < 16 ? 5 : 7, relicRow = n < 16 ? 3 : 4, bulkheadCount = n < 6 ? 0 : n < 11 ? 1 : n < 25 ? 2 : n < 40 ? 3 : 4;
  const target = plan.area + (grow ? grow * 40 : 0);
  let map = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
    x > 0 && y > 0 && x < width - 1 && y < height - 1 && shapeCell(shape, x, y, width, height, outline) ? '.' : ' '));
  const originalCount = () => tiles(map).length;
  // Pre-fit leaves room for the vault shell and the bulkheads that follow.
  const estimate = target + vaultLoss(n) + bulkheadCount * Math.round(Math.min(width, height) * .45);
  const first = tiles(map)[0]; if (!first) return fail('L114');
  const biggest = (() => { let best = null; for (const p of tiles(map)) { if (best && flood(map, p).size <= best.size) continue; best = { p, size: flood(map, p).size }; if (best.size > originalCount() / 2) break; } return best; })();
  if (!biggest) return fail('L116');
  // Keep only the principal component before fitting.
  const main = flood(map, biggest.p); for (const p of tiles(map)) if (!main.has(key(p))) map[p.y][p.x] = ' ';
  if (!fitArea(map, estimate, new Set(), rng, biggest.p)) return fail('L119');
  const originalFloor = tiles(map);
  if (globalThis.DBG?.show) console.error(map.map(r => r.join('')).join('\n'));
  const candidates = []; for (const p of originalFloor) for (let turns = 0; turns < 4; turns++) candidates.push({ ...p, turns });
  let vault = null;
  for (const candidate of shuffled(candidates, rng)) {
    const at = (x, y) => { const p = rotate(x, y, candidate.turns, VH); return { x: p.x + candidate.x, y: p.y + candidate.y }; };
    const cells = []; for (let y = 0; y < VH; y++) for (let x = 0; x < 5; x++) cells.push(at(x, y));
    if (!cells.every(p => map[p.y]?.[p.x] === '.')) { if (globalThis.DBG) globalThis.DBG.cells = (globalThis.DBG.cells || 0) + 1; continue; }
    const approach = at(2, -1), plate = at(-1, 1);
    if (map[approach.y]?.[approach.x] !== '.' || (n >= 20 && map[plate.y]?.[plate.x] !== '.')) { if (globalThis.DBG) globalThis.DBG.appr = (globalThis.DBG.appr || 0) + 1; continue; }
    const test = map.map(r => r.slice()); for (const p of cells) test[p.y][p.x] = '#';
    const reachable = flood(test, approach), orphans = originalFloor.filter(p => !reachable.has(key(p)) && !cells.some(c => c.x === p.x && c.y === p.y));
    // Stubs cut off by the vault shell are masonry, not rooms; a large cut-off area rejects the placement.
    if (orphans.length > 8 || reachable.size < Math.max(30, plan.area - VH * 5 - 12)) { if (globalThis.DBG) { const k = orphans.length > 8 ? 'conn' : 'small'; globalThis.DBG[k] = (globalThis.DBG[k] || 0) + 1; } continue; }
    vault = { at, cells, approach, plate, orphans }; break;
  }
  if (!vault) return fail('L134');
  for (const p of vault.orphans) map[p.y][p.x] = ' ';
  const { at, approach, plate } = vault, vaultSet = new Set(vault.cells.map(key));
  for (let y = 0; y < VH; y++) for (let x = 0; x < 5; x++) {
    const p = at(x, y), wall = x === 0 || x === 4 || y === 0 || y === VH - 1 || (n >= 16 && y === 2);
    map[p.y][p.x] = wall ? '#' : '.';
  }
  const door = at(2, 0), seal = at(2, 2), shortcut = at(0, 1);
  map[door.y][door.x] = '.'; if (n >= 16) map[seal.y][seal.x] = '.'; if (n >= 20) map[shortcut.y][shortcut.x] = '.';
  const protect = new Set([key(approach), key(plate), ...vault.cells.map(key), ...neighbours(approach).map(key), ...neighbours(plate).map(key)]);
  const crowd = new Set([key(approach), key(plate), ...neighbours(approach).map(key), ...neighbours(plate).map(key)]);
  const gaps = bulkheadCount ? addBulkheads(map, bulkheadCount, rng, protect, crowd) : [];
  if (bulkheadCount && gaps.length < Math.min(bulkheadCount, 2)) return fail('L144');
  const gapTiles = new Set(); gaps.forEach(g => { gapTiles.add(key(g.a)); gapTiles.add(key(g.b)); });
  const locked = new Set([...protect, ...gapTiles, ...gaps.flatMap(g => [...neighbours(g.a), ...neighbours(g.b)].map(key))]);
  if (!fitArea(map, plan.area, locked, rng, approach)) return fail('L147');
  const finalOutside = flood(map, approach), exteriorTiles = tiles(map).filter(p => !vaultSet.has(key(p)));
  if (exteriorTiles.some(p => !finalOutside.has(key(p)))) return fail('L149');
  const exterior = exteriorTiles.map(p => ({ x: p.x, y: p.y }));
  const used = new Set([key(approach), key(plate)]);
  // Cover never disconnects the exterior, the vault approach or either doorway.
  const coverCount = n < 4 ? 3 : 5 + Math.floor(n / 12); let cover = 0;
  const coverBlock = new Set([...gapTiles, ...gaps.flatMap(g => [...neighbours(g.a), ...neighbours(g.b)].map(key))]);
  const exteriorOpen = () => tiles(map).filter(p => !vaultSet.has(key(p))).length;
  for (const p of shuffled(exterior, rng)) {
    if (cover >= coverCount) break;
    if (manhattan(p, approach) < 2 || manhattan(p, plate) < 2 || coverBlock.has(key(p))) continue;
    map[p.y][p.x] = 'C';
    const test = map.map(r => r.slice()); test[door.y][door.x] = '#'; if (n >= 20) test[shortcut.y][shortcut.x] = '#';
    if (flood(test, approach).size !== exteriorOpen()) { map[p.y][p.x] = '.'; continue; }
    cover++;
  }
  const outside = flood(map, approach);
  const available = exterior.filter(p => map[p.y][p.x] === '.');
  const geo = { level: { width, height, map, doors: [] }, opened: new Set(), smoke: [] };
  function pick(...filters) {
    for (const filter of filters.length ? filters : [() => true]) {
      const options = available.filter(p => !used.has(key(p)) && filter(p));
      if (options.length) { const p = options[Math.floor(rng() * options.length)]; used.add(key(p)); return p; }
    }
    return fail('L172');
  }
  const maxDist = Math.max(...exterior.map(p => outside.get(key(p)) ?? 0));
  const spawn = pick(p => outside.get(key(p)) >= maxDist * .7 && !(gapTiles.has(key(p))), p => outside.get(key(p)) >= maxDist * .55);
  if (!spawn) return fail('L176');
  const spawnCentre = centre(spawn), exit = { ...spawnCentre };
  // Sectors: floor split by the bulkhead doorways. A doorway is a guarded transition, not a room.
  const sector = new Map(); let sectors = 0;
  for (const p of exterior) if (!sector.has(key(p)) && !gapTiles.has(key(p))) {
    const q = [p]; sector.set(key(p), sectors);
    for (let i = 0; i < q.length; i++) for (const m of neighbours(q[i])) if (map[m.y]?.[m.x] && '.C'.includes(map[m.y][m.x]) && !vaultSet.has(key(m)) && !gapTiles.has(key(m)) && !sector.has(key(m))) { sector.set(key(m), sectors); q.push(m); }
    sectors++;
  }
  const sec = p => sector.get(key(p));
  const mainRoute = findPath({ level: { width, height, map, doors: [] }, opened: new Set() }, spawnCentre, centre(approach)) || [];
  const onRoute = new Set(mainRoute.map(p => key({ x: Math.floor(p.x), y: Math.floor(p.y) })));
  const routeDistance = p => Math.min(...[...onRoute].map(k => { const [x, y] = k.split(',').map(Number); return Math.abs(x - p.x) + Math.abs(y - p.y); }), 99);
  const lock = n >= 4, machinery = n >= 16;
  const keyPoint = lock ? pick(p => manhattan(p, spawn) > 3 && sec(p) !== sec(spawn) && sec(p) !== sec(approach) && routeDistance(p) >= 2, p => manhattan(p, spawn) > 3 && routeDistance(p) >= 1, p => manhattan(p, spawn) > 3) : null;
  const leverPoint = machinery ? pick(p => manhattan(p, spawn) > 3 && manhattan(p, keyPoint) > 5 && routeDistance(p) >= 1, p => manhattan(p, spawn) > 3 && manhattan(p, keyPoint) > 3) : null;
  if ((lock && !keyPoint) || (machinery && !leverPoint)) return fail('L192');
  const doors = lock ? [{ id: 'vault', ...centre(door), kind: 'key', key: 'a' }] : [];
  if (machinery) doors.push({ id: 'seal', ...centre(seal), kind: 'lever', label: 'A' });
  if (n >= 20) doors.push({ id: 'shortcut', ...centre(shortcut), kind: 'plate', label: 'P' });
  geo.level.doors = doors;
  const keys = keyPoint ? [{ id: 'key-a', ...centre(keyPoint), key: 'a', kind: 'key' }] : [];
  const levers = leverPoint ? [{ id: 'lever-a', ...centre(leverPoint), label: 'A', doors: ['seal'] }] : [];
  const plates = n >= 20 ? [{ id: 'plate-a', ...centre(plate), door: 'shortcut', duration: n === 37 ? 10 : 7 }] : [];
  const artifacts = [{ id: 'relic-a', ...centre(at(2, relicRow)), kind: 'artifact' }];
  let relicB = null;
  if (n >= 45) { relicB = pick(q => manhattan(q, spawn) > 5 && routeDistance(q) >= 2 && floorNeighbours(map, q) <= 3, q => manhattan(q, spawn) > 5); if (!relicB) return fail('L202'); artifacts.push({ id: 'relic-b', ...centre(relicB), kind: 'artifact' }); }
  // Optional rewards sit on side branches, off the direct spawn-to-relic line.
  const loot = [];
  for (let i = 0; i < (n >= 35 ? 5 : n >= 10 ? 4 : 3); i++) { const p = pick(q => manhattan(q, spawn) > 2 && routeDistance(q) >= 3, q => manhattan(q, spawn) > 2 && routeDistance(q) >= 1, q => manhattan(q, spawn) > 2); if (!p) return fail('L205'); loot.push({ id: `loot-${i}`, ...centre(p), kind: 'loot', value: 5 }); }
  // Hiding places stage a move next to doorways; none is glued to the exit.
  const hides = [];
  for (let i = 0; i < 3; i++) {
    const g = gaps.length ? gaps[i % gaps.length] : null;
    const p = pick(q => g && !gapTiles.has(key(q)) && manhattan(q, g.a) <= 3 && manhattan(q, spawn) > 3 && manhattan(q, approach) > 2, q => manhattan(q, spawn) > 3 && manhattan(q, approach) > 2, q => manhattan(q, spawn) > 2);
    if (!p) return fail('L211'); hides.push({ id: `hide-${i}`, ...centre(p) });
  }
  const shadows = [...hides.map(h => ({ ...h, radius: 1.1 })), { ...spawnCentre, radius: 1.1 }];
  // ---- Human security: every guard has a role, post/route and observation headings. ----
  const guards = [], approachC = centre(approach);
  const standing = [...base.guards.keys()].map(i => ({ index: i, role: base.guards[i].role }));
  const fastRoles = (plan.fast ? standing.filter(g => g.role !== "relic").slice(-plan.fast) : []).map(g => g.index);
  const seeing = (a, b, range) => distance(centre(a), centre(b)) <= range && lineOfSight(geo, centre(a), centre(b), false);
  const clear = n < 6 ? 4 : 6, apart = p => guards.every(g => distance(centre(p), g) > 2.5) && manhattan(p, spawn) > clear;
  function randomPairs(minPath, maxPath, tries = 30) {
    const out = [], pool = shuffled(exterior.filter(p => map[p.y][p.x] === '.' && !used.has(key(p)) && !vaultSet.has(key(p)) && apart(p)), rng).slice(0, tries);
    for (const a of pool) { const reach = flood(map, a), options = pool.filter(b => reach.get(key(b)) >= minPath && reach.get(key(b)) <= maxPath); if (options.length) out.push([a, options[Math.floor(rng() * options.length)]]); }
    return out;
  }
  function watcher(index, role, targetTile, targetC) {
    // A relic sentry stands off the vault axis: it guards the approach, it cannot see into the vault.
    const axis = role === 'relic' ? { x: approach.x - door.x, y: approach.y - door.y } : null, offAxis = p => !axis || Math.abs((p.x - approach.x) * axis.y - (p.y - approach.y) * axis.x) >= 1;
    const range = base.guards[index].range, tries = [
      p => offAxis(p) && apart(p) && outside.get(key(p)) !== undefined && manhattan(p, targetTile) >= 3 && manhattan(p, targetTile) <= 5 && seeing(p, targetTile, range),
      p => offAxis(p) && apart(p) && manhattan(p, targetTile) >= 2 && manhattan(p, targetTile) <= 6 && seeing(p, targetTile, range + .6)];
    const post = pick(...tries); if (!post) return fail('L224');
    const start = centre(post), toward = Math.atan2(targetC.y - start.y, targetC.x - start.x);
    const left = rayLength(geo, start, toward + 1.15), right = rayLength(geo, start, toward - 1.15), away = left <= right ? toward + 1.15 : toward - 1.15;
    return { ...base.guards[index], ...start, facing: toward, route: [start], watch: [toward, away], watchDwell: n >= 25 ? [1.6, 3.8] : [1.8, 3.2], role, post: start, home: { ...start } };
  }
  for (const { index, role } of standing) {
    let g = null; const roleIndex = standing.filter(s => s.role === role).findIndex(s => s.index === index);
    if (role === 'relic') g = roleIndex === 0 ? watcher(index, role, approach, approachC) : watcher(index, role, relicB, centre(relicB));
    else if (role === 'access') {
      const targets = [...keys, ...levers].map(o => ({ tile: { x: Math.floor(o.x), y: Math.floor(o.y) }, c: o }));
      for (const gp of gaps) targets.push({ tile: gp.a, c: centre(gp.a) });
      const t = targets[roleIndex % targets.length]; g = t ? watcher(index, role, t.tile, t.c) : null;
    } else {
      // Patrols join real observation points: doorways first, then a pair of points along the main route.
      const pairs = [];
      if (role === 'corridor' && gaps.length) { const a = gaps[(roleIndex) % gaps.length], b = gaps[(roleIndex + 1) % gaps.length]; pairs.push([a.a, a === b ? sample(mainRoute, .72) : b.b]); }
      if (role === 'corridor') for (const ta of [.35, .45, .55, .65, .25]) for (const tb of [.7, .8, .6, .9, .5]) if (tb - ta >= .15) pairs.push(roleIndex % 2 ? [sample(mainRoute, tb), sample(mainRoute, ta)] : [sample(mainRoute, ta), sample(mainRoute, tb)]);
      if (role !== 'relic') {
        const sorted = randomPairs(role === 'investigator' ? 8 : 4, role === 'investigator' ? 40 : 12);
        pairs.push(...(role === 'investigator' ? sorted.sort((x, y) => Number(sec(y[0]) !== sec(y[1])) - Number(sec(x[0]) !== sec(x[1]))) : sorted));
      }
      for (const [pa, pb] of pairs) {
        if (!pa || !pb) continue;
        const a = { x: Math.floor(pa.x), y: Math.floor(pa.y) }, b = { x: Math.floor(pb.x), y: Math.floor(pb.y) };
        const why = map[a.y][a.x] !== '.' || map[b.y][b.x] !== '.' ? 'tile' : used.has(key(a)) || used.has(key(b)) ? 'used' : vaultSet.has(key(a)) || vaultSet.has(key(b)) ? 'vault' : !apart(a) || !apart(b) ? 'apart' : null;
        if (why) { if (globalThis.DBG) globalThis.DBG[why] = (globalThis.DBG[why] || 0) + 1; continue; }
        const path = findPath(geo, centre(a), centre(b)); if (!path || path.length < 4) { if (globalThis.DBG) globalThis.DBG.short = (globalThis.DBG.short || 0) + 1; continue; }
        used.add(key(a)); used.add(key(b));
        const start = centre(a), next = path[0];
        g = { ...base.guards[index], ...start, route: [start, centre(b)], facing: Math.atan2(next.y - start.y, next.x - start.x), role, home: { ...start } }; break;
      }
    }
    if (!g) return fail(`guard-${role}`);
    const fast = fastRoles.includes(index);
    guards.push({ ...g, kind: fast ? 'runner' : g.kind, speed: base.guards[index].speed * (fast ? 1.18 : 1), fast,
      range: n < 6 ? 2.7 : n >= 25 ? 2.6 : 2.9, fov: Math.PI * (n >= 25 ? .36 : .4), pause: 1.2 + rng() * 1.8, dwell: .8 + rng() * .7 });
  }
  // ---- Cameras: each watches a doorway; fewer is valid when no doorway justifies another. ----
  const torches = [], crystals = [], bells = [], portals = [];
  const clearOfObjects = (q, r) => [...keys, ...levers, ...loot, ...artifacts, { ...spawnCentre }].every(o => distance(o, centre(q)) > r);
  if (n >= 26) { const p = pick(q => routeDistance(q) >= 2 && clearOfObjects(q, 4.2), q => clearOfObjects(q, 3.6)); if (!p) return fail('L259'); torches.push({ ...centre(p), range: 3.4, fov: Math.PI * 2, facing: 0 }); }
  const camTargets = shuffled(gaps, rng);
  for (const gp of camTargets) {
    if (crystals.length >= plan.cameras) break;
    const p = pick(q => manhattan(q, gp.a) >= 3 && manhattan(q, gp.a) <= 5 && manhattan(q, spawn) > 5 && seeing(q, gp.a, 4.4) && !crystals.some(c => distance(c, centre(q)) < 4));
    if (!p) continue;
    const c = centre(p), facing = Math.atan2(gp.y - c.y, gp.x - c.x) + (rng() < .5 ? 1 : -1) * .45;
    crystals.push({ id: `eye-${crystals.length}`, ...c, ...(n >= 21 ? { range: 3, fov: .36, rate: .5, sweep: 1 } : { range: 3.3, fov: .5, rate: .35, sweep: .55 }), facing, baseFacing: facing, phase: rng() * Math.PI * 2 });
  }
  if (n >= 10 && !crystals.length) return fail('L268');
  if (n >= 21) { const p = pick(q => routeDistance(q) >= 2 && clearOfObjects(q, 3.2), q => clearOfObjects(q, 2.5)); if (!p) return fail('L269'); bells.push(centre(p)); }
  if (n >= 40) for (let i = 0; i < 2; i++) { const p = pick(); if (!p) return fail('L270'); portals.push({ id: `portal-${i}`, ...centre(p), pair: `portal-${1 - i}`, label: 'I' }); }
  // ---- Dogs (separated, tethered first), monsters and hazards. ----
  const beasts = [], dogs = [], hazards = [];
  let dogSafeArea = null;
  const dogKinds = [...Array(plan.dogs.tethered).fill(true), ...Array(plan.dogs.free).fill(false)];
  if (dogKinds.length) {
    const geometry = { level: { width, height, map, doors }, opened: new Set(doors.map(d => d.id)), smoke: [] };
    let safeMap = map.map(r => r.slice()); for (const d of doors) safeMap[Math.floor(d.y)][Math.floor(d.x)] = '#';
    for (const [i, tethered] of dogKinds.entries()) {
      let chosen = null;
      for (const a of shuffled(available.filter(p => !used.has(key(p)) && Math.hypot(p.x - spawn.x, p.y - spawn.y) > 6 && guards.every(g => manhattan(centre(p), g) > 2) && dogs.every(d => manhattan(centre(p), d) > 3)), rng)) {
        const reach = flood(map, a);
        const options = tethered ? [a] : shuffled(available.filter(p => !used.has(key(p)) && manhattan(p, spawn) > 6 && reach.get(key(p)) >= 2 && reach.get(key(p)) <= 4), rng).slice(0, 8);
        for (const b of options) {
          const path = findPath({ level: { width, height, map, doors }, opened: new Set() }, centre(a), centre(b)); if (!path) continue;
          const poses = [centre(a), ...path], test = safeMap.map(r => r.slice());
          for (const p of available) if (poses.some(d => distance(d, centre(p)) <= 5.2 && lineOfSight(geometry, d, centre(p), false))) test[p.y][p.x] = '#';
          if (test[spawn.y][spawn.x] !== '.') continue;
          const safe = flood(test, spawn); if (!safe.has(key(approach)) || safe.size < 30) continue;
          chosen = { a, b, test, safe }; break;
        }
        if (chosen) break;
      }
      if (!chosen) return fail('L293');
      const { a, b, test, safe } = chosen; used.add(key(a)); used.add(key(b)); safeMap = test; dogSafeArea = safe;
      dogs.push({ id: `dog-${i}`, ...centre(a), route: [centre(a), centre(b)], facing: 0, range: 4.8, speed: 4.8, tethered, leash: 2.3 });
    }
    for (const object of [...keys, ...levers, ...loot, ...artifacts]) {
      const cell = key({ x: Math.floor(object.x), y: Math.floor(object.y) });
      if (outside.has(cell) && !dogSafeArea.has(cell) && !vaultSet.has(cell)) { const p = pick(q => manhattan(q, spawn) > 2 && dogSafeArea.has(key(q))); if (!p) return fail('L299'); Object.assign(object, centre(p)); }
    }
  }
  // Creature sites are assigned together with the final security plan below.
  const trapCount = n >= 35 ? 5 : n >= 20 ? 3 : n >= 8 ? 1 : 0;
  for (let i = 0; i < trapCount; i++) {
    const nearGap = q => gaps.some(g => manhattan(q, g.a) <= 2 && !gapTiles.has(key(q)));
    const free = q => manhattan(q, spawn) > 3 && neighbours(q).filter(t => map[t.y]?.[t.x] === '.').length >= 3 && !beasts.some(b => distance(b, centre(q)) < 2.2);
    const p = pick(q => free(q) && nearGap(q), free); if (!p) return fail('L365');
    hazards.push({ id: `spikes-${i}`, ...centre(p), kind: 'spikes', period: 5.5, active: 1.25, phase: rng() * 5.5 });
  }
  const final = map.map(r => r.slice());
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (final[y][x] === ' ') {
    const adjacent = [-1, 0, 1].some(dy => [-1, 0, 1].some(dx => final[y + dy]?.[x + dx] === '.'));
    if (adjacent) final[y][x] = '#';
  }
  const usable = floorCount(map);
  const round = { ...base, width, height, map: final.map(r => r.join('')), spawn: spawnCentre, exit, keys, doors, levers, plates, artifacts, loot, hides, shadows, guards, torches, crystals, bells, portals, beasts, dogs, hazards,
    transitions: gaps.map(g => ({ x: g.x, y: g.y })),
    shape, shapeLabel: SHAPE_LABELS[shape], variantId: `${base.id}-${shape}-${seed >>> 0}`, roundSeed: seed >>> 0,
    metrics: { usable, area: plan.area, rooms: sectors, transitions: gaps.length, travel: mainRoute.length, monsters: plan.monsters },
    par: 9999,
    tip: `Denah ${SHAPE_LABELS[shape]}; posisi berubah tiap ronde. ${base.tip}`, intro: base.tip };
  return deferPlacement ? compactLevel(round) : arrangeRound(compactLevel(round), placementAttempt);
}
function rayLength(geo, from, angle) { let d = 0; while (d < 3 && lineOfSightPoint(geo, from, angle, d + .25)) d += .25; return d; }
function lineOfSightPoint(geo, from, angle, d) { return lineOfSight(geo, from, { x: from.x + Math.cos(angle) * d, y: from.y + Math.sin(angle) * d }, false); }
function sample(route, t) { const p = route[Math.min(route.length - 1, Math.max(0, Math.floor(route.length * t)))]; return p ? { x: Math.floor(p.x), y: Math.floor(p.y) } : null; }
function pickFrom(list, rng) { return list.length ? list[Math.floor(rng() * list.length)] : null; }

export function chooseRound(base, variants, rng, previous) {
  if(!variants?.length)return base;
  // Change the footprint too, even if the RNG happens to repeat the same value.
  const choices=variants.filter(v=>v.shape!==previous?.shape);
  const pool=choices.length?choices:variants;
  return pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
}

// Compatibility entry point: the same canonical roster and placement rules.
export function polishRound(level) { return arrangeRound(level); }
