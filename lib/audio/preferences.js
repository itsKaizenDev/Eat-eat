export const AUDIO_KEY = 'snake-audio-v1';
export const DEFAULT_AUDIO = { muted: false, music: .35, sfx: .7 };
export function parseAudio(raw) {
  let p; try { p = JSON.parse(raw); } catch { p = {}; }
  const volume = (v, d) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d;
  return { muted: p?.muted === true, music: volume(p?.music, .35), sfx: volume(p?.sfx, .7) };
}
export function loadAudio() { try { return parseAudio(localStorage.getItem(AUDIO_KEY)); } catch { return { ...DEFAULT_AUDIO }; } }
export function saveAudio(p) { try { localStorage.setItem(AUDIO_KEY, JSON.stringify(parseAudio(JSON.stringify(p)))); return true; } catch { return false; } }
