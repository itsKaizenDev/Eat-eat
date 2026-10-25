import { BOSS_RULES, bossRules } from './boss';
import { circle, rounded, text } from './art';
const TAU = Math.PI * 2;
export function bossGround(c, s) {
  const b = s.boss, g = s.level.boss; if (!b) return;
  c.save();
  if (b.state === 'TELE' || b.state === 'ACTIVE') {
    const active = b.state === 'ACTIVE';
    for (const key of b.danger) {
      const [x, y] = key.split(',').map(Number);
      c.globalAlpha = active ? .68 : .24 + .09 * Math.sin(s.time * 10);
      c.fillStyle = active ? '#ed5756' : '#ecae6a'; c.fillRect(x + .05, y + .05, .9, .9);
      c.globalAlpha = active ? .9 : .65; c.strokeStyle = active ? '#ffe1ca' : '#ffdb98'; c.lineWidth = .04;
      c.beginPath(); c.moveTo(x + .2, y + .3); c.lineTo(x + .8, y + .7); c.moveTo(x + .2, y + .7); c.lineTo(x + .8, y + .3); c.stroke();
    }
    if (b.attack.mark) { c.globalAlpha = 1; circle(c, b.attack.mark.x, b.attack.mark.y, .3, null, '#ffe0a0'); }
    if (b.state === 'TELE' && b.counter && !b.countered) {
      c.globalAlpha = 1; circle(c, b.counter.x, b.counter.y, .36, '#245a67', '#92f7ed');
      text(c, 'Q', b.counter.x, b.counter.y, .33, '#c4fff2');
      c.strokeStyle = '#92f7ed'; c.lineWidth = .06; c.beginPath(); c.arc(b.counter.x, b.counter.y, .48, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, (b.until - s.time) / b.teleDuration)); c.stroke();
    }
  }
  c.globalAlpha = 1;
  if (!b.defeated) g.weak.forEach((w, i) => {
    const next = b.targets.filter(j => !b.used.includes(j)), at = next.indexOf(i), ordered = ['sequence', 'finale'].includes(bossRules(s).mechanic), chained = bossRules(s).mechanic === 'chains';
    const open = b.state === 'WINDOW' && at >= 0, ready = open && (!ordered || at === 0) && (!chained || (i === 0 ? b.used.length === 2 : true)), done = b.state === 'WINDOW' && b.used.includes(i);
    const color = ready ? '#ffe49b' : done ? '#85dabd' : open ? '#a1c7d5' : '#788f90';
    c.globalAlpha = ready ? .17 : .055; circle(c, w.x, w.y, BOSS_RULES.weakRadius, color);
    c.globalAlpha = ready ? 1 : .4; c.strokeStyle = color; c.lineWidth = ready ? .07 : .035; c.setLineDash(ready ? [] : [.13, .14]);
    c.beginPath(); c.arc(w.x, w.y, BOSS_RULES.weakRadius, 0, TAU); c.stroke(); c.setLineDash([]);
    if (open && !chained) text(c, String(b.targets.indexOf(i) + 1), w.x, w.y - .15, .48, color);
    if (open && chained) {
      c.globalAlpha = ready ? 1 : .4;
      if (i === 0) { c.beginPath(); c.moveTo(w.x,w.y-.48); c.lineTo(w.x+.32,w.y-.1); c.lineTo(w.x,w.y+.28); c.lineTo(w.x-.32,w.y-.1); c.closePath(); c.fillStyle=color; c.fill(); }
      else { for (const dx of [-.12,.12]) { c.beginPath(); c.ellipse(w.x+dx,w.y-.12,.14,.23,Math.PI/4,0,TAU); c.strokeStyle=color;c.lineWidth=.07;c.stroke(); } }
    }
    if (done) { c.beginPath();c.moveTo(w.x-.16,w.y);c.lineTo(w.x-.04,w.y+.13);c.lineTo(w.x+.2,w.y-.15);c.strokeStyle=color;c.lineWidth=.08;c.stroke(); }
    if (b.chargeTarget === i && b.charge > 0) { c.globalAlpha = 1; c.strokeStyle = '#fff7d3'; c.lineWidth = .15; c.beginPath(); c.arc(w.x, w.y, 1.28, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, b.charge / .7)); c.stroke(); }
  });
  if (b.state === 'WINDOW' && bossRules(s).mechanic === 'chains') for (const i of [1, 2]) {
    if (b.used.includes(i)) continue;
    c.globalAlpha = .7; c.strokeStyle = '#afbdd0'; c.lineWidth = .08; c.setLineDash([.16, .12]); c.beginPath(); c.moveTo(g.weak[i].x, g.weak[i].y); c.lineTo(g.x, g.y); c.stroke(); c.setLineDash([]);
  }
  c.globalAlpha = 1;
  for (const h of b.heals) { circle(c, h.x, h.y, .3, '#4fd18b', '#173e35'); text(c, '+', h.x, h.y, .36, '#143e2b'); }
  c.restore();
}
export function bossBody(c, s) {
  const b = s.boss, g = s.level.boss, hit = s.fx.some(f => f.kind === 'bosshit' && s.time - f.at < .25);
  const active = b.state === 'ACTIVE', angry = b.phase >= 4, defeated = b.defeated;
  const color = hit ? '#f5f2d9' : defeated ? '#4c5458' : angry ? '#6c3e57' : '#47566a';
  c.save();
  // Carved shoulders, horned crown and rune core share the dungeon's stone palette.
  for (const side of [-1, 1]) {
    rounded(c, g.x + side * 1.45 - .38, g.y - .3 + (active ? .25 : 0), .76, 1.5, .18, color, '#142a30');
    rounded(c, g.x + side * .84 - .2, g.y - 1.72, .4, .72, .1, '#a2a58c', '#142a30');
  }
  rounded(c, g.x - 1.35, g.y - 1.4 + (defeated ? .3 : 0), 2.7, 2.8, .3, color, '#142a30');
  rounded(c, g.x - 1.12, g.y - 1.15, 2.24, .62, .14, defeated ? '#40474b' : '#8a988f', '#142a30');
  for (const dx of [-.57, .57]) { circle(c, g.x + dx, g.y - .8, .19, defeated ? '#293338' : active ? '#fa857b' : '#ffe296'); }
  circle(c, g.x, g.y + .3, .45, '#263c49', '#a6b6a4');
  circle(c, g.x, g.y + .3, b.state === 'WINDOW' ? .32 : .22, defeated ? '#4c5458' : b.state === 'WINDOW' ? '#ffe7a7' : angry ? '#f18f9d' : '#90dbcc');
  for (let i = 0; i < 5; i++) circle(c, g.x - .72 + i * .36, g.y + 1.04, .07, i < b.phase ? '#f5d18a' : '#8b9e9b');
  c.restore();
}
export function bossBar(c, s, width, ratio, top) {
  const b = s.boss, r = bossRules(s); c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const w = Math.min(width - 24 * ratio, 420 * ratio), x = (width - w) / 2, y = top, pad = 9 * ratio;
  rounded(c, x, y, w, 58 * ratio, 8 * ratio, '#11272deb', '#708d88');
  c.fillStyle = '#476061'; c.fillRect(x + pad, y + 7 * ratio, w - pad * 2, 7 * ratio);
  c.fillStyle = b.phase >= 4 ? '#e78e91' : '#f0cf86'; c.fillRect(x + pad, y + 7 * ratio, (w - pad * 2) * b.hp / b.maxHp, 7 * ratio);
  c.font = `700 ${10 * ratio}px system-ui,sans-serif`; c.textAlign = 'left'; c.fillStyle = '#e5eee0';
  c.fillText(`${b.phase}/5 · ${r.name} · ${b.hp}/${b.maxHp}`, x + pad, y + 29 * ratio);
  for (let i = 0; i < b.maxLives; i++) {
    const hx=x+w-pad-(b.maxLives-1-i)*12*ratio-4*ratio,hy=y+25*ratio;
    c.save();c.translate(hx,hy);c.scale(ratio,ratio);c.beginPath();c.moveTo(0,4);c.bezierCurveTo(-10,-2,-3,-8,0,-3);c.bezierCurveTo(3,-8,10,-2,0,4);c.closePath();c.fillStyle=i<b.lives?'#efa69d':'#425b60';c.fill();c.restore();
  }
  c.textAlign = 'left'; c.fillStyle = '#99dcca';
  const label = b.defeated ? 'Relik terbuka · bawa pulang' : b.state === 'WINDOW' ? `Rune ${b.used.length}/${b.targets.length} · ${Math.max(0, b.until - s.time).toFixed(1)} dtk` : b.state === 'TRANSITION' ? 'Fase berubah · pulihkan nyawa' : b.attack && ['TELE', 'ACTIVE', 'RECOVER'].includes(b.state) ? `${b.attack.name} · ${b.attack.beat + 1}/${b.attack.beats}${r.combo > 1 ? ` · Kombo ${b.combo + 1}/${r.combo}` : ''}` : 'Bersiap';
  c.fillText(label, x + pad, y + 47 * ratio); c.restore();
}

