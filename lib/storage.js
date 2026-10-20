// Penyimpanan lokal yang aman: semua nilai divalidasi, storage yang hilang /
// ditolak / rusak tidak pernah menghasilkan NaN atau nilai di luar allowlist.
export const SPEEDS = ['santai', 'normal', 'ngebut', 'konstan'];
export const TA_DURATIONS = [30, 60, 90, 120];
export const KEYS = { best: 'snake_best', speed: 'snake-speed', ta: 'snake-ta', lefty: 'snake-lefty' };

export function parseBest(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
export function parseSpeed(raw) { return SPEEDS.includes(raw) ? raw : 'normal'; }
export function parseDuration(raw) {
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
  return TA_DURATIONS.includes(n) ? n : 90;
}

export function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
export function write(key, val) { try { localStorage.setItem(key, String(val)); return true; } catch (e) { return false; } }

export const loadBest = () => parseBest(read(KEYS.best));
export const saveBest = (v) => write(KEYS.best, parseBest(v));
export const loadSpeed = () => parseSpeed(read(KEYS.speed));
export const saveSpeed = (v) => SPEEDS.includes(v) && write(KEYS.speed, v);
export const loadDuration = () => parseDuration(read(KEYS.ta));
export const saveDuration = (v) => TA_DURATIONS.includes(v) && write(KEYS.ta, v);
