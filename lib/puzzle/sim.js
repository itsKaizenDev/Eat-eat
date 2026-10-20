// Dungeon — simulasi murni berbasis giliran. Pemain = maskot satu petak.
// Apel adalah koin bonus opsional, tidak memanjangkan tubuh. Sakelar tetap aktif
// setelah diinjak. Semua state termasuk koin, sakelar, dan penjaga dapat di-undo.
// Penjaga patroli -> waspada -> kejar -> sasaran satu giliran -> serang -> pulih.
// Sembunyi di semak atau lepas dari pandangan untuk memutus pengejaran.

export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
const key = (x, y) => x + ',' + y;
const same = (a, b) => a.x === b.x && a.y === b.y;

// ---------- pembuatan & validasi level ----------
// Legenda `map`: '#' tembok, '.' lantai, 'F' koin apel, 'K' kunci, 'E' pintu keluar,
// 'a'..'c' sakelar permanen, '1'..'3' pasangan portal (tepat dua kemunculan per angka).
// '^' duri, 'x' batu retak, 'G' jeruji, '!' tuas, 'v' semak, 'P' palu, 'S' perisai, 'H' heal.
// g/h tetap dibaca untuk fixture lama; kampanye memakai G + links.
// Penjaga tidak ada di peta: spec.guards = [{ x, y, dir: 'U|D|L|R', range?: 1..5, patrol?: [[x,y], ...] }].
export function buildLevel(spec) {
  const errors = [];
  const rows = Array.isArray(spec && spec.map) ? spec.map : null;
  if (!rows || !rows.length) return { level: null, errors: ['map kosong atau bukan array'] };
  const h = rows.length, w = rows[0].length;
  const level = {
    id: spec.id, name: spec.name, goal: spec.goal, par: spec.par, w, h,
    walls: [], foods: [], keys: [], plates: [], portals: [], exit: null,
    spikes: [], cracks: [], gates: [], levers: [], links: (spec.links || []).map(l => ({ gate: l.gate.slice(), lever: l.lever.slice() })), bushes: [], pickups: [], guards: [],
    snake: (spec.snake || []).map(([x, y]) => ({ x, y })), dir: null,
  };
  const portalMap = {};
  const exits = [];
  rows.forEach((row, y) => {
    if (row.length !== w) errors.push(`baris ${y} panjangnya ${row.length}, seharusnya ${w}`);
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#') level.walls.push({ x, y });
      else if (c === 'F') level.foods.push({ x, y });
      else if (c === 'K') level.keys.push({ x, y });
      else if (c === 'E') exits.push({ x, y });
      else if (c === '^') level.spikes.push({ x, y });
      else if (c === 'x') level.cracks.push({ x, y });
      else if (c === 'g' || c === 'h') level.gates.push({ x, y, open: c === 'g' ? 'even' : 'odd' });
      else if (c === 'G') level.gates.push({ x, y, open: 'lever' });
      else if (c === '!') level.levers.push({ x, y, id: key(x, y) });
      else if (c === 'v') level.bushes.push({ x, y });
      else if (c === 'P') level.pickups.push({ x, y, kind: 'hammer' });
      else if (c === 'S') level.pickups.push({ x, y, kind: 'shield' });
      else if (c === 'H') level.pickups.push({ x, y, kind: 'heal' });
      else if (c >= 'a' && c <= 'c') level.plates.push({ id: c, x, y });
      else if (c >= '1' && c <= '3') (portalMap[c] = portalMap[c] || []).push({ x, y });
      else if (c !== '.') errors.push(`karakter tidak dikenal '${c}' di (${x},${y})`);
    }
  });
  Object.keys(portalMap).sort().forEach(id => {
    const ends = portalMap[id];
    if (ends.length !== 2) errors.push(`portal ${id} harus tepat 2 ujung, ditemukan ${ends.length}`);
    else level.portals.push({ id, a: ends[0], b: ends[1] });
  });
  if (exits.length !== 1) errors.push(`harus ada tepat 1 pintu keluar, ditemukan ${exits.length}`);
  else level.exit = { ...exits[0], keys: (spec.exit && spec.exit.keys) || 0, plates: ((spec.exit && spec.exit.plates) || []).slice() };
  (spec.guards || []).forEach((g, i) => {
    const d = DIRS[g.dir];
    if (!d) { errors.push(`penjaga ${i}: arah tidak valid`); return; }
    const kind = g.kind === 'slime' ? 'slime' : 'warden';
    level.guards.push({ x: g.x, y: g.y, kind, hp: kind === 'slime' ? 1 : 2, dir: { ...d }, range: g.range || 3, patrol: (g.patrol || []).map(([px, py]) => ({ x: px, y: py })) });
  });
  level.wallGrid = new Array(w * h).fill(0);
  level.walls.forEach(wl => { level.wallGrid[wl.y * w + wl.x] = 1; });
  level.dir = DIRS[spec.dir] || null;
  if (!level.dir) errors.push(`arah awal tidak valid: ${spec.dir}`);
  errors.push(...validateLevel(level));
  return { level: errors.length ? null : level, errors };
}