// Off-screen directions matter on a zoomed phone: the safe pocket / next rune
// must remain locatable even while the camera follows the player.
export function bossDirections(c, s, view, width, height, ratio) {
  const b = s.boss; if (!b || b.defeated) return;
  const danger = b.danger.has(`${Math.floor(s.player.x)},${Math.floor(s.player.y)}`);
  const next = b.targets.filter(i => !b.used.includes(i));
  const target = b.state === 'WINDOW' && next.length ? s.level.boss.weak[next[0]] : ['TELE', 'ACTIVE'].includes(b.state) && danger ? b.escapeTarget : null;
  if (!target) return;
  const px = target.x * view.size + view.ox, py = target.y * view.size + view.oy;
  const top = (width / ratio < 600 ? 194 : 176) * ratio, bottom = height - (width / ratio < 600 ? 158 : height / ratio < 500 ? 98 : 118) * ratio;
  const margin = 25 * ratio, y0 = Math.min(top, height / 2), y1 = Math.max(y0, bottom);
  const x = Math.max(margin, Math.min(width - margin, px)), y = Math.max(y0, Math.min(y1, py));
  if (Math.hypot(px - x, py - y) < 24 * ratio) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(x, y);
  circle(c, 0, 0, 16 * ratio, '#193c40ed', b.state === 'WINDOW' ? '#f3d58e' : '#97e7cc');
  c.rotate(Math.atan2(py - y, px - x)); c.strokeStyle = '#ecedd0'; c.lineWidth = 2 * ratio;
  c.beginPath(); c.moveTo(-5 * ratio, -5 * ratio); c.lineTo(3 * ratio, 0); c.lineTo(-5 * ratio, 5 * ratio); c.stroke();
  c.restore();
}
