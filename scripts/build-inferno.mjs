// Author the chapter offline and keep the input replay for each accepted mission.
import fs from 'node:fs';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

if (isMainThread) {
  const { root } = await import('../tests/helpers/env.mjs');
  const cache = root + '/node_modules/.cache/snake-tests/puzzle/';
  const { INFERNO_START, INFERNO_FINAL } = await import(pathToFileURL(cache + 'inferno-layout.mjs'));
  const jobs = Array.from({ length: INFERNO_FINAL - INFERNO_START }, (_, i) => INFERNO_START + i);
  const accepted = [];
  const rejected = [];
  await Promise.all(Array.from({ length: 4 }, () => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { cache } });
    worker.on('error', reject);
    function next() {
      if (jobs.length) worker.postMessage(jobs.shift());
      else worker.terminate().then(resolve, reject);
    }
    worker.on('message', result => {
      if (result.level) accepted.push(result);
      else rejected.push(result);
      console.log(JSON.stringify({ number: result.number, attempt: result.attempt, time: result.time, errors: result.errors }));
      next();
    });
    next();
  })));
  if (rejected.length) throw Error('Unproven Inferno levels: ' + rejected.map(r => r.number).join(', '));
  accepted.sort((a, b) => a.number - b.number);
  fs.writeFileSync(root + '/lib/puzzle/inferno-data.js',
    '// Verified Inferno maps. Regenerate with npm run build:inferno.\nexport const INFERNO_LEVELS = [\n' +
    accepted.map(r => '  ' + JSON.stringify(r.level)).join(',\n') + '\n];\n');
  const witnesses = Object.fromEntries(accepted.map(r => [r.number, r.trace]));
  fs.writeFileSync(root + '/tests/fixtures/inferno-witnesses.json', JSON.stringify(witnesses) + '\n');
  console.log(JSON.stringify({ accepted: accepted.length }));
} else {
  const load = name => import(pathToFileURL(workerData.cache + name + '.mjs'));
  const { infernoLayout } = await load('inferno-layout');
  const { verifyMission, idleSurvival, validateLevel } = await load('validation');
  parentPort.on('message', number => {
    let errors = [];
    for (let attempt = 0; attempt < 18; attempt++) {
      const level = infernoLayout(number, number * 1979 + attempt * 7411);
      errors = validateLevel(level);
      if (errors.length) continue;
      const idle = idleSurvival(level);
      if (!idle.ok) {
        errors = ['Idle failed: ' + JSON.stringify(idle)];
        continue;
      }
      for (const wait of [0, 2.5]) {
        const result = verifyMission(level, { maxNodes: 550, horizon: 70, wait, bonus: false });
        errors = result.errors;
        if (!result.ok || result.time > level.par) continue;
        parentPort.postMessage({ number, attempt, time: result.time, level, trace: result.trace });
        return;
      }
    }
    parentPort.postMessage({ number, errors });
  });
}
