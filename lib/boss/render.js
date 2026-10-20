// Render Canvas 2D Boss Battle. Bahaya dibedakan oleh POLA (arsir = peringatan, X = aktif, bom = ranjau, panah AMAN = koridor),
// bukan hanya warna. Tidak ada kedipan: peringatan hanya menebal pelan (statis bila reduced-motion).
import { animatedPoints } from '../sim/anim';
import { traceSmooth } from '../render/snakePath';
import { drawFace } from '../render/face';
import { weakTiles, isInvuln, isBossRound } from './sim';

const C = { a: '#c7d6ac', b: '#d0ddb7', ink: '#10160f', white: '#fff', boss: '#5a3a22', bossDk: '#3b2415', snakeOut: '#16361a', snakeIn: '#5fd35a',
  warn: '#ffb020', danger: '#b3261e', safe: '#2fd27a', apple: '#ffd23f', weakOpen: '#38d6ff', weakLock: '#8a929a' };

function hatch(ctx, px, py, cell, color) {
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, cell, cell); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  for (let k = -cell; k < cell * 2; k += cell / 3) { ctx.beginPath(); ctx.moveTo(px + k, py + cell); ctx.lineTo(px + k + cell, py); ctx.stroke(); }
  ctx.restore();
}
function cross(ctx, px, py, cell) {
  ctx.strokeStyle = C.white; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px + cell * 0.28, py + cell * 0.28); ctx.lineTo(px + cell * 0.72, py + cell * 0.72); ctx.moveTo(px + cell * 0.72, py + cell * 0.28); ctx.lineTo(px + cell * 0.28, py + cell * 0.72); ctx.stroke();
}
function bomb(ctx, cx, cy, r) {
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a * Math.PI / 4) * r, cy + Math.sin(a * Math.PI / 4) * r); ctx.lineTo(cx + Math.cos(a * Math.PI / 4) * r * 1.4, cy + Math.sin(a * Math.PI / 4) * r * 1.4); ctx.stroke(); }
  ctx.fillStyle = C.warn; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
}
function lock(ctx, cx, cy, r) {
  ctx.fillStyle = C.white; ctx.fillRect(cx - r * 0.7, cy - r * 0.1, r * 1.4, r * 1.0);
  ctx.strokeStyle = C.white; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.45, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy + r * 0.35, r * 0.15, 0, Math.PI * 2); ctx.fill();
}
function star(ctx, cx, cy, r) {
  ctx.fillStyle = C.white; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
}
function bolt(ctx, cx, cy, r) {
  ctx.fillStyle = C.ink; ctx.beginPath();
  ctx.moveTo(cx + r * 0.15, cy - r); ctx.lineTo(cx - r * 0.5, cy + r * 0.1); ctx.lineTo(cx - r * 0.05, cy + r * 0.1); ctx.lineTo(cx - r * 0.2, cy + r); ctx.lineTo(cx + r * 0.5, cy - r * 0.15); ctx.lineTo(cx + r * 0.05, cy - r * 0.15); ctx.closePath(); ctx.fill();
}

