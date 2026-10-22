import { distance, tileKey, lineOfSight, rayDistance } from './geometry';
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
export function updateBeasts(s, dt, { note, lose }) {
  for (const beast of s.beasts) {
    if (beast.stunnedUntil > s.time) continue;
    const prey = [s.player, ...mobileActors(s)].filter(a => !a.hidden);
    if (beast.state === 'IDLE') {
      if (s.time < beast.readyAt) continue;
      const target = prey.find(a => { const p = laneDistance(beast, a); return p.along >= -.2 && p.along <= beast.length && p.across < .42 && lineOfSight(s, beast.home, a, false); });
      if (target) { beast.state = 'WINDUP'; beast.until = s.time + .8; note(s, 'Bayangan bergerak! Keluar dari garis merah sebelum diterjang.'); }
    } else if (beast.state === 'WINDUP') {
      if (s.time >= beast.until) beast.state = 'RUSH';
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
        if (hit.actor === s.player) lose(s, 'Diterkam bayangan. Jalurnya tetap: tunggu serbuan lewat atau pindah ke samping.');
        else { hit.actor.alive = false; hit.actor.suspicion = 0; hit.actor.cameraReport = false; s.fx.push({ x: hit.actor.x, y: hit.actor.y, at: s.time, kind: 'devoured' }); }
      }
      if (!stopped) { beast.x = end.x; beast.y = end.y; if (next >= max - .001) beast.state = 'RETURN'; }
    } else if (beast.state === 'RETURN') {
      const next = Math.max(0, laneDistance(beast, beast).along - 2.3 * dt);
      beast.x = beast.home.x + beast.dx * next; beast.y = beast.home.y + beast.dy * next;
      if (next === 0) { beast.state = 'IDLE'; beast.readyAt = s.time + 2.5; }
    }
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
