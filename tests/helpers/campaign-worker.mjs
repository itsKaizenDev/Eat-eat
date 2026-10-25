import assert from 'node:assert/strict';
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
const load = file => import(pathToFileURL(workerData.cacheRoot + '/' + file + '.mjs'));
const campaign = await load('puzzle/campaign'), V = await load('puzzle/validation');
parentPort.on('message', task => {
  try {
    if (task.delayed) {
      const level = campaign.CAMPAIGN_LEVELS[task.number - 1];
      const r = V.verifyMission(level, { wait: 3, bonus: task.number < 16 });
      assert.ok(r.ok, level.variantId + ' ' + JSON.stringify({ ...r, trace: undefined }));
    } else {
      for (const level of campaign.CAMPAIGN_VARIANTS[task.number - 1]) {
        assert.deepEqual(V.idleSurvival(level), { ok: true, dead: 0, alerts: 0, status: 'playing' }, level.variantId);
        const r = V.verifyMission(level, { maxNodes: 1000, bonus: task.number < 16, wait: level.qualityProof?.initialWait || 0 });
        assert.ok(r.ok, level.variantId + ' ' + JSON.stringify({ ...r, trace: undefined }));
        if (task.number < 16) assert.equal(r.stars, 3);
        assert.ok(r.time <= level.par, level.variantId + ' exceeds par');
      }
    }
    parentPort.postMessage({ id: task.id, ok: true });
  } catch (error) {
    parentPort.postMessage({ id: task.id, ok: false, error: error.stack || String(error) });
  }
});
