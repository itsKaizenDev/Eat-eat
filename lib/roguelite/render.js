// Render Canvas 2D Ekspedisi Mayhem. Jenis apel dibedakan BENTUK (bukan hanya warna): normal = apel, besar = apel + cincin emas,
// racun = apel dengan tanda silang, keberuntungan = bintang. Ranjau = bola hitam bersumbu + tanda seru.
import { COLS, ROWS } from '../constants';
import { hasEffect } from './upgrades';
import { animatedPoints } from '../sim/anim';
import { traceSmooth } from '../render/snakePath';
import { drawFace } from '../render/face';

const C = { a: '#c7d6ac', b: '#d0ddb7', apple: '#e0453a', big: '#f2b84b', poison: '#9a4fd6', ink: '#0e1316', leaf: '#6fbf3a', snakeOut: '#304831', snakeIn: '#7fcf34', white: '#fff' };

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.closePath();
}
export function drawFood(ctx, kind, cx, cy, s) {
  ctx.save(); ctx.lineWidth = Math.max(2, s * 0.07); ctx.strokeStyle = C.ink;
  if (kind === 'lucky') { ctx.fillStyle = '#ffd84a'; star(ctx, cx, cy, s * 0.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; ctx.font = `bold ${Math.round(s * 0.34)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', cx, cy + s * 0.03); ctx.restore(); return; }
  const r = s * (kind === 'big' ? 0.44 : 0.34);
  ctx.fillStyle = kind === 'poison' ? C.poison : C.apple;
  ctx.beginPath(); ctx.arc(cx, cy + s * 0.03, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.leaf; ctx.beginPath(); ctx.ellipse(cx + r * 0.35, cy - r * 0.95, r * 0.35, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
  if (kind === 'big') { ctx.strokeStyle = C.big; ctx.lineWidth = Math.max(3, s * 0.1); ctx.beginPath(); ctx.arc(cx, cy + s * 0.03, r + s * 0.07, 0, Math.PI * 2); ctx.stroke(); }
  if (kind === 'poison') { ctx.strokeStyle = C.white; ctx.lineWidth = Math.max(2, s * 0.09); ctx.beginPath(); ctx.moveTo(cx - r * 0.45, cy - r * 0.35); ctx.lineTo(cx + r * 0.45, cy + r * 0.5); ctx.moveTo(cx + r * 0.45, cy - r * 0.35); ctx.lineTo(cx - r * 0.45, cy + r * 0.5); ctx.stroke(); }
  ctx.restore();
}
export function drawBomb(ctx, cx, cy, s, tv) {
  ctx.save();
  ctx.fillStyle = '#1b1b22'; ctx.strokeStyle = '#ff5d4a'; ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.beginPath(); ctx.arc(cx, cy + s * 0.05, s * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#c8b27a'; ctx.beginPath(); ctx.moveTo(cx + s * 0.1, cy - s * 0.3); ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.5, cx + s * 0.38, cy - s * 0.38); ctx.stroke();
  ctx.fillStyle = Math.floor(tv / 180) % 2 ? '#ffd84a' : '#ff8a1f'; ctx.beginPath(); ctx.arc(cx + s * 0.4, cy - s * 0.4, s * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff5d4a'; ctx.font = `bold ${Math.round(s * 0.36)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', cx, cy + s * 0.07);
  ctx.restore();
}

// view: { prog, from (snake sebelum langkah), t (ms, denyut visual) }
export function drawRound(ctx, W, H, s, view) {
  view = view || {};
  const cell = Math.floor(Math.min(W / COLS, H / ROWS));
  const ox = Math.floor((W - cell * COLS) / 2), oy = Math.floor((H - cell * ROWS) / 2);
  const cx = x => ox + x * cell + cell / 2, cy = y => oy + y * cell + cell / 2;
  const tv = view.t || 0;
  ctx.fillStyle = '#1d2f1e'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? C.a : C.b; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell); }
  ctx.strokeStyle = '#ff5d4a'; ctx.lineWidth = 4; ctx.strokeRect(ox + 2, oy + 2, cell * COLS - 4, cell * ROWS - 4); // dinding mematikan
  s.bombs.forEach(b => drawBomb(ctx, cx(b.x), cy(b.y), cell * 1.05, tv));
  s.foods.forEach(f => drawFood(ctx, f.kind, cx(f.x), cy(f.y) + Math.sin(tv / 300 + f.x) * cell * 0.03, cell * 1.08));
  const cells = view.from ? animatedPoints(s.snake, view.from, (view.prog == null ? 1 : view.prog)) : s.snake;
  const pts = cells.map(p => ({ x: cx(p.x), y: cy(p.y) }));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = hasEffect(s.effects, 'reverse') ? '#8e3a9b' : C.snakeOut; ctx.lineWidth = cell * 0.74; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  ctx.strokeStyle = hasEffect(s.effects, 'double') ? '#ffe27a' : C.snakeIn; ctx.lineWidth = cell * 0.5; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  const hd = pts[0], d = s.dir, off = cell * 0.15, r = cell * 0.09;
  if (s.shield > 0) { ctx.strokeStyle = '#6ed3ff'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(hd.x, hd.y, cell * 0.55, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  drawFace(ctx, hd, d, cell);
}