export function validateLevel(level) {
  const e = [];
  if (!level.id || typeof level.id !== 'string') e.push('id wajib');
  if (!Number.isInteger(level.par) || level.par < 1) e.push('par harus integer >= 1');
  if (!(level.w >= 3 && level.w <= 17 && level.h >= 3 && level.h <= 15)) e.push(`ukuran ${level.w}x${level.h} di luar 3..17 x 3..15`);
  const inb = p => p.x >= 0 && p.y >= 0 && p.x < level.w && p.y < level.h;
  const wall = new Set(level.walls.map(p => key(p.x, p.y)));
  const taken = new Map(); // sel -> pemilik, mencegah dua objek di satu sel
  const put = (p, what) => { const k = key(p.x, p.y); if (taken.has(k)) e.push(`(${p.x},${p.y}) dipakai ${taken.get(k)} dan ${what}`); else taken.set(k, what); };
  if (!level.snake || !level.snake.length) e.push('posisi awal minimal 1 petak');
  else {
    level.snake.forEach((p, i) => {
      if (!inb(p)) e.push(`segmen ${i} di luar papan`);
      else if (wall.has(key(p.x, p.y))) e.push(`segmen ${i} di atas tembok`);
      else put(p, 'ular');
      if (i > 0) { const q = level.snake[i - 1]; if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) !== 1) e.push(`segmen ${i} tidak bersebelahan dengan segmen sebelumnya`); }
    });
    if (level.dir && level.snake.length > 1) { const n = level.snake[1], hd = level.snake[0]; if (hd.x - n.x !== level.dir.x || hd.y - n.y !== level.dir.y) e.push('arah awal tidak sesuai kepala-leher'); }
  }
  level.foods.forEach(p => put(p, 'makanan'));
  level.keys.forEach(p => put(p, 'kunci'));
  level.plates.forEach(p => put(p, 'plate ' + p.id));
  level.portals.forEach(p => { put(p.a, 'portal ' + p.id); put(p.b, 'portal ' + p.id); });
  level.spikes.forEach(p => put(p, 'duri'));
  level.cracks.forEach(p => put(p, 'tembok retak'));
  level.gates.forEach(p => put(p, 'gerbang'));
  (level.levers || []).forEach(p => put(p, 'tuas'));
  (level.links || []).forEach(l => {
    if (!level.gates.some(g => g.open === 'lever' && g.x === l.gate[0] && g.y === l.gate[1])) e.push('tautan gerbang tidak valid');
    if (!(level.levers || []).some(p => p.x === l.lever[0] && p.y === l.lever[1])) e.push('tautan tuas tidak valid');
  });
  level.gates.filter(g => g.open === 'lever').forEach(g => {
    if (!(level.links || []).some(l => l.gate[0] === g.x && l.gate[1] === g.y)) e.push('gerbang belum terhubung ke tuas');
  });
  level.bushes.forEach(p => put(p, 'semak'));
  level.pickups.forEach(p => put(p, 'pickup ' + p.kind));
  level.guards.forEach((g, i) => {
    if (!inb(g) || wall.has(key(g.x, g.y))) e.push(`penjaga ${i} di luar papan atau di atas tembok`);
    else put(g, 'penjaga ' + i);
    if (!(g.range >= 1 && g.range <= 5)) e.push(`penjaga ${i}: range harus 1..5`);
    if (g.patrol.length) {
      if (g.patrol[0].x !== g.x || g.patrol[0].y !== g.y) e.push(`penjaga ${i}: titik patroli pertama harus posisi awal`);
      g.patrol.forEach((p, j) => {
        if (!inb(p) || wall.has(key(p.x, p.y))) e.push(`penjaga ${i}: patroli ${j} tidak valid`);
        if (j > 0 && Math.abs(p.x - g.patrol[j - 1].x) + Math.abs(p.y - g.patrol[j - 1].y) !== 1) e.push(`penjaga ${i}: patroli ${j} tidak bersebelahan`);
      });
    }
  });
  if (level.guards.length > 3) e.push('maksimal 3 penjaga');
  if (level.exit) {
    put(level.exit, 'pintu');
    if (level.exit.keys > level.keys.length) e.push(`pintu butuh ${level.exit.keys} kunci, level hanya punya ${level.keys.length}`);
    const ids = new Set(level.plates.map(p => p.id));
    level.exit.plates.forEach(id => { if (!ids.has(id)) e.push(`pintu mensyaratkan plate '${id}' yang tidak ada`); });
  }
  return e;
}

