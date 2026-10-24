import { getMode } from './modes/registry';

export const WORLD_RATIO = 680 / 600;

// HUD and thumb controls overlay the arena; Dungeon owns the entire surface.
export function arenaLayout(width, height, { touch = false, actions = false } = {}) {
  if (actions) return { rail: false, left: 0, top: 0, width, height };
  const rail = width >= 600 && height <= 500;
  const gutter = rail ? 164 : (touch && width > height ? 172 : actions && width >= 1100 ? 170 : 8);
  const top = rail ? 8 : 112;
  const bottom = rail ? 8 : touch ? 154 : actions && width < 1100 ? 116 : 14;
  const availableW = Math.max(1, width - gutter * 2);
  const availableH = Math.max(1, height - top - bottom);
  const w = Math.min(1120, availableW, availableH * WORLD_RATIO);
  const h = w / WORLD_RATIO;
  return { rail, left: (width - w) / 2, top: top + (availableH - h) / 2, width: w, height: h };
}

export function gameView(mode, h) {
  const meta = getMode(mode);
  const stats = [], signals = [];
  const add = (icon, label, value, danger = false) => stats.push({ icon, label, value, danger });
  let message = '', suspicion = null, cargo = null;
  if (h.boss && (meta?.kind === 'boss' || meta?.kind === 'roguelite')) {
    const b = h.boss;
    add('boss', 'Ronde', `${b.round}/${b.rounds}`);
    add('heart', 'Nyawa', b.lives);
    add('bolt', 'Energi', `${b.energy}/${b.need}`);
    add('boss', b.isBoss ? `Fase ${b.phase}` : 'Antek', b.isBoss ? `${b.phaseHp}/${b.phaseMaxHp} HP` : `${b.minionsLeft}/${b.minionsTotal}`);
    signals.push({ icon: b.weak.status === 'open' ? 'key' : 'lock', label: b.weak.status === 'open' ? `Celah ${b.weak.secs}d · ${b.weak.ready ? 'Serang!' : 'Butuh energi'}` : b.weak.status === 'done' ? 'Celah sudah kena' : 'Celah terkunci', danger: b.weak.status === 'open' });
    signals.push({ icon: 'eye', label: b.stage });
    if (b.invulnSecs > 0) signals.push({ icon: 'shield', label: `Kebal ${b.invulnSecs}d` });
    if (b.isBoss && b.phase === 3) signals.push({ icon: 'shield', label: `Perisai ${b.shield}/${b.shieldMax} · Pukulan ${b.playerDamage}` });
    message = b.message;
  } else if (meta?.kind === 'puzzle' && h.puzzle) {
    const p = h.puzzle;
    add('puzzle', 'Ruang', `${p.levelNo}/${p.levelCount}`);
    add('gift', 'Relik', `${p.artifacts}/${p.artifactsTotal}`);
    add('timeattack', 'Waktu', p.time);
    add('normal', 'Apel', `${p.coins}/${p.coinTotal}`);
    signals.push({ icon: 'eye', label: p.statusText, danger: p.cameraAlarm || p.suspicion > 70 });
    if (p.artifacts === p.artifactsTotal) signals.push({ icon: 'exit', label: 'Ke pintu keluar' });
    suspicion = p.suspicion; message = p.message;
  } else if (meta?.kind === 'delivery' && h.delivery) {
    const d = h.delivery;
    add('timeattack', 'Shift', d.timeText);
    add('delivery', 'Terkirim', `${d.delivered}/${d.target}`);
    cargo = d.cargo; message = d.message;
  } else if (meta?.kind === 'roguelite' && h.roguelite) {
    const r = h.roguelite;
    add('roguelite', 'Rute', `${r.round}/${r.rounds}`);
    add('trophy', 'Target', `${r.roundScore}/${r.target}`);
    add('shield', 'Perisai', r.shield);
    add('flask', 'Penawar', r.neutral);
    if (r.reviveSecs > 0) signals.push({ icon: 'shield', label: `Kebal ${r.reviveSecs}d` });
    message = r.message;
  } else if (meta?.kind === 'territory' && h.territory) {
    const t = h.territory;
    add('timeattack', 'Waktu', t.timeText);
    t.players.forEach(p => add('territory', `P${p.id} · ${p.lives} nyawa`, `${p.pct}%`));
    signals.push({ icon: 'territory', label: `Target ${t.targetPct}%` }); message = t.message;
  } else if (meta?.players === 2 && h.mpHud) {
    const p = h.mpHud;
    add('multiplayer', `P1 · ${p.p1Lives} nyawa`, p.p1Label);
    add('multiplayer', `P2 · ${p.p2Lives} nyawa`, p.p2Label);
  } else {
    add('trophy', 'Skor', h.score ?? 0);
    if (mode === 'timeattack') add('timeattack', 'Waktu', h.timerText || '—', /^0:(0\d|10)$/.test(h.timerText || ''));
  }
  (h.effects || []).forEach(e => signals.push({ icon: e.type, label: `${e.label}${e.t ? ` · ${e.t}` : ''}` }));
  return { stats, signals, message, suspicion, cargo };
}
