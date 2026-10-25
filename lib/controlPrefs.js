// Touch control preferences: size, feel and position of the joystick and action buttons.
export const CONTROL_KEY = 'snake-controls-v2';
export const DEFAULT_CONTROLS = { pad: 1.15, btn: 1, opacity: 1, dead: .12, smooth: true, floating: false, padOff: { x: 0, y: 0 }, btnOff: { x: 0, y: 0 } };
const clamp = (v, lo, hi, fallback) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
export function normalizeControls(raw = {}) {
  const d = DEFAULT_CONTROLS, off = (o, f) => ({ x: clamp(o?.x, -2000, 2000, f.x), y: clamp(o?.y, -2000, 2000, f.y) });
  return { pad: clamp(raw.pad, .8, 1.6, d.pad), btn: clamp(raw.btn, .8, 1.5, d.btn), opacity: clamp(raw.opacity, .35, 1, d.opacity), dead: clamp(raw.dead, .04, .3, d.dead),
    smooth: raw.smooth !== false, floating: raw.floating === true, padOff: off(raw.padOff, d.padOff), btnOff: off(raw.btnOff, d.btnOff) };
}
export function loadControls() { try { return normalizeControls(JSON.parse(localStorage.getItem(CONTROL_KEY) || '{}')); } catch { return normalizeControls(); } }
export function saveControls(value) { try { localStorage.setItem(CONTROL_KEY, JSON.stringify(normalizeControls(value))); } catch {} }
// CSS variables consumed by globals.css; offsets are in CSS pixels from the default corner.
export const controlVars = c => ({ '--pad-scale': c.pad, '--btn-scale': c.btn, '--ctl-opacity': c.opacity, '--pad-dx': `${c.padOff.x}px`, '--pad-dy': `${c.padOff.y}px`, '--btn-dx': `${c.btnOff.x}px`, '--btn-dy': `${c.btnOff.y}px` });
