// Presentation units only: enlarging a mission never shrinks its actors.
export function cameraView(level, screen, player, { zoom = 1, overview = false, domHud = false } = {}) {
  const { width, height, cssWidth, cssHeight } = screen;
  const ratio = width / cssWidth;
  const tile = Math.max(32, Math.min(48, cssWidth / 15, cssHeight / 11));
  // Keep the followed character above the thumb controls and below the HUD.
  const portrait = cssWidth < 600, top = (level.boss ? domHud ? portrait ? 144 : 110 : portrait ? 184 : 166 : portrait ? 118 : 100) * ratio, bottom = (portrait ? 148 : cssHeight < 500 ? 92 : 110) * ratio;
  const size = overview ? Math.min(width / (level.width + .8), Math.max(1,height-top-bottom) / (level.height + 1)) : tile * zoom * ratio;
  const axis = (at, span, cells, anchor, before = 0, after = 0) => {
    const usable = Math.max(1, span - before - after);
    if (cells * size <= usable) return before + (usable - cells * size) / 2;
    return Math.min(before, Math.max(span - after - cells * size, before + usable * anchor - at * size));
  };
  return { size, ox: axis(player.x, width, level.width, .5), oy: !level.boss && !overview && level.height * size > height - top - bottom ? top + (height-top-bottom) * .48 - player.y * size : axis(player.y, height, level.height, .48, top, bottom), tileCSS: size / ratio };
}
