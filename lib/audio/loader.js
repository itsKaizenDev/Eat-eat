import { MUSIC } from './catalog';

export function musicTrack(key, variation = 0) {
  return MUSIC[key + ':' + variation] || MUSIC[key + ':0'] || MUSIC['classic:0'];
}
// Decode only the active theme's stems. MP3 previews are for listening outside
// the game; lossless FLAC stems retain the exact loop boundaries in gameplay.
export async function loadMusicFiles(track, context, signal, fetchFile = globalThis.fetch?.bind(globalThis)) {
  if (!fetchFile) throw new Error('Audio file loading is unavailable');
  async function decode(url) {
    const response = await fetchFile(url, {signal});
    if (!response.ok) throw new Error('Music file could not load: ' + url);
    const bytes = await response.arrayBuffer();
    if (signal?.aborted) throw new Error('Music loading cancelled');
    const buffer = await context.decodeAudioData(bytes);
    if (!buffer.length || !Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('Empty music file: ' + url);
    return buffer;
  }
  const [base, dangerFile] = await Promise.all([decode(track.base), track.danger ? decode(track.danger) : null]);
  const danger = dangerFile || context.createBuffer(1,base.length,base.sampleRate);
  if (base.sampleRate !== danger.sampleRate || Math.abs(base.length-danger.length) > 2) throw new Error('Music stems must have matching sample lengths');
  return [base,danger];
}
