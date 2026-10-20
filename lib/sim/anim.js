// Interpolasi visual ular antar langkah. MURNI: hanya menghitung posisi gambar, tidak menyentuh simulasi.
// Segmen i bergerak dari posisi lamanya (indeks i, dijepit ke ekor lama) ke posisi barunya.
// Saat tumbuh, segmen ekor baru muncul diam di sel ekor lama; saat memendek, ekor yang hilang tidak digambar.
// Lompatan (> 1 sel, mis. portal) TIDAK diinterpolasi: segmen langsung berada di tujuan.
export const easeOutCubic = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

export function animatedPoints(snake, from, p) {
  if (!from || !from.length || p >= 1) return snake.map(s => ({ x: s.x, y: s.y }));
  return snake.map((cur, i) => {
    const f = from[Math.min(i, from.length - 1)];
    if (Math.abs(f.x - cur.x) + Math.abs(f.y - cur.y) > 1) return { x: cur.x, y: cur.y };
    return { x: f.x + (cur.x - f.x) * p, y: f.y + (cur.y - f.y) * p };
  });
}
