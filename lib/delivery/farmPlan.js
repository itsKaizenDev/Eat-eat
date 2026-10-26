// Decorations occupy existing blocked ground only, never a delivery road.
export function buildFarmPlan(arena) {
  const { w, h, obstacle } = arena, visited = new Set(), lots = [];
  const blocked = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && obstacle[y * w + x];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const index = y * w + x;
    if (!blocked(x, y) || visited.has(index)) continue;
    const queue = [{ x, y }], cells = [];
    visited.add(index);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i]; cells.push(p);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = p.x + dx, ny = p.y + dy, k = ny * w + nx;
        if (blocked(nx, ny) && !visited.has(k)) { visited.add(k); queue.push({ x: nx, y: ny }); }
      }
    }
    const minX = Math.min(...cells.map(p => p.x)), maxX = Math.max(...cells.map(p => p.x));
    const minY = Math.min(...cells.map(p => p.y)), maxY = Math.max(...cells.map(p => p.y));
    const occupied = new Set(cells.map(p => p.y * w + p.x));
    let rect = { x, y, w: 1, h: 1 };
    for (let ry = minY; ry <= maxY; ry++) for (let rx = minX; rx <= maxX; rx++) {
      let width = maxX - rx + 1;
      for (let by = ry; by <= maxY; by++) {
        let run = 0;
        while (run < width && occupied.has(by * w + rx + run)) run++;
        width = Math.min(width, run);
        if (!width) break;
        if (width * (by - ry + 1) > rect.w * rect.h) rect = { x: rx, y: ry, w: width, h: by - ry + 1 };
      }
    }
    lots.push({ rect, cells, sprite: ['crop', 'tree', 'hay'][lots.length % 3] });
  }
  for (const [type, sprite] of [['A', 'barn'], ['B', 'coop'], ['C', 'stall']]) {
    const site = arena.sites[type];
    if (!site) continue;
    const free = lots.filter(lot => !lot.type).sort((a, b) => {
      const dist = lot => Math.hypot(lot.rect.x + lot.rect.w / 2 - site.x - .5, lot.rect.y + lot.rect.h / 2 - site.y - .5);
      return dist(a) - dist(b);
    });
    if (free[0]) { free[0].type = type; free[0].sprite = sprite; }
  }
  const edges = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (obstacle[y * w + x]) {
    for (const [dx, dy, side] of [[0, -1, 'top'], [1, 0, 'right'], [0, 1, 'bottom'], [-1, 0, 'left']]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && !obstacle[ny * w + nx]) edges.push({ x, y, side });
    }
  }
  return { lots, edges };
}
