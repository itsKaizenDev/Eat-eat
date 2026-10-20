// Satu pemilik status hold untuk keyboard dan DPad. Repeat OS tidak menjadi antrean langkah.
export function createDirectionInput({ send, cancel, enabled, stepMode, later = setTimeout, stop = clearTimeout, delay = 190, interval = 135 }) {
  const pressed = new Map();
  let order = 0, timer = null;
  const active = player => [...pressed.values()].filter(v => v.player === player).sort((a, b) => b.order - a.order)[0];
  function schedule(ms) {
    if (timer !== null) stop(timer);
    timer = null;
    if (!stepMode() || !pressed.size) return;
    timer = later(() => {
      timer = null;
      if (!enabled()) { clear(); return; }
      for (const player of new Set([...pressed.values()].map(v => v.player))) {
        const v = active(player);
        if (v) send(player, v.x, v.y, { source: v.key, repeat: true });
      }
      schedule(interval);
    }, ms);
  }
  function press(key, player, x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) + Math.abs(y) !== 1) return;
    if (!enabled()) { clear(); return; }
    const old = pressed.get(key);
    if (old && old.x === x && old.y === y) return;
    const v = { key, player, x, y, order: ++order };
    pressed.set(key, v);
    send(player, x, y, { source: key, repeat: false });
    schedule(delay);
  }
  function release(key) {
    const old = pressed.get(key);
    if (!old) return;
    const wasActive = active(old.player)?.key === key;
    pressed.delete(key);
    if (cancel) cancel(old.player, key);
    if (wasActive && enabled()) {
      const next = active(old.player);
      if (next && (next.x !== old.x || next.y !== old.y)) send(next.player, next.x, next.y, { source: next.key, repeat: false });
    }
    schedule(delay);
  }
  function clear() {
    if (timer !== null) stop(timer);
    timer = null;
    if (cancel) pressed.forEach(v => cancel(v.player, v.key));
    pressed.clear();
  }
  return { press, release, clear };
}