// ---------- state ----------
export function initialState(level) {
  return {
    snake: [{ ...level.snake[0] }], apples: 0, activated: [], dir: { ...level.dir }, steps: 0, hearts: 3, hurtUntil: 0, defeated: 0,
    foods: level.foods.map(p => ({ ...p })), keys: level.keys.map(p => ({ ...p })), keysHeld: 0, status: 'playing',
    hammer: 0, shield: 0, pickups: (level.pickups || []).map(p => ({ ...p })), cleared: [],
    guards: (level.guards || []).map(g => ({ x: g.x, y: g.y, hp: g.hp ?? 2, kind: g.kind || 'warden', dir: openFacing(level, g, new Set(), 1), mode: 'idle', pi: 0, pd: 1, cd: 0, target: null, memory: 0, aim: null })),
  };
}

export function activePlates(level, state) {
  return (state.activated || []).filter(id => level.plates.some(p => p.id === id));
}

// Ringkasan syarat untuk HUD / pesan: apa yang masih kurang?
export function exitStatus(level, state) {
  const act = activePlates(level, state);
  const needPlates = level.exit.plates;
  return {
    keysHave: state.keysHeld, keysNeed: level.exit.keys,
    platesActive: needPlates.filter(id => act.includes(id)).length, platesNeed: needPlates.length,
    missingPlates: needPlates.filter(id => !act.includes(id)),
  };
}

// ---------- rintangan & penjaga ----------
const at = (list, p) => (list || []).find(o => o.x === p.x && o.y === p.y);
const inBounds = (level, p) => p.x >= 0 && p.y >= 0 && p.x < level.w && p.y < level.h;
const isWall = (level, p) => (level.wallGrid ? level.wallGrid[p.y * level.w + p.x] === 1 : level.walls.some(w => same(w, p)));
export const gateOpen = (gate, stepNo, state) => gate.open === 'lever' ? !!state?.cleared?.includes(key(gate.x, gate.y)) : (gate.open === 'even') === (stepNo % 2 === 0);
const ORDER = [DIRS.U, DIRS.L, DIRS.D, DIRS.R]; // urutan tie-break tetap untuk BFS penjaga
export const GUARD_STUN = 3;

