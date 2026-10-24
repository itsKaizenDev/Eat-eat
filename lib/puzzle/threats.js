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
  a.known ||= {};
  for (const b of s.beasts) if (dangerous(b) && distance(a, b.home) <= 6 && lineOfSight(s, a, b.kind === 'mimic' ? b.mouth : b.home, false)) a.known[b.id] = s.time + 25;
  const tiles = new Set();
  for (const b of s.beasts) if ((a.known[b.id] || 0) > s.time) beastTiles(b).forEach(t => tiles.add(t));
  a.avoidTiles = tiles.size ? tiles : null;
}
// React only to a visible attack warning. This lets busy rooms contain monsters
// without routine patrols suiciding; stunned or cornered creatures can still die.
export function escapeBeast(s, a, limit = null) {
  const threats = s.beasts.filter(b => dangerous(b) && (a.known?.[b.id] || 0) > s.time);
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
  return pool.sort((a,b)=>a.path.length-b.path.length)[0]?.p || null;
}
function updateShadow(s, beast, dt, { note, lose }) {
  const prey = eligible(s);
  if (beast.state === 'IDLE') {
    if (s.time < beast.readyAt) return;
    const target = prey.find(a => { const p = laneDistance(beast, a); return p.along >= -.2 && p.along <= beast.length && p.across < .42 && lineOfSight(s, beast.home, a, false); });
    if (target) { beast.state = 'WINDUP'; beast.until = s.time + (beast.windup || 1.2); beast.warnedAt = s.time; note(s, 'Bayangan meregang! Keluar dari jalurnya sebelum menerjang.'); }
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
      slay(s, hit.actor, lose, 'Diterkam bayangan. Jalurnya tetap: tunggu serbuan lewat atau pindah ke samping.', 'devoured');
    }
    if (!stopped) { beast.x = end.x; beast.y = end.y; if (next >= max - .001) beast.state = 'RETURN'; }
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
    if (bait || target) { b.state = 'WINDUP'; b.until = s.time + b.windup; if (target === s.player || bait) note(s, 'Peti itu bergerak! Itu Peniru. Mundur sebelum menggigit.'); }
  } else if (b.state === 'WINDUP') {
    if (s.time >= b.until) {
      b.state = 'BITE'; b.until = s.time + .25;
      for (const a of prey) if (distance(a, b.mouth) <= b.reach && lineOfSight(s, b.mouth, a, false)) slay(s, a, lose, 'Digigit Peniru. Peti yang mengintip itu bukan peti biasa.', 'devoured');
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
    if (target && b.watch >= .5) { b.state = 'TELEGRAPH'; b.mark = { x: target.x, y: target.y }; b.until = s.time + b.windup; b.watch = 0; if (target === s.player) note(s, 'Laba-laba turun ke lingkaran di lantai! Menyingkir dari tanda itu.'); }
  } else if (b.state === 'TELEGRAPH') {
    if (s.time >= b.until) {
      b.state = 'STRIKE'; b.until = s.time + .3;
      for (const a of prey) if (distance(a, b.mark) <= b.strike) slay(s, a, lose, 'Disambar laba-laba sarang. Keluar dari lingkaran tanda sebelum ia turun.', 'devoured');
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

// ---- Penjaga Relik Agung: Adventure's health / attack loop (HP per phase, telegraph, big weak window) in the Dungeon arena. ----
export const BOSS_RULES = {
  lives: 5, invuln: 2.5, initialGap: 3, transition: 2.4, weakRadius: 1.5, reward: 50,
  attacks: { row: { tele: 1.6, active: .8, rec: .6 }, mines: { tele: 2, active: 3, rec: .5 }, corridor: { tele: 2.5, active: 2, rec: .7 } },
  phases: [
    { hp: 3, pool: ['row', 'mines'], window: 7, gap: 1.8, pace: 1, openings: 1, damage: 1, mines: 4 },
    { hp: 4, pool: ['row', 'mines', 'corridor'], window: 6.5, gap: 1.5, pace: .9, openings: 1, damage: 1, mines: 6 },
    { hp: 5, pool: ['row', 'mines', 'corridor'], window: 6, gap: 1.2, pace: .8, openings: 2, damage: 1, mines: 8 },
    { hp: 6, pool: ['row', 'mines', 'corridor'], window: 5.5, gap: 1, pace: .7, openings: 2, damage: 2, mines: 10 },
    { hp: 8, pool: ['row', 'mines', 'corridor'], window: 5, gap: .8, pace: .6, openings: 3, damage: 2, mines: 12 },
  ],
};
export const bossHp = () => BOSS_RULES.phases.reduce((n, p) => n + p.hp, 0);
export function createBoss(level) {
  const z = level.boss.zone, floor = [];
  for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) if (level.map[y][x] === '.') floor.push({ x, y });
  return { phase: 1, hp: bossHp(), maxHp: bossHp(), phaseHp: BOSS_RULES.phases[0].hp, state: 'GAP', until: BOSS_RULES.initialGap, attack: null, last: null, danger: new Set(), targets: [], used: [],
    lives: BOSS_RULES.lives, maxLives: BOSS_RULES.lives, invulnUntil: 0, heals: [], defeated: false, floor, rng: createRng(level.number * 7919 + 17), hits: 0 };
}
export const bossRules = s => BOSS_RULES.phases[Math.min(BOSS_RULES.phases.length, s.boss.phase) - 1];
const bossKey = (x, y) => `${x},${y}`;
function planAttack(s) {
  const b = s.boss, rules = bossRules(s), z = s.level.boss.zone, pick = b.rng, danger = new Set();
  const pool = rules.pool.filter(k => k !== b.last), kind = pool[Math.floor(pick() * pool.length)], horizontal = pick() < .5, p = s.player;
  const inBand = (t, lo, hi) => (horizontal ? t.y : t.x) >= lo && (horizontal ? t.y : t.x) <= hi;
  if (kind === 'row') { const lo = (horizontal ? z.y0 : z.x0) + Math.floor(pick() * ((horizontal ? z.y1 - z.y0 : z.x1 - z.x0) - 1)); b.floor.filter(t => inBand(t, lo, lo + 1)).forEach(t => danger.add(bossKey(t.x, t.y))); }
  else if (kind === 'corridor') { const lo = (horizontal ? z.y0 : z.x0) + 1 + Math.floor(pick() * ((horizontal ? z.y1 - z.y0 : z.x1 - z.x0) - 3)); b.floor.filter(t => !inBand(t, lo, lo + 2)).forEach(t => danger.add(bossKey(t.x, t.y))); }
  else {
    const weak = s.level.boss.weak, options = b.floor.filter(t => Math.hypot(t.x + .5 - p.x, t.y + .5 - p.y) > 1.8 && weak.every(w => Math.hypot(t.x + .5 - w.x, t.y + .5 - w.y) > BOSS_RULES.weakRadius + .4));
    for (let i = 0; i < rules.mines && options.length; i++) { const t = options.splice(Math.floor(pick() * options.length), 1)[0]; danger.add(bossKey(t.x, t.y)); }
  }
  b.attack = { kind, ...BOSS_RULES.attacks[kind] }; b.last = kind; b.danger = danger;
  b.state = 'TELE'; b.until = s.time + Math.max(1.1, b.attack.tele * rules.pace);
}
function hurt(s, damage, why, { note, lose }) {
  const b = s.boss; b.lives = Math.max(0, b.lives - damage); b.invulnUntil = s.time + BOSS_RULES.invuln; s.events.push('hurt');
  s.fx.push({ x: s.player.x, y: s.player.y, at: s.time, kind: 'hurt' });
  if (b.lives <= 0) lose(s, `Nyawa habis diserang penjaga. ${why}`); else note(s, `Kena! Nyawa ${b.lives}/${b.maxLives}. ${why}`);
}
export function updateBoss(s, dt, effects) {
  const b = s.boss; if (!b) return;
  const t = s.time, p = s.player, rules = bossRules(s), { note } = effects;
  b.heals = b.heals.filter(h => { if (Math.hypot(h.x - p.x, h.y - p.y) < .55) { b.lives = Math.min(b.maxLives, b.lives + 1); note(s, `Nyawa pulih ${b.lives}/${b.maxLives}.`); return false; } return true; });
  if (b.defeated) return;
  if (b.state === 'GAP' && t >= b.until) planAttack(s);
  else if (b.state === 'TELE' && t >= b.until) { b.state = 'ACTIVE'; b.until = t + b.attack.active; note(s, 'Serangan menghantam! Menyingkir dari area merah.'); }
  else if (b.state === 'ACTIVE') {
    if (t >= b.invulnUntil && b.danger.has(bossKey(Math.floor(p.x), Math.floor(p.y)))) hurt(s, rules.damage, 'Hindari area merah.', effects);
    if (s.status === 'playing' && t >= b.until) { b.state = 'RECOVER'; b.until = t + b.attack.rec; b.danger = new Set(); }
  } else if (b.state === 'RECOVER' && t >= b.until) {
    const order = [0, 1, 2].sort(() => b.rng() - .5); b.targets = order.slice(0, rules.openings); b.used = [];
    b.state = 'WINDOW'; b.until = t + rules.window; note(s, 'Celah terbuka! Injak lingkaran bercahaya di depan penjaga.');
  } else if (b.state === 'WINDOW') {
    for (const i of b.targets) {
      const w = s.level.boss.weak[i];
      if (b.used.includes(i) || Math.hypot(w.x - p.x, w.y - p.y) > BOSS_RULES.weakRadius) continue;
      b.used.push(i); b.hp--; b.phaseHp--; b.hits++; s.events.push('bosshit'); s.fx.push({ x: w.x, y: w.y, at: t, kind: 'bosshit' });
      if (b.phaseHp <= 0) {
        if (b.phase >= BOSS_RULES.phases.length) { b.defeated = true; b.state = 'DEFEATED'; b.targets = []; note(s, 'Penjaga tumbang! Relik Agung terbuka. Ambil, lalu kembali ke pintu keluar.'); s.events.push('bossdown'); return; }
        b.phase++; b.phaseHp = bossRules(s).hp; b.state = 'TRANSITION'; b.until = t + BOSS_RULES.transition; b.targets = []; b.invulnUntil = Math.max(b.invulnUntil, t + BOSS_RULES.transition);
        const spot = b.floor.filter(f => Math.hypot(f.x + .5 - p.x, f.y + .5 - p.y) > 3)[Math.floor(b.rng() * 40) % Math.max(1, b.floor.length)];
        if (spot) b.heals.push({ x: spot.x + .5, y: spot.y + .5 });
        note(s, `Fase ${b.phase}/${BOSS_RULES.phases.length}! Penjaga makin ganas. Ambil jantung hijau untuk memulihkan nyawa.`); s.events.push('phase'); return;
      }
      note(s, `Pukulan masuk! HP penjaga ${b.hp}/${b.maxHp}.`);
    }
    if (b.state === 'WINDOW' && (t >= b.until || b.used.length >= b.targets.length)) { b.state = 'GAP'; b.until = t + (b.used.length >= b.targets.length ? .6 : 0) + rules.gap; b.targets = []; }
  } else if (b.state === 'TRANSITION' && t >= b.until) { b.state = 'GAP'; b.until = t + bossRules(s).gap; }
}
