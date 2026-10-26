import { MUSIC } from './catalog';

export function musicTrack(key, variation = 0) {
  return MUSIC[key + ':' + variation] || MUSIC[key + ':0'] || MUSIC['classic:0'];
}
// FLAC keeps exact loop frames. Browsers without FLAC decoding may use the
// same theme's MP3 mix; aborts never fall through into an obsolete request.
export async function loadMusicFiles(track, context, signal, fetchFile = globalThis.fetch?.bind(globalThis), formatTimeoutMs = 7000) {
  if (!fetchFile) throw new Error('Audio file loading is unavailable');
  async function decode(url, requestSignal) {
    const response = await fetchFile(url, {signal:requestSignal});
    if (!response.ok) throw new Error('Music file could not load: ' + url);
    const bytes = await response.arrayBuffer();
    if (signal?.aborted || requestSignal?.aborted) throw new Error('Music loading cancelled');
    const buffer = await context.decodeAudioData(bytes);
    if (!buffer.length || !Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('Empty music file: ' + url);
    return buffer;
  }
  const controller = new AbortController();
  const abort = () => controller.abort(); signal?.addEventListener('abort',abort,{once:true});
  if (signal?.aborted) controller.abort();
  let timer;
  try {
    const stems = Promise.all([decode(track.base, controller.signal), track.danger ? decode(track.danger,controller.signal) : null]);
    const [base, dangerFile] = await Promise.race([stems,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Stem format timeout'));},formatTimeoutMs);})]);
    const danger = dangerFile || context.createBuffer(1,base.length,base.sampleRate);
    if (base.sampleRate !== danger.sampleRate || Math.abs(base.length-danger.length) > 2) throw new Error('Music stems must have matching sample lengths');
    return [base,danger];
  } catch (error) {
    if (signal?.aborted || !track.preview) throw error;
    controller.abort(); clearTimeout(timer);
    const base = await decode(track.preview,signal);
    const buffers=[base,context.createBuffer(1,base.length,base.sampleRate)];
    // Array shape remains compatible with callers expecting two stems.
    buffers.fallback=true; return buffers;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort',abort); }
}
