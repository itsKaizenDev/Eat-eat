export const DUNGEON_TOOLS = {
  stone: { name: 'Batu', icon: 'stone', cooldown: 10 },
  smoke: { name: 'Asap', icon: 'flask', cooldown: 10 },
  trap: { name: 'Trap Racun', icon: 'plate', cooldown: 10 },
  stealthPotion: { name: 'Ramuan Stealth', icon: 'dark', cooldown: 22 },
  ward: { name: 'Perisai Relik', icon: 'shield', cooldown: 24 },
  frost: { name: 'Gelombang Beku', icon: 'slow', cooldown: 18 },
};

export function potionActive(s) { return s.player.stealthUntil > s.time; }

export function absorbHit(s, note) {
  const p = s.player;
  if (p.wardGraceUntil > s.time) return true;
  if (p.wardUntil <= s.time) return false;
  p.wardUntil = 0;
  p.wardGraceUntil = s.time + .65;
  s.fx.push({ x: p.x, y: p.y, at: s.time, kind: 'ward' });
  s.events.push('chain');
  note(s, 'Perisai Relik pecah menahan serangan.');
  return true;
}
