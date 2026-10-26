import { farmAssets, drawFarmSprite } from './farmAssets';
import { buildFarmPlan } from './farmPlan';

const layers = new WeakMap(), TILE = 48;
const COLORS = { A: '#e95243', B: '#4ba5e5', C: '#f2bb44' };
function terrain(ctx, bank, kind, x, y, w, h, tx = 0, ty = 0) {
  const img = bank.images.terrain;
  ctx.fillStyle = ['#9bbf57', '#efd29a', '#986139', '#97724e'][kind];
  ctx.fillRect(x, y, w, h);
  if (img?.complete && img.naturalWidth) {
    const qw = img.naturalWidth / 2, qh = img.naturalHeight / 2;
    ctx.drawImage(img, (kind % 2) * qw + (tx % 4) * qw / 4, Math.floor(kind / 2) * qh + (ty % 4) * qh / 4, qw / 4, qh / 4, x, y, w, h);
  }
}
function paintLayer(ctx, arena, bank, plan) {
  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) terrain(ctx, bank, arena.obstacle[y * arena.w + x] ? 0 : 1, x * TILE, y * TILE, TILE, TILE, x, y);
  for (const lot of plan.lots) {
    const r = lot.rect, x = r.x * TILE, y = r.y * TILE, w = r.w * TILE, h = r.h * TILE;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (lot.sprite === 'crop') {
      for (let yy = 0; yy < r.h; yy++) for (let xx = 0; xx < r.w; xx++) terrain(ctx, bank, 2, x + xx * TILE, y + yy * TILE, TILE, TILE, xx, yy);
    }
    if (lot.sprite === 'tree' && r.w >= 4) {
      drawFarmSprite(ctx, bank, 'tree', x + w * .07, y + h * .12, w * .42, h * .75);
      drawFarmSprite(ctx, bank, 'tree', x + w * .51, y + h * .12, w * .42, h * .75);
    } else drawFarmSprite(ctx, bank, lot.sprite, x + 10, y + 9, w - 20, h - 18);
    ctx.restore();
  }
  // All rails are inset into blocked cells; the road silhouette matches physics.
  for (const edge of plan.edges) {
    const x = edge.x * TILE, y = edge.y * TILE;
    ctx.fillStyle = '#70502f';
    if (edge.side === 'top' || edge.side === 'bottom') {
      const py = y + (edge.side === 'top' ? 3 : TILE - 8);
      ctx.fillRect(x, py + 2, TILE, 3);
      drawFarmSprite(ctx, bank, 'fenceH', x, y + (edge.side === 'top' ? 1 : TILE - 14), TILE, 13);
    } else {
      const px = x + (edge.side === 'left' ? 3 : TILE - 8);
      ctx.fillRect(px + 2, y, 3, TILE);
      drawFarmSprite(ctx, bank, 'fenceV', x + (edge.side === 'left' ? 1 : TILE - 14), y, 13, TILE);
    }
  }
}
export function drawFarmBackground(ctx, W, H, arena, ox, oy, cell) {
  const bank = farmAssets();
  ctx.fillStyle = '#91b94e'; ctx.fillRect(0, 0, W, H);
  let layer = layers.get(ctx);
  if (!layer || layer.arena !== arena || layer.revision !== bank.revision) {
    if (layer?.canvas) { layer.canvas.width = 0; layer.canvas.height = 0; }
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    layer = { arena, revision: bank.revision, canvas, plan: buildFarmPlan(arena) };
    if (canvas) {
      canvas.width = arena.w * TILE; canvas.height = arena.h * TILE;
      const raster = canvas.getContext('2d');
      if (raster) paintLayer(raster, arena, bank, layer.plan); else layer.canvas = null;
    }
    layers.set(ctx, layer);
  }
  if (layer.canvas) ctx.drawImage(layer.canvas, ox, oy, arena.w * cell, arena.h * cell);
  else { ctx.fillStyle = '#efd29a'; ctx.fillRect(ox, oy, arena.w * cell, arena.h * cell); }
  return bank;
}
export function releaseFarmRenderer(ctx) {
  const layer = layers.get(ctx);
  if (layer?.canvas) { layer.canvas.width = 0; layer.canvas.height = 0; }
  layers.delete(ctx);
}
export function addressBadge(ctx, type, x, y, size) {
  ctx.save(); ctx.fillStyle = COLORS[type]; ctx.strokeStyle = '#3d3527'; ctx.lineWidth = Math.max(1, size * .08);
  ctx.beginPath();
  if (type === 'A') ctx.arc(x, y, size * .5, 0, Math.PI * 2);
  else if (type === 'B') ctx.rect(x - size * .5, y - size * .5, size, size);
  else { ctx.moveTo(x, y - size * .6); ctx.lineTo(x + size * .6, y + size * .5); ctx.lineTo(x - size * .6, y + size * .5); ctx.closePath(); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fffcec'; ctx.strokeStyle = '#382d20'; ctx.lineWidth = Math.max(1, size * .07);
  ctx.font = `900 ${size * .7}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(type, x, y + size * .03); ctx.fillText(type, x, y + size * .03); ctx.restore();
}
export function farmParcel(ctx, bank, kind, type, x, y, size) {
  if (!drawFarmSprite(ctx, bank, kind || 'standard', x - size / 2, y - size / 2, size, size)) {
    ctx.fillStyle = '#b27a42'; ctx.fillRect(x - size * .4, y - size * .4, size * .8, size * .8);
  }
  addressBadge(ctx, type, x + size * .3, y + size * .27, size * .42);
}
