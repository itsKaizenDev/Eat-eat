import { drawFace } from '../render/face';
// Render Canvas 2D Territory. Pemain dibedakan oleh warna DAN pola: P1 = titik + kepala "1", P2 = garis diagonal + kepala "2".

const COL = { 1: '#7fcf34', 2: '#4aa3ff' };
const DARK = { 1: '#3f7d1a', 2: '#1f5f9f' };
const C = { tileA: '#c7d6ac', tileB: '#d0ddb7', stone: '#6b7480', stoneTop: '#8a93a0', ink: '#0e1316', white: '#ffffff' };

function pattern(ctx, id, px, py, cell) {
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Math.max(1.5, cell * 0.07);
  if (id === 1) { ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2, cell * 0.11, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(px + cell * 0.25, py + cell * 0.75); ctx.lineTo(px + cell * 0.75, py + cell * 0.25); ctx.stroke(); }
  ctx.restore();
}

// view: { prog, from (posisi kepala sebelum tick), t, fx, fxMs }
export function drawTerritory(ctx, W, H, s, view) {
  view = view || {};
  const { arena } = s;
  const cell = Math.floor(Math.min(W / arena.w, H / arena.h));
  const ox = Math.floor((W - cell * arena.w) / 2), oy = Math.floor((H - cell * arena.h) / 2);
  const tv = view.t || 0;
  ctx.fillStyle = '#1d2622'; ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) {
    const c = y * arena.w + x, px = ox + x * cell, py = oy + y * cell;
    if (arena.wall[c]) { // batu: bukan wilayah
      ctx.fillStyle = C.stone; ctx.fillRect(px, py, cell, cell);
      ctx.fillStyle = C.stoneTop; ctx.fillRect(px, py, cell, cell * 0.2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + cell * 0.25, py + cell * 0.35); ctx.lineTo(px + cell * 0.55, py + cell * 0.8); ctx.stroke();
      continue;
    }
    ctx.fillStyle = (x + y) % 2 ? C.tileA : C.tileB; ctx.fillRect(px, py, cell, cell);
    const o = s.own[c];
    if (o) { ctx.fillStyle = COL[o]; ctx.globalAlpha = 0.62; ctx.fillRect(px, py, cell, cell); ctx.globalAlpha = 1; pattern(ctx, o, px, py, cell); }
  }

  // jejak: kotak terang bergaris putus
  s.players.forEach(p => {
    ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
    p.trail.forEach(c => {
      const x = c % arena.w, y = (c - x) / arena.w, px = ox + x * cell, py = oy + y * cell;
      ctx.fillStyle = COL[p.id]; ctx.globalAlpha = 0.9; ctx.fillRect(px + 3, py + 3, cell - 6, cell - 6); ctx.globalAlpha = 1;
      ctx.strokeStyle = DARK[p.id]; ctx.strokeRect(px + 3, py + 3, cell - 6, cell - 6);
    });
    ctx.restore();
  });

  // kilatan singkat saat klaim (tidak berulang; dimatikan di controller bila reduced-motion)
  (view.fx || []).forEach(f => {
    const a = Math.max(0, Math.min(1, (f.until - tv) / (view.fxMs || 350))) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    f.cells.forEach(c => { const x = c % arena.w, y = (c - x) / arena.w; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell); });
  });

  // kepala (meluncur halus antar tick; lompatan > 1 sel tidak diinterpolasi)
  const p0 = view.prog == null ? 1 : Math.min(1, Math.max(0, view.prog));
  s.players.forEach((p, i) => {
    if (p.lives <= 0) return;
    const f = view.from && view.from[i] ? view.from[i] : p.head;
    const jump = Math.abs(f.x - p.head.x) + Math.abs(f.y - p.head.y) > 1;
    const hx = jump ? p.head.x : f.x + (p.head.x - f.x) * p0, hy = jump ? p.head.y : f.y + (p.head.y - f.y) * p0;
    const cx = ox + hx * cell + cell / 2, cy = oy + hy * cell + cell / 2;
    ctx.fillStyle = COL[p.id]; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, cell * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawFace(ctx, { x: cx, y: cy }, p.dir, cell);
    ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.font = `bold ${Math.round(cell * 0.25)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(String(p.id), cx - p.dir.x * cell * 0.26, cy - p.dir.y * cell * 0.26); ctx.fillText(String(p.id), cx - p.dir.x * cell * 0.26, cy - p.dir.y * cell * 0.26);
  });
}
