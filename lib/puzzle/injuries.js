// NPC health is session state; damage never changes the authored level objects.
export const NPC_HEALTH = { guard: 100, corruptGuard: 120, dog: 70 };
export const SPIKE_DAMAGE = 35;
export const BLEED_DAMAGE = 5;
export const BLEED_SECONDS = 4;
export const POISON_DAMAGE = 2;
export const POISON_SECONDS = 10;

export function injuryState(kind) {
  const maxHp = NPC_HEALTH[kind];
  return { hp: maxHp, maxHp, bleedUntil: 0, bleedNextAt: 0, poisonUntil: 0, poisonNextAt: 0, hurtUntil: 0, spikeHits: {} };
}

export function killNpc(s, actor, reason = 'devoured') {
  if (actor.alive === false) return false;
  actor.hp = 0; actor.alive = false; actor.deathReason = reason;
  actor.suspicion = 0; actor.cameraReport = false; actor.alerted = false;
  actor.barkUntil = 0; actor.charge = null; actor.bleedUntil = 0; actor.bleedNextAt = 0;
  actor.poisonUntil = 0; actor.poisonNextAt = 0;
  actor.path = []; actor.intent = null; actor.yielding = null; actor.avoidTiles = null;
  for (const [key, claim] of Object.entries(s.traffic || {})) if (claim?.owner === actor.id) delete s.traffic[key];
  s.fx.push({ x: actor.x, y: actor.y, at: s.time, kind: reason });
  return true;
}

export function hurtNpc(s, actor, damage, reason) {
  if (actor.alive === false || damage <= 0) return false;
  actor.hp = Math.max(0, actor.hp - damage); actor.hurtUntil = s.time + .3;
  if (!actor.hp) killNpc(s, actor, reason);
  else s.fx.push({ x: actor.x, y: actor.y, at: s.time, kind: reason });
  return true;
}

export function spikeHit(s, actor, trap) {
  if (actor.alive === false) return;
  const pulse = Math.floor((s.time + trap.phase) / trap.period);
  const key = trap.id || `${trap.x},${trap.y}`;
  // updateTraps can run several times in one simulation tick. One physical
  // activation of each floor plate causes one wound, not damage per callback.
  if (actor.spikeHits[key] === pulse) return;
  actor.spikeHits[key] = pulse;
  hurtNpc(s, actor, SPIKE_DAMAGE, 'spikes');
  if (actor.alive === false) return;
  if (!actor.bleedNextAt) actor.bleedNextAt = s.time + 1;
  actor.bleedUntil = s.time + BLEED_SECONDS;
  actor.stunnedUntil = Math.max(actor.stunnedUntil, s.time + .4);
  actor.charge = null;
}

export function poisonNpc(s, actor) {
  if (actor.alive === false) return;
  if (!actor.poisonNextAt) actor.poisonNextAt = s.time + 1;
  actor.poisonUntil = s.time + POISON_SECONDS;
}

function tickInjury(s, actor, next, until, damage, reason) {
  while (actor.alive !== false && actor[next] && actor[next] <= s.time + 1e-8 && actor[next] <= actor[until] + 1e-8) {
    actor[next] += 1;
    hurtNpc(s, actor, damage, reason);
  }
  if (actor[next] > actor[until] + 1e-8) {
    actor[next] = 0;
    actor[until] = 0;
  }
}

export function updateInjuries(s) {
  for (const actor of [...s.guards, ...s.dogs]) {
    tickInjury(s, actor, 'bleedNextAt', 'bleedUntil', BLEED_DAMAGE, 'bleeding');
    tickInjury(s, actor, 'poisonNextAt', 'poisonUntil', POISON_DAMAGE, 'poison');
  }
}
