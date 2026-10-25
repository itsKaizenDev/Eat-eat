import { composeScore } from './score';
// Music composition stays off the game/input thread. One in-flight score is
// allowed by the director; rapid mode switches coalesce to the latest scene.
export function createScoreRenderer() {
  let worker, nextId = 0, destroyed = false;
  const pending = new Map();
  function close(error) {
    worker?.terminate(); worker = null;
    for (const job of pending.values()) job.reject(error);
    pending.clear();
  }
  return {
    render(key, sampleRate, variation) {
      if (destroyed) return Promise.reject(new Error('Audio renderer disposed'));
      if (typeof Worker === 'undefined') return Promise.resolve(composeScore(key, sampleRate, variation));
      try {
        if (!worker) {
          worker = new Worker(new URL('./score.worker.js', import.meta.url));
          worker.onmessage = ({ data }) => {
            const job = pending.get(data.id); if (!job) return;
            pending.delete(data.id); if (data.error) job.reject(new Error(data.error)); else job.resolve(data.score);
          };
          worker.onerror = () => close(new Error('Music worker could not render'));
        }
        return new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, {resolve,reject}); worker.postMessage({id,key,sampleRate,variation}); });
      } catch (error) { close(error); return Promise.reject(error); }
    },
    destroy() { destroyed = true; close(new Error('Audio renderer disposed')); },
  };
}