// Rintangan yang saat ini menghalangi PENJAGA / PANDANGAN pada nomor langkah stepNo.
function blocks(level, cleared, p, stepNo, forVision) {
  if (!inBounds(level, p)) return true;
  if (isWall(level, p)) return true;
  const k = key(p.x, p.y);
  if (at(level.cracks, p) && !cleared.has(k)) return true;
  const g = at(level.gates, p);
  if (g && !cleared.has(k) && !gateOpen(g, stepNo)) return true;
  if (!forVision && at(level.spikes, p) && !cleared.has(k)) return true;
  return false;
}

// Pilih arah terbuka terpanjang bila arah saat ini menghadap rintangan.
// Tie-break tetap: hasil level, undo, dan solver tetap deterministik.
export function openFacing(level, guard, cleared, stepNo) {
  const ahead = { x: guard.x + guard.dir.x, y: guard.y + guard.dir.y };
  if (!blocks(level, cleared, ahead, stepNo, true)) return { ...guard.dir };
  let best = guard.dir, longest = 0;
  for (const dir of ORDER) {
    let length = 0;
    for (let n = 1; n <= 5; n++) {
      if (blocks(level, cleared, { x: guard.x + dir.x * n, y: guard.y + dir.y * n }, stepNo, true)) break;
      length++;
    }
    if (length > longest) { longest = length; best = dir; }
  }
  return { ...best };
}

// Sel yang dilihat penjaga: kedalaman 1..range, selebar 3 sel (lateral -1..1), terhalang tembok/retak/gerbang tertutup.
export function visionCells(level, state, guard, stepNo) {
  if (guard.hp === 0 || guard.cd > 0) return [];
  const cleared = new Set(state.cleared || []);
  const f = guard.dir, perp = { x: -f.y, y: f.x };
  const out = [];
  const range = (level.guards[state.guards.indexOf(guard)] || {}).range || 3;
  for (let d = 1; d <= range; d++) {
    const c = { x: guard.x + f.x * d, y: guard.y + f.y * d };
    if (blocks(level, cleared, c, stepNo, true)) break;
    if (lineClear(level, cleared, guard, c, stepNo)) out.push(c);
    for (const l of [-1, 1]) {
      const s = { x: c.x + perp.x * l, y: c.y + perp.y * l };
      if (!blocks(level, cleared, s, stepNo, true) && lineClear(level, cleared, guard, s, stepNo)) out.push(s);
    }
  }
  return out;
}

// Supercover: petak di sepanjang ray dan kedua sisi sudut harus terbuka.
function lineClear(level, cleared, from, to, stepNo) {
  const dx = to.x - from.x, dy = to.y - from.y, nx = Math.abs(dx), ny = Math.abs(dy), sx = Math.sign(dx), sy = Math.sign(dy);
  let x = from.x, y = from.y, ix = 0, iy = 0;
  while (ix < nx || iy < ny) {
    const decision = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
    if (decision === 0) {
      if (blocks(level, cleared, { x: x + sx, y }, stepNo, true) || blocks(level, cleared, { x, y: y + sy }, stepNo, true)) return false;
      x += sx; y += sy; ix++; iy++;
    } else if (decision < 0) { x += sx; ix++; } else { y += sy; iy++; }
    if (blocks(level, cleared, { x, y }, stepNo, true)) return false;
  }
  return true;
}

const inBush = (level, snake) => !!at(level.bushes, snake[0]);

function bfsNext(level, cleared, from, to, stepNo) {
  if (same(from, to)) return null;
  const prev = new Map([[key(from.x, from.y), null]]);
  const q = [from];
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    for (const d of ORDER) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      const nk = key(n.x, n.y);
      if (prev.has(nk)) continue;
      const isGoal = same(n, to);
      if (blocks(level, cleared, n, stepNo, false)) continue;
      prev.set(nk, c);
      if (isGoal) {
        let cur = n, p = c;
        while (p && !same(p, from)) { cur = p; p = prev.get(key(p.x, p.y)); }
        return cur;
      }
      q.push(n);
    }
  }
  return null;
}

