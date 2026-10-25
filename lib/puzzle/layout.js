// Crop only unused outer padding. Every playable cell, obstacle and relative
// distance is retained; translating the whole world cannot change a route.
export function compactLevel(input) {
  if (input.compact || input.special) return input;
  const floor = [];
  input.map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.' || ch === 'C') floor.push({ x, y }); }));
  if (!floor.length) return input;
  const x0 = Math.max(0, Math.min(...floor.map(p => p.x)) - 1), y0 = Math.max(0, Math.min(...floor.map(p => p.y)) - 1);
  const x1 = Math.min(input.width - 1, Math.max(...floor.map(p => p.x)) + 1), y1 = Math.min(input.height - 1, Math.max(...floor.map(p => p.y)) + 1);
  const shift = value => {
    if (Array.isArray(value)) return value.map(shift);
    if (!value || typeof value !== 'object') return value;
    const out = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v)]));
    if (typeof value.x === 'number' && typeof value.y === 'number') { out.x -= x0; out.y -= y0; }
    return out;
  };
  const level = shift(input);
  level.width = x1 - x0 + 1; level.height = y1 - y0 + 1;
  level.map = input.map.slice(y0, y1 + 1).map(r => r.slice(x0, x1 + 1));
  level.compact = { x: x0, y: y0, sourceWidth: input.width, sourceHeight: input.height };
  return level;
}
