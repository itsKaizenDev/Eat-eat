// Render Canvas 2D Delivery. Warna paket SELALU didampingi huruf (A/B/C) dan bentuk (apel = bulat, surat = amplop, kotak = persegi bertali).
import { TYPES, pickups, lifeLeft } from './sim';
import { animatedPoints } from '../sim/anim';
import { traceSmooth } from '../render/snakePath';
import { drawFace } from '../render/face';

const COL = { A: '#e0453a', B: '#4aa3ff', C: '#f2b84b' };
const C = { tileA: '#d8d8b9', tileB: '#e2dfc4', build: '#8a5a48', buildTop: '#5d3b30', win: '#ffd98a', snakeOut: '#304831', snakeIn: '#7fcf34', ink: '#0e1316', white: '#ffffff' };

export function drawParcel(ctx, type, cx, cy, s) {
  ctx.save();
  ctx.lineWidth = Math.max(2, s * 0.08); ctx.strokeStyle = C.ink; ctx.fillStyle = COL[type];
  if (type === 'A') { // apel: bulat + daun
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.04, s * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6fbf3a'; ctx.beginPath(); ctx.ellipse(cx + s * 0.12, cy - s * 0.38, s * 0.14, s * 0.07, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'B') { // surat: amplop dengan lipatan V
    ctx.fillRect(cx - s * 0.46, cy - s * 0.32, s * 0.92, s * 0.64); ctx.strokeRect(cx - s * 0.46, cy - s * 0.32, s * 0.92, s * 0.64);
    ctx.beginPath(); ctx.moveTo(cx - s * 0.46, cy - s * 0.32); ctx.lineTo(cx, cy + s * 0.08); ctx.lineTo(cx + s * 0.46, cy - s * 0.32); ctx.stroke();
  } else { // kotak: persegi dengan tali silang
    ctx.fillRect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84); ctx.strokeRect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84);
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.42); ctx.lineTo(cx, cy + s * 0.42); ctx.moveTo(cx - s * 0.42, cy); ctx.lineTo(cx + s * 0.42, cy); ctx.stroke();
  }
  ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.font = `bold ${Math.round(s * 0.42)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(type, cx, cy + s * 0.04); ctx.fillText(type, cx, cy + s * 0.04);
  ctx.restore();
}

// view: { prog (0..1), from (snake sebelum langkah), t (ms, hanya untuk denyut visual) }
export function drawDelivery(ctx, W, H, s, view) {
  view = view || {};
  const { arena } = s;
  const cell = Math.floor(Math.min(W / arena.w, H / arena.h));
  const ox = Math.floor((W - cell * arena.w) / 2), oy = Math.floor((H - cell * arena.h) / 2);
  const cx = x => ox + x * cell + cell / 2, cy = y => oy + y * cell + cell / 2;
  const tv = view.t || 0;

  ctx.fillStyle = '#242d34'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) { ctx.fillStyle = (x + y) % 2 ? C.tileA : C.tileB; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell); }

  // rintangan = gedung
  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) {
    if (!arena.obstacle[y * arena.w + x]) continue;
    const px = ox + x * cell, py = oy + y * cell;
    ctx.fillStyle = C.build; ctx.fillRect(px, py, cell, cell);
    ctx.fillStyle = C.buildTop; ctx.fillRect(px, py, cell, cell * 0.22);
    ctx.fillStyle = C.win; ctx.fillRect(px + cell * 0.22, py + cell * 0.45, cell * 0.2, cell * 0.2); ctx.fillRect(px + cell * 0.58, py + cell * 0.45, cell * 0.2, cell * 0.2);
  }

  // tujuan (rumah) per tipe: bingkai warna + ikon paket + pita label "ANTAR" di bawah (tidak menimpa ikon)
  Object.keys(arena.sites).forEach(k => {
    const p = arena.sites[k], px = ox + p.x * cell, py = oy + p.y * cell;
    ctx.fillStyle = '#1b2329'; ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
    drawParcel(ctx, k, cx(p.x), py + cell * 0.4, cell * 0.56);
    ctx.fillStyle = COL[k]; ctx.fillRect(px + 3, py + cell * 0.72, cell - 6, cell * 0.25);
    ctx.fillStyle = C.ink; ctx.font = `bold ${Math.round(cell * 0.19)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ANTAR', cx(p.x), py + cell * 0.845);
    ctx.lineWidth = 3; ctx.strokeStyle = COL[k]; ctx.strokeRect(px + 3, py + 3, cell - 6, cell - 6);
  });

  // titik pickup: paket bergoyang + cincin denyut
  pickups(s).forEach(o => {
    const bob = Math.sin(tv / 280 + o.id) * cell * 0.05;
    ctx.strokeStyle = COL[o.type]; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx(o.pickup.x), cy(o.pickup.y), cell * (0.44 + 0.04 * Math.sin(tv / 220 + o.id)), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    drawParcel(ctx, o.type, cx(o.pickup.x), cy(o.pickup.y) + bob, cell * 0.66);
  });

  // ular: tubuh dasar hijau + segmen kargo di ekor (huruf + bentuk + warna), meluncur halus antar langkah
  const cells = view.from ? animatedPoints(s.snake, view.from, (view.prog == null ? 1 : view.prog)) : s.snake;
  const pts = cells.map(p => ({ x: cx(p.x), y: cy(p.y) }));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.snakeOut; ctx.lineWidth = cell * 0.74; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  ctx.strokeStyle = C.snakeIn; ctx.lineWidth = cell * 0.5; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  s.cargo.forEach((c, j) => {
    const p = pts[s.baseLen + j]; if (!p) return;
    const left = lifeLeft(c, s.t);
    if (left < 3000 && Math.floor(tv / 160) % 2 === 0) { ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, cell * 0.46, 0, Math.PI * 2); ctx.stroke(); }
    drawParcel(ctx, c.type, p.x, p.y, cell * 0.6);
  });
  const hd = pts[0], d = s.dir, off = cell * 0.15, r = cell * 0.09;
  drawFace(ctx, hd, d, cell);
}
