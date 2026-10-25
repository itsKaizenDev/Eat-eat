// Sim event names have different meanings: a boss 'hit' is outgoing damage,
// while 'death' is a player losing a heart. Keep that distinction in one place.
export function battleAudioEvent(e) {
  if (e.type === 'attack') return e.stage === 'tele' ? 'windup' : e.stage === 'active' ? 'strike' : null;
  if (e.type === 'hit' || e.type === 'minionHit') return 'bosshit';
  if (e.type === 'death') return 'hurt';
  if (e.type === 'window') return e.open ? 'weak' : null;
  if (e.type === 'round') return e.boss ? 'bossintro' : 'round';
  return ['phase','heal','damageOrb','shieldGain'].includes(e.type) ? e.type : null;
}