// Satu langkah semua penjaga (dihitung dari state SEBELUM penjaga bergerak, urutan indeks tetap). Mengembalikan guard baru + kejadian.
function advanceGuards(level, state, snake, stepNo, cleared) {
  const hidden = inBush(level, snake);
  const snakeCells = new Set(snake.map(p => key(p.x, p.y)));
  const events = { alerted: false, attacks: [] };
  const guards = state.guards.map((g, i) => {
    const spec = level.guards[i];
    const home = { x: spec.x, y: spec.y };
    if (g.hp === 0) return { ...g };
    if (g.cd > 0) return { ...g, cd: g.cd - 1 };
    if (g.mode === 'windup') {
      if (g.aim) events.attacks.push({ ...g.aim, guard: i });
      return { ...g, mode: 'recover', aim: null };
    }
    if (g.mode === 'recover') return { ...g, mode: 'return', aim: null };
    let mode = g.mode;
    const sees = !hidden && visionCells(level, state, g, stepNo).some(c => snakeCells.has(key(c.x, c.y)));
    let target = sees ? { ...snake[0] } : g.target;
    let memory = sees ? 3 : Math.max(0, (g.memory || 0) - 1);
    if ((mode === 'chase' || mode === 'alert') && (hidden || (!sees && !memory))) mode = 'return';
    else if (mode === 'alert') mode = 'chase';
    else if (mode !== 'chase' && sees) { mode = 'alert'; events.alerted = true; }
    let n = { ...g, mode, target, memory };
    if (mode === 'chase') {
      if (sees && Math.abs(g.x - snake[0].x) + Math.abs(g.y - snake[0].y) === 1) return { ...n, mode: 'windup', aim: { ...snake[0] }, dir: { x: snake[0].x - g.x, y: snake[0].y - g.y } };
      if (g.kind === 'slime' && stepNo % 2) return n;
      const nx = target && bfsNext(level, cleared, g, target, stepNo);
      if (nx && same(nx, snake[0])) n = { ...n, mode: 'windup', aim: { ...nx }, dir: { x: nx.x - g.x, y: nx.y - g.y } };
      else if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
      else n = { ...n, mode: 'return' };
    } else if (mode === 'return') {
      if (g.kind === 'slime' && stepNo % 2) return n;
      const nx = bfsNext(level, cleared, g, home, stepNo);
      if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
      if (same(n, home)) n = { ...n, mode: 'idle', dir: { ...(spec.patrol.length > 1 ? { x: spec.patrol[1].x - home.x, y: spec.patrol[1].y - home.y } : spec.dir) }, pi: 0, pd: 1 };
    } else if (mode === 'idle' && spec.patrol.length > 1) {
      if (g.kind === 'slime' && stepNo % 2) return n;
      let pi = g.pi + g.pd, pd = g.pd;
      if (pi >= spec.patrol.length) { pd = -1; pi = spec.patrol.length - 2; }
      else if (pi < 0) { pd = 1; pi = 1; }
      const np = spec.patrol[pi];
      if (!blocks(level, cleared, np, stepNo, false)) n = { ...n, x: np.x, y: np.y, dir: { x: np.x - g.x, y: np.y - g.y }, pi, pd };
    }
    if (n.mode === 'idle') {
      let next = n.pi + n.pd;
      if (next >= spec.patrol.length) next = spec.patrol.length - 2;
      else if (next < 0) next = 1;
      const look = spec.patrol[next];
      n.dir = look && !blocks(level, cleared, look, stepNo + 1, true) ? { x: look.x - n.x, y: look.y - n.y } : openFacing(level, n, cleared, stepNo + 1);
    }
    return n;
  });
  // Reservasi tujuan, tanpa tumpukan atau saling menembus. Prioritas bergilir.
  const occupied = new Set(state.guards.filter(g => g.hp !== 0).map(g => key(g.x, g.y))), reserved = new Set();
  for (let n = 0; n < guards.length; n++) {
    const i = (n + stepNo) % guards.length, g = guards[i], old = state.guards[i];
    if (g.hp === 0) continue;
    const dest = key(g.x, g.y);
    if (!same(g, old) && (occupied.has(dest) || reserved.has(dest) || same(g, snake[0]))) guards[i] = { ...g, x: old.x, y: old.y, pi: old.pi, pd: old.pd };
    reserved.add(key(guards[i].x, guards[i].y));
  }
  return { guards, events };
}

