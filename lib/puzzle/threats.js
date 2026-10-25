import { createRng } from '../sim/rng';
import { distance, tileKey, lineOfSight, rayDistance, findPath } from './geometry';
import { living, mobileActors, navigate, faceRoute } from './navigation';

export function spikePhase(s, trap) {
  const phase = (s.time + trap.phase) % trap.period;
  return phase < trap.active ? 'active' : phase > trap.period - .7 ? 'warning' : 'safe';
}
export function dogSees(s, dog) {
  return living(dog) && dog.stunnedUntil <= s.time && !s.player.hidden && distance(dog, s.player) <= dog.range && lineOfSight(s, dog, s.player);
}
function change(dog, state, timer = 0) {
  if (dog.state !== state) { dog.path = []; dog.pathAt = -9; dog.pathTarget = ''; }
  dog.state = state; dog.timer = timer;
}
function tetherTarget(s, dog, target) {
  if (!dog.tethered) return target;
  const a = Math.atan2(target.y - dog.home.y, target.x - dog.home.x);
  const d = Math.min(distance(dog.home, target), dog.leash - .04, Math.max(0, rayDistance(s, dog.home, a, dog.leash, false) - .24));
  return { x: dog.home.x + Math.cos(a) * d, y: dog.home.y + Math.sin(a) * d };
}
export function updateDogs(s, dt, { noise, note, lose }) {
  for (const dog of s.dogs) {
    if (!living(dog) || dog.stunnedUntil > s.time) continue;
    perceiveBeasts(s, dog);
    if (dog.reactingUntil > s.time) continue;
    const tether = dog.tethered ? p => distance(dog.home, p) <= dog.leash && lineOfSight(s, dog.home, p, false) : null;
    const escape = escapeBeast(s, dog, tether);
    if (escape) { navigate(s, dog, escape, dog.speed, dt, tether); continue; }
    const sees = dogSees(s, dog);
    dog.suspicion = Math.max(0, Math.min(1, dog.suspicion + dt * (sees ? 2 : -.5)));
    dog.timer -= dt;
    if (sees) {
      dog.lastKnown = { x: s.player.x, y: s.player.y }; dog.lostFor = 0;
      if (dog.suspicion >= 1) {
        if (!dog.alerted) { dog.alerted = true; s.alerts++; s.events.push('alarm'); }
        change(dog, 'CHASE');
        if (s.time >= dog.barkAt) {
          dog.barkAt = s.time + 2.5; dog.barkUntil = s.time + .6;
          noise(s, dog, 8, 1, 1.2, 'bark'); s.events.push('bark'); note(s, 'Anjing menggonggong! Penjaga di sekitar memeriksa sumber suara.');
        }
      }
    } else dog.lostFor += dt;
    if (dog.state !== 'CHASE') for (const n of s.noises) {
      if (n.id > dog.heard && ['stone', 'footstep'].includes(n.type) && n.intensity >= .6 && n.field.has(tileKey(dog.x, dog.y))) {
        dog.heard = n.id; dog.lastKnown = { x: n.x, y: n.y }; change(dog, 'INVESTIGATE', 4);
      }
    }
    const limit = dog.tethered ? p => distance(dog.home, p) <= dog.leash && lineOfSight(s, dog.home, p, false) : null;
    if (dog.state === 'CHASE' || dog.state === 'INVESTIGATE') {
      navigate(s, dog, tetherTarget(s, dog, dog.lastKnown), dog.state === 'CHASE' ? dog.speed : dog.speed * .55, dt, limit);
      if ((dog.state === 'CHASE' && !sees && dog.lostFor > 2.8) || (dog.state === 'INVESTIGATE' && dog.timer <= 0)) change(dog, 'SEARCH', 2);
    } else if (dog.state === 'SEARCH') {
      if (dog.timer <= 0) { dog.alerted = false; change(dog, 'RETURN'); }
    } else if (dog.state === 'RETURN') {
      if (navigate(s, dog, dog.home, dog.speed * .5, dt, limit)) { change(dog, 'PATROL'); dog.pause = .8; }
    } else if (!dog.tethered) {
      if (dog.pause > 0) dog.pause -= dt;
      else if (navigate(s, dog, dog.route[dog.waypoint], dog.speed * .35, dt)) {
        dog.waypoint = (dog.waypoint + 1) % dog.route.length; dog.pause = 1.1; faceRoute(s, dog, dog.route[dog.waypoint]);
      }
    }
    if (s.traps.some(t=>!t.spent&&distance(dog,t)<.46)) updateTraps(s,{note,lose});
    if (dog.stunnedUntil <= s.time && distance(dog, s.player) < .43 && !s.player.hidden && lineOfSight(s, dog, s.player, false)) lose(s, 'Tertangkap anjing penjaga. Putus pandangan, gunakan asap, atau pasang trap.');
    if (s.status !== 'playing') break;
  }
}

