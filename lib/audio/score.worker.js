import { composeScore } from './score';
self.onmessage = ({ data }) => {
  try {
    const score = composeScore(data.key, data.sampleRate, data.variation);
    self.postMessage({ id: data.id, score }, [score.base.buffer, score.danger.buffer]);
  } catch (error) { self.postMessage({ id: data.id, error: String(error.message || error) }); }
};