export function stepState(level, state, dirKey) {
  const waiting = dirKey === 'W';
  const d = waiting ? { x: 0, y: 0 } : DIRS[dirKey];
  const reject = (reason, detail) => ({ state, moved: false, reason, detail });
  if (!d) return reject('arah');
  if (state.status !== 'playing') return reject('selesai');
  const head = state.snake[0];
  const raw = { x: head.x + d.x, y: head.y + d.y };
  const clearedArr = state.cleared || [];
  const cleared = new Set(clearedArr);
  const stepNo = state.steps + 1;
  const outOrWall = raw.x < 0 || raw.y < 0 || raw.x >= level.w || raw.y >= level.h || isWall(level, raw);
  if (outOrWall) return reject('tembok');
  let target = raw, warped = false;
  for (const p of waiting ? [] : level.portals) {
    if (same(raw, p.a)) { target = { ...p.b }; warped = true; break; }
    if (same(raw, p.b)) { target = { ...p.a }; warped = true; break; }
  }
  if (warped && isWall(level, target)) return reject('tembok'); // dicegah validator; pengaman saja
  const enemy = (state.guards || []).findIndex(g => g.hp !== 0 && same(g, target));
  const attackAt = enemy >= 0 && !waiting ? { ...target } : null;
  if (attackAt) { target = { ...head }; warped = false; }
  const foodIdx = state.foods.findIndex(f => same(f, target));
  const collected = foodIdx !== -1;
  // rintangan pada sel tujuan (hanya dicek bila tidak lewat portal: validator melarang rintangan di atas portal)
  let hammer = state.hammer || 0, shield = state.shield || 0, hearts = state.hearts ?? 3, hurtUntil = state.hurtUntil || 0, newCleared = clearedArr;
  const tK = key(target.x, target.y);
  const gate = at(level.gates, target);
  if (gate && !same(target, head) && !gateOpen(gate, stepNo, state)) return reject('gerbang');
  if (at(level.cracks, target) && !cleared.has(tK)) {
    if (hammer <= 0) return reject('retak');
    hammer -= 1; newCleared = [...newCleared, tK];
  }
  if (at(level.spikes, target) && !cleared.has(tK)) {
    if (shield <= 0) return reject('duri');
    shield -= 1; newCleared = [...newCleared, tK];
  }
  const snake = [target];
  const plate = level.plates.find(p => same(p, target));
  const activated = plate && !(state.activated || []).includes(plate.id) ? [...(state.activated || []), plate.id].sort() : (state.activated || []);
  const lever = (level.levers || []).find(p => same(p, target));
  const leverGates = lever ? (level.links || []).filter(l => l.lever[0] === lever.x && l.lever[1] === lever.y).map(l => key(...l.gate)) : [];
  const leverOn = leverGates.some(k => !newCleared.includes(k));
  if (leverOn) newCleared = [...new Set([...newCleared, ...leverGates])].sort();
  const keyIdx = state.keys.findIndex(k => same(k, target));
  const keysHeld = state.keysHeld + (keyIdx !== -1 ? 1 : 0);
  const pk = (state.pickups || []).findIndex(p => same(p, target));
  if (pk !== -1) { if (state.pickups[pk].kind === 'hammer') hammer += 1; else if (state.pickups[pk].kind === 'heal') hearts = Math.min(3, hearts + 1); else shield += 1; }
  const atExit = same(target, level.exit);
  if (atExit) {
    const act = activePlates(level, { activated });
    const missing = level.exit.plates.filter(id => !act.includes(id));
    if (keysHeld < level.exit.keys || missing.length) return reject('pintu', { keysMissing: Math.max(0, level.exit.keys - keysHeld), missingPlates: missing });
  }
  const events = { ate: collected, switchOn: activated.length > (state.activated || []).length, leverOn, attackAt, hit: !!attackAt, defeated: false, hurt: false, key: keyIdx !== -1, warped, won: atExit, pickup: pk !== -1 ? state.pickups[pk].kind : null, stung: false, shielded: false, alerted: false };
  let guards = state.guards || [];
  if (attackAt) guards = guards.map((g, i) => {
    if (i !== enemy) return g;
    const hp = Math.max(0, (g.hp ?? level.guards[i].hp ?? 2) - 1);
    events.defeated = hp === 0;
    return { ...g, hp, mode: 'recover', aim: null };
  });
  let status = atExit ? 'won' : 'playing';
  if (!atExit && guards.length) {
    const clearedNow = new Set(newCleared);
    const adv = advanceGuards(level, { ...state, guards, cleared: newCleared }, snake, stepNo, clearedNow);
    guards = adv.guards;
    events.alerted = adv.events.alerted;
    const hits = adv.events.attacks.filter(a => same(a, target));
    if (hits.length && stepNo >= hurtUntil) {
      if (shield > 0) {
        shield -= 1; events.shielded = true;
        guards = guards.map((g, i) => hits.some(a => a.guard === i) ? { ...g, cd: GUARD_STUN, mode: 'idle', aim: null } : g);
      } else { hearts--; hurtUntil = stepNo + 2; events.hurt = true; if (hearts <= 0) { status = 'lost'; events.stung = true; } }
    }
  }
  return {
    moved: true, reason: null, events,
    state: {
      snake, dir: waiting ? { ...state.dir } : { ...d }, steps: stepNo, activated, apples: (state.apples || 0) + (collected ? 1 : 0),
      foods: collected ? state.foods.filter((_, i) => i !== foodIdx) : state.foods,
      keys: keyIdx !== -1 ? state.keys.filter((_, i) => i !== keyIdx) : state.keys,
      keysHeld, status, hammer, shield,
      pickups: pk !== -1 ? state.pickups.filter((_, i) => i !== pk) : (state.pickups || []),
      cleared: newCleared, guards, hearts, hurtUntil, defeated: (state.defeated || 0) + (events.defeated ? 1 : 0),
    },
  };
}

