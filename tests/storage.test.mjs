import test from 'node:test';
import assert from 'node:assert/strict';
import { storage, grid, createRng, createSimClock } from './helpers/env.mjs';

test('storage: nilai rusak/di luar allowlist jatuh ke default', () => {
  assert.equal(storage.parseBest('abc'), 0);
  assert.equal(storage.parseBest('-5'), 0);
  assert.equal(storage.parseBest('12.7'), 12);
  assert.equal(storage.parseSpeed('warp'), 'normal');
  assert.equal(storage.parseSpeed('ngebut'), 'ngebut');
  assert.equal(storage.parseDuration('-5'), 90);
  assert.equal(storage.parseDuration('999999'), 90);
  assert.equal(storage.parseDuration('60'), 60);
});

test('storage: localStorage yang melempar error tidak merusak apa pun', () => {
  globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(storage.loadBest(), 0);
  assert.equal(storage.loadSpeed(), 'normal');
  assert.equal(storage.saveBest(5), false);
  assert.equal(storage.saveSpeed('santai'), false);
  assert.equal(storage.saveSpeed('warp'), false);
});

test('grid: pickFreeCell mengembalikan null bila penuh dan menghormati batas', () => {
  const b = { minX: 3, maxX: 4, minY: 3, maxY: 4 };
  const occ = new Set(); for (let y = 3; y <= 4; y++) for (let x = 3; x <= 4; x++) occ.add(grid.cellKey(x, y));
  assert.equal(grid.pickFreeCell(b, occ, Math.random), null);
  occ.delete(grid.cellKey(4, 4));
  assert.deepEqual(grid.pickFreeCell(b, occ, Math.random), { x: 4, y: 4 });
});

test('grid: aturan ekor', () => {
  const s = [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
  assert.equal(grid.bodyAfterMove(s, true).length, 3);
  assert.equal(grid.bodyAfterMove(s, false).length, 2);
});

test('rng: seed sama = urutan sama; jam simulasi membeku saat stop', () => {
  const a = createRng(7), b = createRng(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  let t = 100; const c = createSimClock(() => t);
  c.start(); t = 150; assert.equal(c.now(), 50);
  c.stop(); t = 9999; assert.equal(c.now(), 50);
  c.start(); t = 10049; assert.equal(c.now(), 100);
});
