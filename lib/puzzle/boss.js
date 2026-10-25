import { createRng } from '../sim/rng';
import { findPath, distance, fits } from './geometry';

export const BOSS_RULES = {
  lives: 5, invuln: 2.5, initialGap: 3, transition: 2.8, weakRadius: 1.5, reward: 50,
  attacks: {
    row: { name: 'Palu batu', hint: 'Keluar dari jalur palu.', tele: 1.6, active: .65, rec: .45, beats: 1 },
    mines: { name: 'Benih retak', hint: 'Cari sela di antara retakan.', tele: 1.9, active: 1.4, rec: .45, beats: 1 },
    corridor: { name: 'Gerbang runtuh', hint: 'Masuk jalur lantai yang tidak ditandai.', tele: 2.5, active: .9, rec: .5, beats: 1 },
    sweep: { name: 'Sapu tiga jalur', hint: 'Tiga hantaman bergeser. Ikuti tanda berikutnya.', tele: 1.6, active: .5, rec: .3, beats: 3 },
    pursuit: { name: 'Tatapan pemburu', hint: 'Tanda mengunci posisimu. Bergerak setelah terkunci; asap menyamarkanmu.', tele: 1.5, active: .5, rec: .3, beats: 3 },
    quake: { name: 'Gema cincin', hint: 'Cincin merambat keluar. Menyeberang setelah hantaman lewat.', tele: 1.6, active: .5, rec: .35, beats: 3 },
    cross: { name: 'Salib pecah', hint: 'Dua garis berpotongan. Keluar ke salah satu kuadran.', tele: 1.8, active: .7, rec: .4, beats: 1 },
    cage: { name: 'Sangkar bergilir', hint: 'Dua petak perlindungan bergantian. Cari lantai tanpa tanda.', tele: 2.5, active: .7, rec: .4, beats: 2 },
  },
  phases: [
    { name: 'Batu terbangun', mechanic: 'touch', hp: 3, pool: ['row', 'mines', 'sweep'], window: 7, gap: 1.6, pace: 1, openings: 1, damage: 1, mines: 5, combo: 1 },
    { name: 'Segel berdenyut', mechanic: 'hold', hp: 4, pool: ['pursuit', 'quake', 'mines'], window: 8, gap: 1.4, pace: .95, openings: 1, damage: 1, mines: 7, combo: 1 },
    { name: 'Urutan rune', mechanic: 'sequence', hp: 5, pool: ['cross', 'sweep', 'corridor'], window: 10, gap: 1.2, pace: .9, openings: 2, damage: 1, mines: 8, combo: 1 },
    { name: 'Rantai penjaga', mechanic: 'chains', hp: 6, pool: ['cage', 'pursuit', 'quake', 'cross'], window: 12, gap: 1, pace: .85, openings: 3, damage: 2, mines: 9, combo: 1 },
    { name: 'Inti mengamuk', mechanic: 'finale', hp: 8, pool: ['sweep', 'pursuit', 'cage', 'quake', 'cross', 'corridor'], window: 11, gap: .8, pace: .8, openings: 3, damage: 2, mines: 10, combo: 2 },
  ],
};
export const bossHp = () => BOSS_RULES.phases.reduce((n, p) => n + p.hp, 0);
export const bossRules = s => BOSS_RULES.phases[Math.min(5, s.boss.phase) - 1];
const tile = p => `${Math.floor(p.x)},${Math.floor(p.y)}`;
const shuffled = (items, rng) => { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
export function createBoss(level) {
  // Every accessible tile participates, including the entrance and relic gallery.
  const floor = [];
  level.map.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') floor.push({ x, y }); }));
  return { phase: 1, hp: bossHp(), maxHp: bossHp(), phaseHp: BOSS_RULES.phases[0].hp, state: 'GAP', until: BOSS_RULES.initialGap,
    attack: null, last: null, danger: new Set(), targets: [], used: [], charge: 0, chargeTarget: null, bag: [], combo: 0,
    lives: 5, maxLives: 5, invulnUntil: 0, heals: [], defeated: false, floor, rng: createRng(level.number * 7919 + 17), hits: 0,
    lastSeen: { ...level.spawn }, countered: false, counter: null, interrupted: false, dampened: false };
}
export function bossHint(s) {
  const b = s.boss; if (!b) return '';
  if (b.defeated) return 'Penjaga tumbang. Ambil relik, lalu kembali ke pintu keluar.';
  if (b.state === 'TRANSITION') return `Fase ${b.phase}: ${bossRules(s).name}. Ambil jantung hijau bila perlu.`;
  if (b.state === 'WINDOW') {
    const kind = bossRules(s).mechanic;
    if (kind === 'hold') return 'Diam di rune bercahaya sampai lingkaran penuh.';
    if (kind === 'chains') return b.used.length < 2 ? 'Aktifkan dua rune samping untuk memutus rantai.' : 'Rantai putus! Injak rune inti di tengah.';
    if (kind === 'sequence' || kind === 'finale') return `Ikuti rune ${b.used.length + 1} → ${b.used.length + 2}${kind === 'finale' ? '; tahan rune terakhir.' : '.'}`;
    return 'Celah terbuka! Injak rune bercahaya untuk menyerang.';
  }
  if (b.state === 'TELE' || b.state === 'ACTIVE') return `${b.attack.name} ${b.attack.beat + 1}/${b.attack.beats} · ${b.attack.hint}`;
  return `Fase ${b.phase} · ${bossRules(s).name}. Bersiap untuk pola berikutnya.`;
}
function pattern(s, attack) {
  const b = s.boss, g = s.level.boss, r = bossRules(s), z = g.zone, beat = attack.beat;
  const cx = (z.x0 + z.x1 + 1) / 2, cy = (z.y0 + z.y1 + 1) / 2;
  const axis = p => attack.horizontal ? p.y : p.x;
  const lo = attack.horizontal ? z.y0 : z.x0, hi = attack.horizontal ? z.y1 : z.x1;
  const width = hi - lo + 1;
  let contains;
  if (attack.kind === 'row') contains = p => Math.abs(axis(p) - attack.line) <= .6;
  else if (attack.kind === 'sweep') {
    const band = Math.floor((axis({ x: s.player.x, y: s.player.y }) - lo) / (width / 3));
    if (beat === 0) attack.startBand = Math.max(0, Math.min(2, band));
    const target = (attack.startBand + beat * attack.direction + 3) % 3;
    contains = p => Math.min(2, Math.floor((axis(p) - lo) / (width / 3))) === target;
  } else if (attack.kind === 'corridor') contains = p => Math.abs(axis(p) - attack.line) > 1.5;
  else if (attack.kind === 'pursuit') {
    attack.mark = { ...b.lastSeen }; contains = p => distance(p, attack.mark) < 1.9;
  } else if (attack.kind === 'quake') contains = p => { const d = Math.hypot(p.x - cx, p.y - cy); return d >= beat * 2 && d < (beat + 1) * 2; };
  else if (attack.kind === 'cross') { attack.mark = { ...b.lastSeen }; contains = p => Math.abs(p.x - attack.mark.x) < .8 || Math.abs(p.y - attack.mark.y) < .8; }
  else if (attack.kind === 'cage') {
    const side = beat === 0 ? attack.direction : -attack.direction;
    attack.mark = { x: cx + side * 3, y: cy }; contains = p => distance(p, attack.mark) > 3;
  } else {
    const options = shuffled(b.floor.filter(t => distance({ x: t.x + .5, y: t.y + .5 }, s.player) > 1.5), b.rng);
    return new Set(options.slice(0, r.mines).map(t => `${t.x},${t.y}`));
  }
  return new Set(b.floor.filter(t => contains({ x: t.x + .5, y: t.y + .5 })).map(t => `${t.x},${t.y}`));
}
function telegraph(s, effects) {
  const b = s.boss, r = bossRules(s); b.danger = pattern(s, b.attack);
  // Measure the actual route out, including pillars, so no telegraph demands a teleport.
  // The mark is frozen now; it never follows the player during this telegraph.
  let escape = Infinity; b.escapeTarget = null;
  if (!b.danger.has(tile(s.player))) escape = 0;
  else for (const t of b.floor) if (!b.danger.has(`${t.x},${t.y}`)) {
    const at = { x: t.x + .5, y: t.y + .5 };
    if (distance(at, s.player) / 2.4 > escape) continue;
    const path = findPath(s, s.player, at);
    if (path) { let d = 0, from = s.player; for (const p of path) { d += distance(from, p); from = p; } if (d / 2.4 < escape) { escape = d / 2.4; b.escapeTarget = at; } }
  }
  if (!Number.isFinite(escape)) { b.danger.clear(); escape = 0; }
  s.events.push('windup'); b.state = 'TELE'; b.startedAt = s.time;
  b.until = s.time + Math.max(1.15, b.attack.tele * r.pace, escape + .65);
  b.teleDuration = b.until - s.time;
  effects.note(s, `${b.attack.name} · ${b.attack.beat + 1}/${b.attack.beats}. ${b.attack.hint}`);
}
function planAttack(s, effects) {
  const b = s.boss, r = bossRules(s), z = s.level.boss.zone;
  if (!b.bag.length) {
    b.bag = shuffled(r.pool, b.rng);
    if (b.bag[0] === b.last && b.bag.length > 1) [b.bag[0], b.bag[1]] = [b.bag[1], b.bag[0]];
  }
  const kind = b.bag.shift(), horizontal = b.rng() < .5, lo = horizontal ? z.y0 : z.x0, hi = horizontal ? z.y1 : z.x1;
  b.attack = { kind, ...BOSS_RULES.attacks[kind], horizontal, line: lo + 2 + Math.floor(b.rng() * Math.max(1, hi - lo - 3)), beat: 0, direction: b.rng() < .5 ? 1 : -1 };
  b.last = kind; b.counter = s.level.boss.weak[b.rng() < .5 ? 1 : 2];
  telegraph(s, effects);
}
function openWindow(s, effects) {
  const b = s.boss, r = bossRules(s), order = shuffled([0, 1, 2], b.rng);
  b.targets = r.mechanic === 'chains' ? [1, 2, 0] : order.slice(0, r.openings);
  b.used = []; b.charge = 0; b.chargeTarget = null; b.danger.clear(); b.counter = null;
  s.events.push('weak'); b.state = 'WINDOW'; b.until = s.time + r.window; effects.note(s, bossHint(s));
}
function hurt(s, damage, effects) {
  const b = s.boss; b.lives = Math.max(0, b.lives - damage); b.invulnUntil = s.time + BOSS_RULES.invuln;
  s.events.push('hurt'); s.fx.push({ ...s.player, at: s.time, kind: 'hurt' });
  if (!b.lives) effects.lose(s, 'Nyawa habis. Perhatikan tanda lantai sebelum tiap hantaman.');
  else effects.note(s, `Kena! Nyawa ${b.lives}/${b.maxLives}. ${b.attack.hint}`);
}
function hit(s, index, effects) {
  const b = s.boss, r = bossRules(s), w = s.level.boss.weak[index];
  b.used.push(index); b.charge = 0; b.chargeTarget = null;
  const damage = r.mechanic === 'chains' ? (index === 0 ? 3 : 0) : 1;
  if (!damage) { s.events.push('chain'); effects.note(s, bossHint(s)); return; }
  const actual = Math.min(damage, b.phaseHp); b.hp -= actual; b.phaseHp -= actual; b.hits += actual;
  s.events.push('bosshit'); s.fx.push({ ...w, at: s.time, kind: 'bosshit' });
  if (b.phaseHp > 0) { effects.note(s, bossHint(s)); return; }
  b.targets = []; b.danger.clear(); b.counter = null;
  if (b.phase === 5) { b.defeated = true; b.state = 'DEFEATED'; b.heals = []; effects.note(s, bossHint(s)); s.events.push('bossdown'); return; }
  b.phase++; b.phaseHp = bossRules(s).hp; b.bag = []; b.combo = 0; b.state = 'TRANSITION'; b.until = s.time + BOSS_RULES.transition;
  b.invulnUntil = Math.max(b.invulnUntil, b.until);
  const spots = b.floor.map(f => ({ x: f.x + .5, y: f.y + .5 })).filter(p => distance(p, s.player) > 1.8 && distance(p, s.player) < 5 && fits(s, p.x, p.y) && findPath(s, s.player, p));
  if (spots.length) b.heals = [{ ...spots[Math.floor(b.rng() * spots.length)] }];
  s.events.push('phase'); effects.note(s, bossHint(s));
}
export function updateBoss(s, dt, effects) {
  const b = s.boss; if (!b) return;
  const t = s.time, p = s.player, r = bossRules(s);
  if (!s.smoke.some(c => c.until > t && distance(p, c) < c.radius)) b.lastSeen = { x: p.x, y: p.y };
  b.heals = b.heals.filter(h => { if (distance(h, p) >= .55 || b.lives >= b.maxLives) return true; b.lives = Math.min(b.maxLives, b.lives + 1); s.events.push('heal'); effects.note(s, `Nyawa pulih ${b.lives}/${b.maxLives}.`); return false; });
  if (b.defeated) return;
  if (b.interrupted && b.state === 'TELE') { b.interrupted = false; b.combo = r.combo; openWindow(s, effects); return; }
  if (b.state === 'GAP' && t >= b.until) planAttack(s, effects);
  else if (b.state === 'TELE' && t >= b.until) { s.events.push('strike'); b.state = 'ACTIVE'; b.startedAt = t; b.until = t + b.attack.active; }
  else if (b.state === 'ACTIVE') {
    if (t >= b.invulnUntil && b.danger.has(tile(p))) hurt(s, r.damage, effects);
    if (s.status !== 'playing') return;
    // A placed trap absorbs one pulse and buys time for the next warning.
    const trap = !b.dampened && s.traps.find(v => !v.spent && v.armedAt <= t && b.danger.has(tile(v)));
    if (trap) { trap.spent = true; b.dampened = true; effects.note(s, 'Trap meredam hantaman: tanda berikutnya lebih lama.'); }
    if (t >= b.until) { b.state = 'RECOVER'; b.until = t + b.attack.rec; b.danger.clear(); }
  } else if (b.state === 'RECOVER' && t >= b.until) {
    if (++b.attack.beat < b.attack.beats) { telegraph(s, effects); if (b.dampened) b.until += .8; }
    else if (++b.combo < r.combo) planAttack(s, effects);
    else openWindow(s, effects);
  } else if (b.state === 'WINDOW') {
    const remaining = b.targets.filter(i => !b.used.includes(i));
    const ordered = ['sequence', 'finale'].includes(r.mechanic);
    const eligible = r.mechanic === 'chains' && b.used.length < 2 ? remaining.filter(i => i !== 0) : ordered ? remaining.slice(0, 1) : remaining;
    const index = eligible.find(i => distance(p, s.level.boss.weak[i]) <= BOSS_RULES.weakRadius);
    const hold = r.mechanic === 'hold' || r.mechanic === 'finale' && remaining.length === 1;
    if (index === undefined || t > b.until) { b.charge = 0; b.chargeTarget = null; }
    else if (!hold) hit(s, index, effects);
    else { if (b.chargeTarget !== index) b.charge = 0; b.chargeTarget = index; b.charge += dt; if (b.charge + 1e-9 >= .7) hit(s, index, effects); }
    if (b.state === 'WINDOW' && (t >= b.until || b.used.length >= b.targets.length)) {
      b.state = 'GAP'; b.until = t + r.gap; b.targets = []; b.charge = 0; b.combo = 0; b.countered = false; b.dampened = false;
    }
  } else if (b.state === 'TRANSITION' && t >= b.until) {
    b.state = 'GAP'; b.until = t + r.gap; b.countered = false; b.dampened = false;
  }
}

// Stone counter uses its real throw endpoint, aim and the normal ten-second cooldown.
export function counterBoss(s, target) {
  const b = s.boss;
  if (!b || b.state !== 'TELE' || b.countered || !b.counter || distance(target, b.counter) > .9) return false;
  b.countered = true; b.interrupted = true; s.events.push('counter'); return true;
}