// view: { prog, from (ular sebelum tick), t, reduce }
export function drawBoss(ctx, W, H, s, view) {
  view = view || {};
  const { arena } = s, cols = arena.w, rows = arena.h;
  const cell = Math.floor(Math.min(W / cols, H / rows));
  const ox = Math.floor((W - cell * cols) / 2), oy = Math.floor((H - cell * rows) / 2);
  const px = (x) => ox + x * cell, py = (y) => oy + y * cell, cx = (x) => px(x) + cell / 2, cy = (y) => py(y) + cell / 2;
  const tele = s.sched.kind === 'tele' ? 1 - Math.max(0, (s.sched.endAt - s.t)) / Math.max(1, s.attack ? s.attack.teleMs : 1) : 0;
  ctx.fillStyle = '#2a4a22'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { ctx.fillStyle = (x + y) % 2 ? C.a : C.b; ctx.fillRect(px(x), py(y), cell, cell); }

  // Musuh menempati petak terlarang yang sama; antek terlihat dahulu, boss baru ronde 10.
  const boss = isBossRound(s), enemy = boss ? s.variant : s.minion;
  const breath = view.reduce ? 0 : Math.sin((view.t || 0) / 240) * 0.025;
  const ex = cx(8), ey = py(1.5) + cell * breath, radius = cell * (boss ? 1.2 : 0.85) * (1 + breath);
  ctx.fillStyle = '#3c502e'; ctx.fillRect(px(6), py(0), cell * 5, cell * 3);
  ctx.strokeStyle = '#efdfac'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.strokeRect(px(6) + 2, py(0) + 2, cell * 5 - 4, cell * 3 - 4); ctx.setLineDash([]);
  ctx.fillStyle = enemy.color; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, cell * 0.07);
  ctx.beginPath(); ctx.ellipse(ex, ey, radius * 1.35, radius * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Daun / duri / tudung memberi siluet berbeda selain warna.
  if (enemy.id === 'mushroom' || enemy.id === 'spore') {
    ctx.fillStyle = '#f1d3b6'; ctx.beginPath(); ctx.ellipse(ex, ey - radius * 0.45, radius * 1.5, radius * 0.45, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = '#8eb85f'; ctx.beginPath(); ctx.moveTo(ex, ey - radius * 0.75); ctx.quadraticCurveTo(ex - radius, ey - radius * 1.6, ex - radius * 0.6, ey - radius * 1.05); ctx.quadraticCurveTo(ex + radius * 0.3, ey - radius * 1.6, ex + radius * 0.5, ey - radius * 1.05); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  [-1, 1].forEach(side => {
    const x = ex + side * radius * 0.48;
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.ellipse(x, ey, radius * 0.24, radius * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x - side * radius * 0.05, ey + radius * 0.04, radius * 0.1, 0, Math.PI * 2); ctx.fill();
    const tilt = boss ? s.phase * 0.08 : 0.12;
    ctx.beginPath(); ctx.moveTo(x - side * radius * 0.27, ey - radius * (0.3 - tilt)); ctx.lineTo(x + side * radius * 0.28, ey - radius * (0.3 + tilt)); ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(ex - radius * 0.3, ey + radius * 0.45); ctx.lineTo(ex + radius * 0.3, ey + radius * 0.45); ctx.stroke();
  const label = boss ? `FASE ${s.phase} · ${s.phaseHp}/${s.cfg.phases[s.phase - 1].hp} HP` : `ANTEK · ${s.minionsLeft}/${s.minionsTotal}`;
  ctx.fillStyle = '#fff6dd'; ctx.font = `bold ${Math.max(9, Math.round(cell * 0.26))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, ex, py(2.72));
  // Bilah per fase tidak meluber saat HP lebih tebal.
  if (boss) {
    ctx.fillStyle = '#251e16'; ctx.fillRect(px(6) + 5, py(0) + 4, cell * 5 - 10, cell * 0.13);
    ctx.fillStyle = '#f6c96c'; ctx.fillRect(px(6) + 5, py(0) + 4, (cell * 5 - 10) * s.phaseHp / s.cfg.phases[s.phase - 1].hp, cell * 0.13);
  }

  if (boss && s.shield > 0) {
    ctx.strokeStyle = '#7ed4e6'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.ellipse(ex, ey, radius * 1.6, radius * 1.05, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#234f62'; ctx.fillRect(px(6) + 5, py(2.95), cell * 5 - 10, cell * 0.1);
    ctx.fillStyle = '#7ed4e6'; ctx.fillRect(px(6) + 5, py(2.95), (cell * 5 - 10) * s.shield / s.cfg.shieldMax, cell * 0.1);
  }

  // peringatan (arsir + garis putus; menebal pelan, tanpa kedip) dan bahaya aktif (merah gelap + X / bom)
  const mines = s.attack && s.attack.kind === 'mines';
  const alpha = view.reduce ? 0.35 : 0.2 + 0.25 * tele;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const c = y * cols + x;
    if (s.warn[c]) {
      ctx.fillStyle = `rgba(255,176,32,${alpha})`; ctx.fillRect(px(x), py(y), cell, cell);
      hatch(ctx, px(x), py(y), cell, 'rgba(120,70,0,.55)');
      ctx.strokeStyle = C.warn; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(px(x) + 2, py(y) + 2, cell - 4, cell - 4); ctx.setLineDash([]);
      if (mines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx(x), cy(y), cell * 0.22, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillText('?', cx(x), cy(y) + 1); }
    } else if (s.hazard[c]) {
      ctx.fillStyle = C.danger; ctx.fillRect(px(x), py(y), cell, cell);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(px(x) + 1, py(y) + 1, cell - 2, cell - 2);
      if (mines) bomb(ctx, cx(x), cy(y), cell * 0.2); else cross(ctx, px(x), py(y), cell);
    }
  }
  // koridor aman: bingkai hijau putus-putus + panah + tulisan AMAN (terlihat sebelum dan saat aktif)
  if (s.safe && s.attack && s.attack.kind === 'corridor') {
    const lo = s.attack.lo, hi = s.attack.hi;
    ctx.strokeStyle = C.safe; ctx.lineWidth = 4; ctx.setLineDash([10, 6]); ctx.strokeRect(px(lo) + 2, py(3) + 2, (hi - lo + 1) * cell - 4, (rows - 3) * cell - 4); ctx.setLineDash([]);
    ctx.fillStyle = C.safe; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.font = `bold ${Math.round(cell * 0.3)}px sans-serif`;
    ctx.strokeText('▼ AMAN ▼', (px(lo) + px(hi + 1)) / 2, py(rows - 1) + cell * 0.5); ctx.fillText('▼ AMAN ▼', (px(lo) + px(hi + 1)) / 2, py(rows - 1) + cell * 0.5);
  }

  // titik lemah: terkunci (abu-abu + gembok) atau terbuka (biru + bintang + tulisan LEMAH)
  weakTiles(s).forEach(w => {
  const open = s.window.open && !s.window.hit && !w.used;
  ctx.fillStyle = open ? C.weakOpen : C.weakLock; ctx.fillRect(px(w.x) + 3, py(w.y) + 3, cell - 6, cell - 6);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.setLineDash(open ? [] : [5, 4]); ctx.strokeRect(px(w.x) + 3, py(w.y) + 3, cell - 6, cell - 6); ctx.setLineDash([]);
  if (open) { star(ctx, cx(w.x), cy(w.y) - cell * 0.05, cell * 0.28); ctx.fillStyle = C.ink; ctx.font = `bold ${Math.round(cell * 0.16)}px sans-serif`; ctx.fillText('LEMAH', cx(w.x), py(w.y) + cell * 0.86); } else lock(ctx, cx(w.x), cy(w.y), cell * 0.3);
  });

  // apel energi
  s.apples.forEach(a => { ctx.fillStyle = C.apple; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx(a.x), cy(a.y), cell * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); bolt(ctx, cx(a.x), cy(a.y), cell * 0.2); });

  // Heal: hati merah + tanda tambah, berbeda bentuk dari apel energi.
  s.heals.forEach(h => {
    const x = cx(h.x), y = cy(h.y), r = cell * 0.33;
    ctx.fillStyle = '#fff5dd'; ctx.beginPath(); ctx.arc(x, y, cell * 0.44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ce5661'; ctx.strokeStyle = '#66383c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 2, y - r * 0.25, x - r, y - r * 1.7, x, y - r * 0.55); ctx.bezierCurveTo(x + r, y - r * 1.7, x + r * 2, y - r * 0.25, x, y + r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(9, Math.round(cell * 0.34))}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('+', x, y);
    if (h.amount > 1) { ctx.fillStyle = C.ink; ctx.font = `bold ${Math.max(9, Math.round(cell * 0.24))}px sans-serif`; ctx.fillText(`+${h.amount}`, x, y + cell * 0.44); }
  });

  // Orb damage: jingga, simbol ×2; berbeda dari hati merah dan apel energi.
  s.damageOrbs.forEach(o => {
    const bob = view.reduce ? 0 : Math.sin((view.t || 0) / 260 + o.x) * cell * 0.05;
    const x = cx(o.x), y = cy(o.y) + bob;
    ctx.fillStyle = '#f8b655'; ctx.strokeStyle = '#734421'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, cell * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#402a1e'; ctx.font = `bold ${Math.max(10, Math.round(cell * 0.31))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('×2', x, y);
    if (o.amount > 1) { ctx.font = `bold ${Math.max(9, Math.round(cell * 0.22))}px sans-serif`; ctx.fillText(`+${o.amount}`, x, y + cell * 0.43); }
  });

  // ular (meluncur halus); kebal = cincin putus-putus putih di kepala
  const cells = view.from ? animatedPoints(s.snake, view.from, (view.prog == null ? 1 : view.prog)) : s.snake;
  const pts = cells.map(p => ({ x: cx(p.x), y: cy(p.y) }));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.snakeOut; ctx.lineWidth = cell * 0.74; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  ctx.strokeStyle = C.snakeIn; ctx.lineWidth = cell * 0.5; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  const hd = pts[0], d = s.dir, off = cell * 0.15, r = cell * 0.09;
  drawFace(ctx, hd, d, cell);
  if (isInvuln(s)) { ctx.strokeStyle = C.white; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(hd.x, hd.y, cell * 0.55, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
}