export function laneDistance(beast, p) {
  return { along: (p.x - beast.home.x) * beast.dx + (p.y - beast.home.y) * beast.dy,
    across: Math.abs((p.x - beast.home.x) * beast.dy - (p.y - beast.home.y) * beast.dx) };
}
function segmentDistance(p, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.y - from.y) * dy) / length)) : 0;
  return Math.hypot(p.x - from.x - t * dx, p.y - from.y - t * dy);
}
// ---- Monster ecosystem. Every kind eats any eligible creature (player, guards, dogs). ----
const eligible = s => [s.player, ...mobileActors(s)].filter(a => !a.hidden);
const slay = (s, actor, lose, reason, fx) => {
  if (actor === s.player) lose(s, reason);
  else { actor.alive = false; actor.suspicion = 0; actor.cameraReport = false; s.fx.push({ x: actor.x, y: actor.y, at: s.time, kind: fx }); }
};
export function beastTiles(b) {
  if (b.kind === 'shadow') return Array.from({ length: b.length + 1 }, (_, i) => tileKey(b.home.x + b.dx * i, b.home.y + b.dy * i));
  const c = b.kind === 'mimic' ? b.mouth : b, r = b.kind === 'mimic' ? b.trigger : b.web, out = [];
  for (let y = Math.floor(c.y - r); y <= Math.floor(c.y + r); y++) for (let x = Math.floor(c.x - r); x <= Math.floor(c.x + r); x++) if (Math.hypot(x + .5 - c.x, y + .5 - c.y) <= r) out.push(`${x},${y}`);
  return out;
}
const dangerous = b => b.kind === 'shadow' ? b.state === 'WINDUP' || b.state === 'RUSH' : b.state === 'WINDUP' || b.state === 'TELEGRAPH' || b.state === 'STRIKE' || b.state === 'BITE';
// A creature learns a monster's reach only by watching it act nearby; memory fades, so avoidance never becomes a permanent fear loop.
export function perceiveBeasts(s, a) {
  a.known ||= {}; a.beastSeen ||= {};
  a.reactingUntil = 0;
  for (const b of s.beasts) if (dangerous(b) && distance(a, b.home) <= 6 && lineOfSight(s, a, b.kind === 'mimic' ? b.mouth : b.home, false)) {
    const stamp = b.warnedAt ?? b.until;
    if (a.beastSeen[b.id]?.stamp !== stamp) {
      a.beastSeen[b.id] = { stamp, ready: s.time + (a.id.startsWith('dog') ? .12 : .2), evaded: false };
      s.events.push('anticipate');
    }
    const seen = a.beastSeen[b.id];
    if (s.time < seen.ready) a.reactingUntil = Math.max(a.reactingUntil, seen.ready);
    else a.known[b.id] = s.time + 25;
  }
  const tiles = new Set();
  for (const b of s.beasts) if ((a.known[b.id] || 0) > s.time) beastTiles(b).forEach(t => tiles.add(t));
  a.avoidTiles = tiles.size ? tiles : null;
}
// React only to a visible attack warning. This lets busy rooms contain monsters
// without routine patrols suiciding; stunned or cornered creatures can still die.
export function escapeBeast(s, a, limit = null) {
  const threats = s.beasts.filter(b => dangerous(b) && (a.known?.[b.id] || 0) > s.time && a.beastSeen?.[b.id]?.ready <= s.time);
  const hit = p => threats.some(b => {
    if (b.kind === 'shadow' || !b.kind) { const d = laneDistance(b,p); return d.along >= -.4 && d.along <= b.length + .4 && d.across < .65; }
    if (b.kind === 'mimic') return distance(p,b.mouth) < b.reach + .4;
    return b.mark && distance(p,b.mark) < b.strike + .4;
  });
  if (!hit(a)) return null;
  const pool = [], occupied = mobileActors(s).filter(o => o !== a);
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    const p = { x: Math.floor(a.x) + x + .5, y: Math.floor(a.y) + y + .5 };
    if (!hit(p) && (!limit || limit(p)) && occupied.every(o => distance(o,p) > .7)) {
      const path = findPath(s,a,p);
      if (path?.length && path.length <= 5 && (!limit || path.every(limit))) pool.push({p,path});
    }
  }
  const target = pool.sort((a,b)=>a.path.length-b.path.length)[0]?.p || null;
  if (target) for (const b of threats) { const seen = a.beastSeen[b.id]; if (!seen.evaded) { seen.evaded = true; a.evadingUntil = s.time + .45; s.events.push('evade'); } }
  return target;
}
function updateShadow(s, beast, dt, { note, lose }) {
  const prey = eligible(s);
  if (beast.state === 'IDLE') {
    if (s.time < beast.readyAt) return;
    const target = prey.find(a => { const p = laneDistance(beast, a); return p.along >= -.2 && p.along <= beast.length && p.across < .42 && lineOfSight(s, beast.home, a, false); });
    if (target) { beast.state = 'WINDUP'; beast.until = s.time + (beast.windup || 1.2); beast.warnedAt = s.time; beast.hitAny = false; s.events.push('windup'); note(s, 'Bayangan meregang! Keluar dari jalurnya sebelum menerjang.'); }
  } else if (beast.state === 'WINDUP') {
    if (s.time >= beast.until) { beast.state = 'RUSH'; s.events.push('strike'); }
  } else if (beast.state === 'RUSH') {
    const before = { x: beast.x, y: beast.y }, along = laneDistance(beast, beast).along;
    const max = Math.max(0, Math.min(beast.length, rayDistance(s, beast.home, Math.atan2(beast.dy, beast.dx), beast.length + .3, false) - .24));
    const next = Math.min(max, along + beast.speed * dt);
    const end = { x: beast.home.x + beast.dx * next, y: beast.home.y + beast.dy * next };
    // Swept contacts prevent tunnelling at rush speed and let a trap stop the
    // creature BEFORE it can hit prey farther down the same segment.
    const hits = [
      ...s.traps.filter(t => !t.spent && t.until > s.time && s.time >= t.armedAt && segmentDistance(t, before, end) < .45).map(t => ({ actor: t, trap: true })),
      ...prey.filter(a => segmentDistance(a, before, end) < .43).map(a => ({ actor: a, trap: false })),
    ].sort((a, b) => distance(before, a.actor) - distance(before, b.actor) || Number(b.trap) - Number(a.trap));
    let stopped = false;
    for (const hit of hits) {
      if (!lineOfSight(s, before, hit.actor, false)) continue;
      if (hit.trap) {
        hit.actor.spent = true; beast.stunnedUntil = s.time + 3; beast.state = 'RETURN';
        const stop = Math.max(along, Math.min(next, laneDistance(beast, hit.actor).along));
        beast.x = beast.home.x + beast.dx * stop; beast.y = beast.home.y + beast.dy * stop;
        stopped = true; note(s, 'Trap menahan bayangan selama 3 detik. Segera menyingkir!'); break;
      }
      beast.hitAny = true; slay(s, hit.actor, lose, 'Diterkam bayangan. Jalurnya tetap: tunggu serbuan lewat atau pindah ke samping.', 'devoured');
    }
    if (!stopped) { beast.x = end.x; beast.y = end.y; if (next >= max - .001) { beast.state = 'RETURN'; if (!beast.hitAny) s.events.push('miss'); } }
  } else if (beast.state === 'RETURN') {
    const next = Math.max(0, laneDistance(beast, beast).along - 2.3 * dt);
    beast.x = beast.home.x + beast.dx * next; beast.y = beast.home.y + beast.dy * next;
    if (next === 0) { beast.state = 'IDLE'; beast.readyAt = s.time + 2.5; }
  }
}
// Peniru: a chest that bites anything reaching its mouth, or a thrown stone landing beside it.
function updateMimic(s, b, dt, { note, lose }) {
  const prey = eligible(s);
  if (b.state === 'IDLE') {
    if (s.time < b.readyAt) return;
    const bait = s.noises.find(n => n.type === 'stone' && n.id > (b.heard || 0) && distance(n, b.mouth) <= 2.2);
    if (bait) b.heard = bait.id;
    const target = prey.find(a => distance(a, b.mouth) <= b.trigger && lineOfSight(s, b.mouth, a, false));
    if (bait || target) { b.state = 'WINDUP'; b.warnedAt = s.time; s.events.push('windup'); b.until = s.time + b.windup; if (target === s.player || bait) note(s, 'Peti itu bergerak! Itu Peniru. Mundur sebelum menggigit.'); }
  } else if (b.state === 'WINDUP') {
    if (s.time >= b.until) {
      s.events.push('strike'); b.state = 'BITE'; b.until = s.time + .25;
      let hits = 0; for (const a of prey) if (distance(a, b.mouth) <= b.reach && lineOfSight(s, b.mouth, a, false)) { hits++; slay(s, a, lose, 'Digigit Peniru. Peti yang mengintip itu bukan peti biasa.', 'devoured'); } if (!hits) s.events.push('miss');
    }
  } else if (b.state === 'BITE') {
    if (s.time >= b.until) { b.state = 'RECOVER'; b.until = s.time + b.recover; }
  } else if (b.state === 'RECOVER') {
    if (s.time >= b.until) { b.state = 'IDLE'; b.readyAt = s.time + 1; }
  }
}
// Laba-laba Sarang: webs slow everyone in the nest radius; the drop is telegraphed on the floor first.
function updateSpider(s, b, dt, { note, lose }) {
  const prey = eligible(s);
  if (b.state === 'IDLE') {
    const target = prey.find(a => distance(a, b) <= b.web && lineOfSight(s, b, a, false));
    b.watch = target ? (b.watch || 0) + dt : 0;
    if (target && b.watch >= .5) { b.state = 'TELEGRAPH'; b.warnedAt = s.time; s.events.push('windup'); b.mark = { x: target.x, y: target.y }; b.until = s.time + b.windup; b.watch = 0; if (target === s.player) note(s, 'Laba-laba turun ke lingkaran di lantai! Menyingkir dari tanda itu.'); }
  } else if (b.state === 'TELEGRAPH') {
    if (s.time >= b.until) {
      s.events.push('strike'); b.state = 'STRIKE'; b.until = s.time + .3;
      let hits = 0; for (const a of prey) if (distance(a, b.mark) <= b.strike) { hits++; slay(s, a, lose, 'Disambar laba-laba sarang. Keluar dari lingkaran tanda sebelum ia turun.', 'devoured'); } if (!hits) s.events.push('miss');
    }
  } else if (b.state === 'STRIKE') {
    if (s.time >= b.until) { b.state = 'RECOVER'; b.until = s.time + b.recover; }
  } else if (b.state === 'RECOVER') {
    if (s.time >= b.until) { b.state = 'IDLE'; b.watch = 0; }
  }
}
export function updateBeasts(s, dt, effects) {
  for (const beast of s.beasts) {
    if (beast.stunnedUntil > s.time) continue;
    if (beast.kind === 'mimic') updateMimic(s, beast, dt, effects);
    else if (beast.kind === 'spider') updateSpider(s, beast, dt, effects);
    else updateShadow(s, beast, dt, effects);
  }
}

export function updateTraps(s, { note, lose }) {
  for (const trap of s.traps) {
    if (trap.spent || s.time < trap.armedAt || trap.until <= s.time) continue;
    const victim = mobileActors(s).find(a => distance(a, trap) < .46 && lineOfSight(s, a, trap, false));
    if (victim) { victim.stunnedUntil = s.time + 4.5; victim.path = []; victim.pathAt = -9; trap.spent = true; note(s, 'Trap menahan musuh selama 4,5 detik.'); }
  }
  s.traps = s.traps.filter(t => !t.spent && t.until > s.time);
  for (const trap of s.level.hazards || []) {
    if (spikePhase(s, trap) !== 'active') continue;
    if (!s.player.hidden && distance(s.player, trap) < .4) lose(s, 'Terkena duri lantai. Tunggu pelat padam; warna kuning menandai duri akan naik.');
    for (const actor of mobileActors(s)) if (distance(actor, trap) < .4 && actor.spikeSafeUntil <= s.time) {
      actor.stunnedUntil = s.time + 2; actor.spikeSafeUntil = s.time + trap.period;
    }
  }
}

// Dungeon boss mechanics live separately from ambient wildlife.
export { BOSS_RULES, bossHp, bossRules, createBoss, updateBoss } from './boss';
