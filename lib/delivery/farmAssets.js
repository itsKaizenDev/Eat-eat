// Shared raster atlases; decoded once and kept outside simulation state.
export const FARM_FILES = Object.freeze({
  environment: '/assets/delivery/farm-environment.webp',
  cargo: '/assets/delivery/farm-cargo.webp',
  terrain: '/assets/delivery/farm-terrain.webp',
});
export const FARM_SITES = Object.freeze({ A: 'Lumbung', B: 'Kandang', C: 'Kios' });
export const FARM_DISTRICTS = ['Kebun Apel', 'Peternakan Hijau', 'Pasar Panen', 'Kebun Senja'];
export const FARM_SPRITES = Object.freeze({
  barn: ['environment', 24.5, 40.5, 168, 186],
  coop: ['environment', 228.5, 43, 131.5, 199.5],
  stall: ['environment', 397.5, 62.5, 165, 167],
  tree: ['environment', 582.5, 51.5, 171.5, 181.5],
  crop: ['environment', 45, 285, 131.5, 165],
  hay: ['environment', 215, 292, 166.5, 154.5],
  fenceH: ['environment', 399, 335, 194, 73.5],
  fenceV: ['environment', 660.5, 265, 34.5, 203],
  standard: ['cargo', 25.5, 76, 152, 148],
  express: ['cargo', 205, 44.5, 176, 185.5],
  fragile: ['cargo', 405, 75.5, 148.5, 146.5],
  heavy: ['cargo', 585.5, 43.5, 170, 189],
  multi: ['cargo', 9.5, 318.5, 178.5, 117.5],
  cart: ['cargo', 199.5, 321, 198.5, 134],
  gateClosed: ['cargo', 402.5, 320.5, 157.5, 112],
  gateOpen: ['cargo', 581.5, 320.5, 175.5, 112],
});

export function createFarmAssets(makeImage) {
  const bank = { images: {}, revision: 0, errors: [] };
  bank.ready = Promise.all(Object.entries(FARM_FILES).map(([key, url]) => new Promise(resolve => {
    const img = makeImage();
    bank.images[key] = img;
    const complete = error => { bank.revision++; if (error) bank.errors.push(url); resolve(); };
    img.onload = () => complete(false);
    img.onerror = () => complete(true);
    img.src = url;
  })));
  return bank;
}
let shared;
export function farmAssets() {
  if (typeof Image === 'undefined') return { images: {}, revision: 0 };
  return shared || (shared = createFarmAssets(() => new Image()));
}
export function drawFarmSprite(ctx, bank, name, x, y, w, h, flip = false) {
  const spec = FARM_SPRITES[name];
  if (!spec) return false;
  const [key, sx, sy, sw, sh] = spec, img = bank.images[key];
  if (!img?.complete || !img.naturalWidth) return false;
  const scale = Math.min(w / sw, h / sh), dw = sw * scale, dh = sh * scale;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return true;
}
