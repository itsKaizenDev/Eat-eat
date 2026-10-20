// Wajah kartun bersama; koordinat visual saja, tidak mengubah hitbox.
export function drawFace(ctx, head, dir, cell, t = 0) {
  ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(Math.atan2(dir.y, dir.x));
  ctx.fillStyle = '#fff0c6'; ctx.beginPath(); ctx.ellipse(cell * 0.14, 0, cell * 0.2, cell * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    const ex = cell * 0.03, ey = side * cell * 0.16;
    ctx.fillStyle = '#fffdf5'; ctx.strokeStyle = '#304831'; ctx.lineWidth = Math.max(1, cell * 0.025);
    ctx.beginPath(); ctx.ellipse(ex, ey, cell * 0.115, cell * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#283a24'; ctx.beginPath(); ctx.arc(ex + cell * 0.045, ey, cell * 0.052, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e89576'; ctx.beginPath(); ctx.arc(cell * 0.17, side * cell * 0.19, cell * 0.045, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#304831'; ctx.lineWidth = Math.max(1, cell * 0.035); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cell * 0.17, 0, cell * 0.075, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.restore();
}
