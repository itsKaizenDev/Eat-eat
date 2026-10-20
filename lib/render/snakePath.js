// Jalur tubuh ular yang halus: tikungan dibulatkan (kurva kuadrat lewat titik tengah), dan garis DIPUTUS
// saat ada lompatan (portal) supaya tidak ada garis panjang melintasi papan.
export function traceSmooth(ctx, pts, jump) {
  if (!pts.length) return;
  const runs = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > jump) runs.push([pts[i]]);
    else runs[runs.length - 1].push(pts[i]);
  }
  ctx.beginPath();
  runs.forEach(r => {
    ctx.moveTo(r[0].x, r[0].y);
    if (r.length === 1) { ctx.lineTo(r[0].x + 0.01, r[0].y); return; } // titik tunggal: kepala bulat dari lineCap
    for (let i = 1; i < r.length - 1; i++) {
      const mx = (r[i].x + r[i + 1].x) / 2, my = (r[i].y + r[i + 1].y) / 2;
      ctx.quadraticCurveTo(r[i].x, r[i].y, mx, my);
    }
    ctx.lineTo(r[r.length - 1].x, r[r.length - 1].y);
  });
}
