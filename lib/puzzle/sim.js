import { distance, tileKey, fits, moveBody, inVision, lineOfSight, rayDistance, soundField, TAU } from './geometry';
import { navigate, faceRoute, living, mobileActors } from './navigation';
import { updateDogs, updateBeasts, updateTraps } from './threats';

export const FIXED_DT = 1 / 60;
export const SPEEDS = { sneak: 1.45, walk: 2.4, run: 3.65 };
export const GUARD_STATES = ['PATROL', 'SUSPICIOUS', 'INVESTIGATE', 'CHASE', 'SEARCH', 'RETURN'];
export const GADGETS = ['stone', 'smoke', 'trap'];
export const GADGET_COOLDOWN = 10;
export const gadgetWait = (s, gadget = s.gadget) => Math.max(0, s.cooldowns[gadget] - s.time);
const clone = value => JSON.parse(JSON.stringify(value));
export function createState(level) {
  return {
    level, time: 0, status: 'playing', player: { ...level.spawn, facing: 0, hidden: false, moving: false, gait: 'walk', stride: 0 },
    guards: level.guards.map((g, i) => ({ ...clone(g), id: `guard-${i}`, home: { x: g.x, y: g.y }, state: 'PATROL', suspicion: 0, waypoint: g.route.length > 1 && distance(g, g.route[0]) < .1 ? 1 : 0, alive: true, stunnedUntil: 0, spikeSafeUntil: 0, searchFacing: g.facing, pause: g.pause || 0, timer: 0, lastKnown: null, path: [], pathTarget: '', pathAt: -9, blocked: 0, heard: 0, seenHide: null, searchIndex: 0 })),
    dogs: (level.dogs || []).map((d, i) => ({ ...clone(d), id: `dog-${i}`, home: { x: d.x, y: d.y }, alive: true, stunnedUntil: 0, spikeSafeUntil: 0, state: 'PATROL', suspicion: 0, waypoint: d.route.length > 1 ? 1 : 0, pause: 1.5, timer: 0, lastKnown: null, path: [], pathTarget: '', pathAt: -9, blocked: 0, heard: 0, lostFor: 0, barkAt: 0, barkUntil: 0, alerted: false })),
    beasts: (level.beasts || []).map(b => ({ ...b, home: { x: b.x, y: b.y }, state: 'IDLE', stunnedUntil: 0, readyAt: 0, until: 0 })),
    traps: [], cooldowns: { stone: 0, smoke: 0, trap: 0 }, coins: 0,
    crystals: level.crystals.map(c => ({ ...c, suspicion: 0, triggered: false })),
    keys: new Set(), collected: new Set(), opened: new Set(), activated: new Set(), gateTimers: {}, crossed: new Set(),
    artifacts: 0, loot: 0, alerts: 0, gadget: 'stone',
    noises: [], noiseId: 0, smoke: [], fx: [], events: [], message: level.tip, messageUntil: 7, footstep: 0, portalUntil: 0, result: null, cameraAlarm: false,
  };
}
export const newSession = level => ({ level, state: createState(level) });
export function note(s, message) { s.message = message; s.messageUntil = s.time + 3.5; }
export function noise(s, p, radius, intensity, duration, type) {
  s.noises.push({ id: ++s.noiseId, x: p.x, y: p.y, radius, intensity, duration, until: s.time + duration, type, field: soundField(s, p, radius) });
}
const effect = (s, p, kind) => s.fx.push({ x: p.x, y: p.y, kind, at: s.time });
export function isShadow(s, p) { return s.level.shadows.some(z => distance(z, p) <= z.radius); }
export function torchView(s, t) { return { ...t, facing: 0, fov: TAU }; }
export function isLit(s, p) { return s.level.torches.some(t => inVision(s, torchView(s, t), p)); }
export function canSeePlayer(s, g) {
  const p = s.player;
  if (!living(g) || g.stunnedUntil > s.time || !inVision(s, g, p)) return false;
  if (!p.hidden) return true;
  return distance(g, p) < .85 || (!!g.seenHide && distance(g.seenHide, p) < .6);
}
export function nearby(s) {
  const p = s.player;
  const choices = [
    ...s.level.doors.filter(d => d.kind === 'key' && !s.opened.has(d.id)).map(o => ({ ...o, type: 'door', label: `Buka pintu ${o.key.toUpperCase()}` })),
    ...s.level.levers.filter(o => !s.activated.has(o.id)).map(o => ({ ...o, type: 'lever', label: `Tarik tuas ${o.label}` })),
    ...s.level.portals.map(o => ({ ...o, type: 'portal', label: `Portal ${o.label}` })),
  ].filter(o => distance(o, p) <= (o.type === 'portal' ? .65 : 1.18) && lineOfSight(s, p, o, false));
  // Closed doors stop LOS at their edge; interaction only from a directly adjacent cell.
  for (const d of s.level.doors) if (d.kind === 'key' && !s.opened.has(d.id) && distance(d, p) < 1.2) {
    const a = Math.atan2(d.y - p.y, d.x - p.x), edge = { x: d.x - Math.cos(a) * .52, y: d.y - Math.sin(a) * .52 };
    if (lineOfSight(s, p, edge, false) && !choices.some(c => c.id === d.id)) choices.push({ ...d, type: 'door', label: `Buka pintu ${d.key.toUpperCase()}` });
  }
  return choices.sort((a, b) => distance(a, p) - distance(b, p))[0] || null;
}
export function hidingSpot(s) { return s.level.hides.find(h => distance(h, s.player) < .58) || null; }
export function action(s, type) {
  if (s.status !== 'playing') return false;
  const p = s.player;
  if (type === 'hide') {
    if (p.hidden) { p.hidden = false; note(s, 'Keluar dari persembunyian.'); return true; }
    if (!hidingSpot(s)) { note(s, 'Dekati ceruk bertanda F untuk bersembunyi.'); return false; }
    s.guards.forEach(g => { if (canSeePlayer(s, g) && g.suspicion > .2) g.seenHide = { x: p.x, y: p.y }; });
    p.hidden = true; note(s, 'Bersembunyi. Penjaga yang melihatmu masuk tetap bisa menemukanmu.'); return true;
  }
  if (type === 'cycle') { s.gadget = GADGETS[(GADGETS.indexOf(s.gadget) + 1) % GADGETS.length]; return true; }
  if (type === 'gadget') {
    const wait = gadgetWait(s);
    if (wait > 1e-7) { note(s, `Alat siap lagi dalam ${Math.ceil(wait)} detik.`); return false; }
    if (s.gadget === 'stone') {
      const d = Math.max(0, rayDistance(s, p, p.facing, 3.5, false) - .28);
      if (d < .7) { note(s, 'Arah lempar terhalang. Hadap ke ruang terbuka.'); return false; }
      const target = { x: p.x + Math.cos(p.facing) * d, y: p.y + Math.sin(p.facing) * d };
      noise(s, target, 6, 1, 1.4, 'stone'); effect(s, target, 'stone'); note(s, 'Batu memancing penjaga dan anjing. Batu siap lagi dalam 10 detik.');
    } else if (s.gadget === 'smoke') {
      s.smoke.push({ x: p.x, y: p.y, radius: 1.45, until: s.time + 4.5 });
      effect(s, p, 'smoke'); note(s, 'Asap memutus pandangan 4,5 detik. Asap siap lagi dalam 10 detik.');
    } else {
      if (p.hidden || s.traps.some(t => distance(t, p) < .6)) { note(s, 'Keluar dari ceruk dan cari lantai kosong untuk memasang trap.'); return false; }
      // Safe for the player; one use, finite lifetime, independent cooldown.
      s.traps.push({ x: p.x, y: p.y, armedAt: s.time + .3, until: s.time + 30, spent: false });
      note(s, 'Trap dipasang: menahan penjaga/anjing 4,5 detik atau bayangan 3 detik.');
    }
    s.cooldowns[s.gadget] = s.time + GADGET_COOLDOWN;
    return true;
  }
  if (type !== 'interact') return false;
  const o = nearby(s);
  if (!o) { note(s, 'Dekati pintu, tuas, atau portal untuk berinteraksi.'); return false; }
  if (o.type === 'door') {
    if (!s.keys.has(o.key)) { note(s, `Perlu kunci ${o.key.toUpperCase()} yang cocok.`); return false; }
    s.opened.add(o.id); noise(s, o, 3.5, .7, .6, 'door'); note(s, `Pintu ${o.key.toUpperCase()} terbuka.`);
  } else if (o.type === 'lever') {
    s.activated.add(o.id); o.doors.forEach(id => s.opened.add(id)); noise(s, o, 3, .7, .7, 'lever'); note(s, `Tuas ${o.label}: gerbang terbuka permanen.`);
  } else if (s.time >= s.portalUntil) {
    const dest = s.level.portals.find(q => q.id === o.pair);
    if (!dest || !fits(s, dest.x, dest.y)) return false;
    p.x = dest.x; p.y = dest.y; p.hidden = false; s.portalUntil = s.time + 1; note(s, 'Melewati portal. Periksa sekitar sebelum bergerak.');
  } else return false;
  effect(s, o, 'open'); return true;
}
function change(g, state, timer = 0) {
  if (g.state !== state) { g.state = state; g.path = []; g.pathTarget = ''; g.pathAt = -9; }
  g.timer = timer;
  if (state === 'SEARCH') g.searchFacing = g.facing;
}
function alarm(s, g) {
  if (g.state !== 'CHASE') { s.alerts++; s.events.push('alarm'); note(s, 'Terlihat! Putus pandangan, lalu cari jalan keluar.'); }
  change(g, 'CHASE'); g.cameraReport = false; g.suspicion = 1; g.lastKnown = { x: s.player.x, y: s.player.y }; g.lostFor = 0;
}
function cameraAlert(s) {
  s.alerts++; s.events.push('alarm');
  const target = { x: s.player.x, y: s.player.y };
  for (const g of s.guards.filter(living)) {
    // A remote report gives a location, not permanent knowledge of the player.
    change(g, 'INVESTIGATE', 60); g.lastKnown = { ...target };
    g.suspicion = Math.max(.65, g.suspicion); g.cameraReport = true;
    g.heard = s.noiseId; g.seenHide = null;
  }
  note(s, 'Terdeteksi CCTV! Semua penjaga menuju lokasi terakhirmu. Putus sorot dan pindah tempat.');
}
function updateGuard(s, g, dt) {
  if (!living(g) || g.stunnedUntil > s.time) return;
  const sees = canSeePlayer(s, g), p = s.player;
  if (sees) {
    const multiplier = (p.gait === 'run' ? 1.5 : p.gait === 'sneak' ? .72 : 1) * (isShadow(s, p) && !isLit(s, p) ? .42 : isLit(s, p) ? 1.4 : 1);
    g.suspicion = Math.min(1, g.suspicion + dt * multiplier / .9);
    g.lastKnown = { x: p.x, y: p.y };
    if (g.suspicion >= 1) alarm(s, g);
    else if (g.state === 'PATROL' || g.state === 'RETURN') change(g, 'SUSPICIOUS', .65);
  } else g.suspicion = Math.max(0, g.suspicion - dt * .22);
  if (g.state !== 'CHASE' && !g.cameraReport) for (const n of s.noises) {
    if (n.id > g.heard && n.intensity >= .3 && n.field.has(tileKey(g.x, g.y))) {
      g.heard = n.id; g.lastKnown = { x: n.x, y: n.y }; change(g, 'SUSPICIOUS', .45); g.suspicion = Math.max(.18, g.suspicion);
    }
  }
  g.timer -= dt;
  if (g.state === 'PATROL') {
    if (g.pause > 0) g.pause -= dt;
    else {
      const t = g.route[g.waypoint];
      if (navigate(s, g, t, g.speed, dt)) { g.waypoint = (g.waypoint + 1) % g.route.length; g.pause = g.dwell; faceRoute(s, g, g.route[g.waypoint]); }
    }
  } else if (g.state === 'SUSPICIOUS') {
    if (g.lastKnown) g.facing = Math.atan2(g.lastKnown.y - g.y, g.lastKnown.x - g.x);
    if (g.timer <= 0) change(g, 'INVESTIGATE', 5);
  } else if (g.state === 'INVESTIGATE') {
    if (navigate(s, g, g.lastKnown, g.speed * (g.cameraReport ? 1.4 : 1.12), dt) || g.timer <= 0) { g.cameraReport = false; change(g, 'SEARCH', 3.8); }
  } else if (g.state === 'CHASE') {
    if (sees) { g.lastKnown = { x: p.x, y: p.y }; g.lostFor = 0; }
    else g.lostFor += dt;
    const arrived = navigate(s, g, g.lastKnown, g.speed * 1.65, dt);
    if (!sees && (arrived || g.lostFor > 2.2)) change(g, 'SEARCH', 4.5);
  } else if (g.state === 'SEARCH') {
    g.facing = g.searchFacing + Math.sin(s.time * 2) * .55;
    if (g.seenHide && distance(g, g.seenHide) > .5) navigate(s, g, g.seenHide, g.speed, dt);
    if (g.timer <= 0) { g.seenHide = null; g.suspicion = 0; change(g, 'RETURN'); }
  } else if (g.state === 'RETURN') {
    if (navigate(s, g, g.route[g.waypoint], g.speed, dt)) { change(g, 'PATROL'); g.waypoint = (g.waypoint + 1) % g.route.length; g.pause = .4; faceRoute(s, g, g.route[g.waypoint]); }
  }
  if (s.traps.some(t=>!t.spent&&distance(g,t)<.46)) updateTraps(s,threatEffects);
  if (g.stunnedUntil <= s.time && distance(g, p) < .43 && lineOfSight(s, g, p, false) && (!p.hidden || g.seenHide || sees)) {
    lose(s, 'Tertangkap penjaga. Gunakan perlindungan dan perhatikan arah pandangnya.');
  }
}
function lose(s, reason) {
  if (s.status !== 'playing') return;
  s.status = 'lost'; s.lossReason = reason; note(s, reason); s.events.push('caught');
}
const threatEffects = { noise, note, lose };
export function rating(s) {
  return s.alerts === 0 ? (s.loot === s.level.loot.length && s.time <= s.level.par ? 3 : 2) : 1;
}
export function step(s, input = {}, dt = FIXED_DT) {
  if (s.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return s;
  dt = Math.min(dt, .05); s.time += dt; s.events = [];
  s.noises = s.noises.filter(n => n.until > s.time); s.smoke = s.smoke.filter(c => c.until > s.time); s.fx = s.fx.filter(f => s.time - f.at < .8);
  const p = s.player, gait = input.sneak ? 'sneak' : input.run ? 'run' : input.gait || 'walk';
  p.gait = SPEEDS[gait] ? gait : 'walk';
  let x = Number.isFinite(input.x) ? input.x : 0, y = Number.isFinite(input.y) ? input.y : 0;
  const norm = Math.hypot(x, y); if (norm > 1) { x /= norm; y /= norm; }
  p.moving = false;
  if (!p.hidden && norm > .05) {
    p.facing = Math.atan2(y, x); const old = { x: p.x, y: p.y };
    moveBody(s, p, x * SPEEDS[p.gait] * dt, y * SPEEDS[p.gait] * dt);
    p.moving = distance(p, old) > .001; if (p.moving) p.stride += dt * SPEEDS[p.gait];
  }
  if (p.moving) {
    s.footstep -= dt;
    if (s.footstep <= 0) {
      s.footstep = p.gait === 'run' ? .34 : .6;
      const radii = { sneak: .45, walk: 1.6, run: 4.5 };
      noise(s, p, radii[p.gait], p.gait === 'sneak' ? .12 : .6, .5, 'footstep');
      if (p.gait === 'run' && s.level.bells.some(b => distance(p, b) < .9)) { noise(s, p, 8, 1, 1.3, 'bell'); note(s, 'Lonceng bergema! Lari di dekat lonceng mengundang penjaga.'); }
    }
  }
  for (const item of [...s.level.keys, ...s.level.artifacts, ...s.level.loot]) {
    if (!s.collected.has(item.id) && distance(p, item) < .48) {
      s.collected.add(item.id);
      if (item.kind === 'key') { s.keys.add(item.key); note(s, `Kunci ${item.key.toUpperCase()} ditemukan.`); }
      else if (item.kind === 'artifact') { s.artifacts++; note(s, s.artifacts === s.level.artifacts.length ? 'Relik lengkap. Kembali ke pintu keluar!' : 'Relik ditemukan. Cari relik berikutnya.'); }
      else { const value = item.value || 1; s.loot++; s.coins += value; note(s, `+${value} Apple Coin. Bawa keluar untuk menyimpannya.`); }
      effect(s, item, item.kind); s.events.push('pickup');
    }
  }
  for (const plate of s.level.plates) {
    if (distance(p, plate) < .55) { s.gateTimers[plate.door] = s.time + plate.duration; s.opened.add(plate.door); }
    const door = s.level.doors.find(d => d.id === plate.door);
    if (s.opened.has(plate.door) && distance(p, door) < .55) { s.crossed.add(plate.door); s.opened.add(plate.door); }
    if (!s.crossed.has(plate.door) && (s.gateTimers[plate.door] || 0) < s.time && ![p, ...mobileActors(s), ...s.beasts].some(a => distance(a, door) < .8)) s.opened.delete(plate.door);
  }
  updateTraps(s, threatEffects);
  if (s.status !== 'playing') return s;
  let cameraSees = false;
  for (const c of s.crystals) {
    c.facing = c.baseFacing + Math.sin(s.time * c.rate + c.phase) * c.sweep;
    const seen = !p.hidden && inVision(s, c, p);
    c.suspicion = seen ? 1 : 0; c.triggered = seen;
    cameraSees ||= seen;
  }
  if (cameraSees && !s.cameraAlarm) cameraAlert(s);
  // While watched, the network updates all guards. Once occluded, this position freezes.
  if (cameraSees) for (const g of s.guards.filter(living)) {
    g.lastKnown = { x: p.x, y: p.y };
    if (g.state !== 'CHASE') { change(g, 'INVESTIGATE', 60); g.cameraReport = true; }
  }
  s.cameraAlarm = cameraSees;
  updateBeasts(s, dt, threatEffects);
  if (s.status === 'playing') updateDogs(s, dt, threatEffects);
  for (const g of s.guards) { if (s.status !== 'playing') break; updateGuard(s, g, dt); }
  if (s.status === 'playing') updateTraps(s, threatEffects);
  if (s.status === 'playing' && distance(p, s.level.exit) < .5 && s.artifacts === s.level.artifacts.length) {
    s.status = 'won'; s.result = { time: s.time, stars: rating(s), loot: s.loot, coinReward: s.coins, alerts: s.alerts }; s.events.push('win');
  }
  return s;
}