// ---------- sesi (state + riwayat undo) ----------
export function newSession(level) { return { level, state: initialState(level), history: [] }; }

export function move(session, dirKey) {
  const r = stepState(session.level, session.state, dirKey);
  if (!r.moved) return { session, ...r };
  return { session: { level: session.level, state: r.state, history: [...session.history, session.state] }, ...r };
}

export function undo(session) {
  if (!session.history.length) return { session, undone: false };
  const history = session.history.slice(0, -1);
  return { session: { level: session.level, state: session.history[session.history.length - 1], history }, undone: true };
}

export const restart = (session) => newSession(session.level);

// Penyelesaian paling singkat (BFS / A*) — dipakai test untuk membuktikan par & solvabilitas, dan oleh generator level.
// Encoding mencakup posisi, kunci, sakelar, pickup, item, rintangan terpecah,
// paritas langkah (bila ada gerbang), serta keadaan penjaga. Koin diabaikan karena tidak memengaruhi solusi.
export function solve(level, maxStates = 400000, stats) {
  const hasGates = (level.gates || []).some(g => g.open !== 'lever');
  const enc = s => s.snake.map(p => p.x + ':' + p.y).join('|') + '/' + s.keysHeld + '/' + (s.activated || []).join(',') + '/' + s.keys.map(f => f.x + ':' + f.y).join('|')
    + '/' + (s.hammer || 0) + (s.shield || 0) + '/' + (s.pickups || []).map(f => f.x + ':' + f.y).join('|') + '/' + (s.cleared || []).join('|')
    + '/' + s.hearts + ':' + Math.max(0, s.hurtUntil - s.steps)
    + (hasGates || level.guards.some(g => g.kind === 'slime') ? '/' + (s.steps % 2) : '') + (s.guards && s.guards.length ? '/' + s.guards.map(g => g.hp === 0 ? 'dead' : g.x + ':' + g.y + g.dir.x + g.dir.y + g.mode + g.pi + g.pd + g.cd + ':' + (g.target ? g.target.x + ',' + g.target.y : '-') + ':' + g.memory + ':' + g.hp + ':' + (g.aim ? g.aim.x + ',' + g.aim.y : '-')).join('|') : '');
  if (level.guards.length && !level.portals.length) return solveCombat(level, maxStates, stats, enc);
  const start = initialState(level);
  const seen = new Set([enc(start)]);
  let frontier = [{ s: start, path: '' }];
  let n = 0;
  while (frontier.length) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const k of (hasGates || level.guards.length ? ['U', 'D', 'L', 'R', 'W'] : ['U', 'D', 'L', 'R'])) {
        const r = stepState(level, s, k);
        if (!r.moved) continue;
        if (r.state.status === 'won') { if (stats) stats.states = (stats.states || 0) + n; return path + k; }
        if (r.state.status !== 'playing') continue;
        const e = enc(r.state);
        if (seen.has(e)) continue;
        seen.add(e);
        if (++n > maxStates) { if (stats) stats.states = (stats.states || 0) + n; return null; }
        next.push({ s: r.state, path: path + k });
      }
    }
    frontier = next;
  }
  if (stats) stats.states = (stats.states || 0) + n;
  return null;
}

