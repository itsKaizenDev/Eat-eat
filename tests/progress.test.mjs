import test from 'node:test';
import assert from 'node:assert/strict';
import { progressLib, LEVELS } from './helpers/env.mjs';

const { parseProgress, recordPuzzleResult, isUnlocked, loadProgress, saveProgress, PROGRESS_KEY } = progressLib;
const empty = { v: 1, puzzle: { levels: {} } };

test('progres: string rusak / versi asing / bukan objek -> kosong, tidak melempar', () => {
  for (const raw of [null, undefined, '', 'bukan json', '{', '[]', '123', '"x"', '{"v":2,"puzzle":{"levels":{"jk-1":{"best":3}}}}', '{"puzzle":{}}', '{"v":1}', '{"v":1,"puzzle":null}'])
    assert.deepEqual(parseProgress(raw), empty, String(raw));
});

test('progres: entri liar dibersihkan (id aneh, best bukan integer / di luar rentang), entri sah dipertahankan', () => {
  const raw = JSON.stringify({ v: 1, puzzle: { levels: {
    'jk-1': { best: 15 }, 'jk-2': { best: 0 }, 'jk-3': { best: -4 }, 'jk-4': { best: 7.5 }, 'jk-5': { best: '9' },
    'JK 6': { best: 3 }, '__proto__': { best: 3 }, ['x'.repeat(40)]: { best: 3 }, 'jk-9': { best: 99999 }, 'jk-8': null,
  } } });
  assert.deepEqual(parseProgress(raw), { v: 1, puzzle: { levels: { 'jk-1': { best: 15 } } } });
});

test('progres: recordPuzzleResult — pertama kali, rekor baru, replay lebih buruk, input tidak valid', () => {
  let r = recordPuzzleResult(empty, 'jk-1', 20);
  assert.deepEqual([r.firstClear, r.newBest, r.progress.puzzle.levels['jk-1'].best], [true, true, 20]);
  r = recordPuzzleResult(r.progress, 'jk-1', 15);
  assert.deepEqual([r.firstClear, r.newBest, r.progress.puzzle.levels['jk-1'].best], [false, true, 15]);
  r = recordPuzzleResult(r.progress, 'jk-1', 30);
  assert.deepEqual([r.firstClear, r.newBest, r.progress.puzzle.levels['jk-1'].best], [false, false, 15]);
  const before = r.progress;
  for (const bad of [0, -1, 1.5, NaN, 10000, '5']) assert.equal(recordPuzzleResult(before, 'jk-1', bad).progress, before);
});

test('progres: recordPuzzleResult murni (tidak memutasi masukan)', () => {
  const frozen = Object.freeze({ v: 1, puzzle: Object.freeze({ levels: Object.freeze({}) }) });
  const r = recordPuzzleResult(frozen, 'jk-1', 9);
  assert.equal(r.progress.puzzle.levels['jk-1'].best, 9);
  assert.deepEqual(frozen.puzzle.levels, {});
});

test('progres: level terbuka berurutan', () => {
  const p0 = empty;
  assert.deepEqual(LEVELS.map((_, i) => isUnlocked(p0, LEVELS, i)), [true, false, false, false, false]);
  let p = recordPuzzleResult(p0, 'jk-1', 15).progress;
  assert.deepEqual(LEVELS.map((_, i) => isUnlocked(p, LEVELS, i)), [true, true, false, false, false]);
  p = recordPuzzleResult(p, 'jk-3', 13).progress; // melompati level 2 tidak membuka level 4
  assert.deepEqual(LEVELS.map((_, i) => isUnlocked(p, LEVELS, i)), [true, true, false, false, false]);
  assert.equal(isUnlocked(p, LEVELS, -1), false);
  assert.equal(isUnlocked(p, LEVELS, 99), false);
});

test('progres: simpan/baca lewat localStorage; storage menolak/hilang tidak merusak; key lama tidak tersentuh', () => {
  const store = { snake_best: '42', 'snake-speed': 'ngebut', 'snake-ta': '60', 'snake-lefty': '1' };
  globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  assert.deepEqual(loadProgress(), empty);
  assert.equal(saveProgress(recordPuzzleResult(empty, 'jk-1', 15).progress), true);
  assert.equal(PROGRESS_KEY, 'snake-progress-v1');
  assert.deepEqual(loadProgress().puzzle.levels, { 'jk-1': { best: 15 } });
  assert.deepEqual([store.snake_best, store['snake-speed'], store['snake-ta'], store['snake-lefty']], ['42', 'ngebut', '60', '1']);
  globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(loadProgress(), empty);
  assert.equal(saveProgress(empty), false);
  delete globalThis.localStorage;
  assert.deepEqual(loadProgress(), empty);
});