// A* untuk combat: lower bound hanya menghitung jarak ke tujuan wajib dan mengabaikan rintangan.
// Portal tetap memakai BFS, karena jarak Manhattan bukan lower bound untuk teleport.
function solveCombat(level, maxStates, stats, enc) {
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const estimate = s => {
    const head = s.snake[0], exit = level.exit;
    let h = dist(head, exit);
    const required = level.plates.filter(p => exit.plates.includes(p.id) && !s.activated.includes(p.id));
    if (exit.keys - s.keysHeld >= s.keys.length) required.push(...s.keys);
    for (const p of required) h = Math.max(h, dist(head, p) + dist(p, exit));
    return h;
  };
  const heap = [], better = (a, b) => a.f < b.f || (a.f === b.f && (a.g > b.g || (a.g === b.g && a.order < b.order)));
  function push(item) {
    heap.push(item); let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!better(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; }
  }
  function pop() {
    const first = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let i = 0;
      for (;;) { let next = i; const l = i * 2 + 1, r = l + 1; if (l < heap.length && better(heap[l], heap[next])) next = l; if (r < heap.length && better(heap[r], heap[next])) next = r; if (next === i) break; [heap[i], heap[next]] = [heap[next], heap[i]]; i = next; }
    }
    return first;
  }
  const start = initialState(level), best = new Map([[enc(start), 0]]);
  let n = 0, order = 0;
  push({ s: start, path: '', g: 0, f: estimate(start), order: order++ });
  while (heap.length) {
    const current = pop();
    if (best.get(enc(current.s)) !== current.g) continue;
    if (current.s.status === 'won') { if (stats) stats.states = (stats.states || 0) + n; return current.path; }
    if (++n > maxStates) break;
    for (const k of ['U', 'D', 'L', 'R', 'W']) {
      const r = stepState(level, current.s, k);
      if (!r.moved || r.state.status === 'lost') continue;
      const id = enc(r.state), g = current.g + 1;
      if (best.has(id) && best.get(id) <= g) continue;
      best.set(id, g); push({ s: r.state, path: current.path + k, g, f: g + estimate(r.state), order: order++ });
    }
  }
  if (stats) stats.states = (stats.states || 0) + n;
  return null;
}
