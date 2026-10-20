import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { root, puzzle as P, createPuzzleGame, makePuzzleWorld } from './helpers/env.mjs';
const { createDirectionInput } = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/input.mjs'));
const room = (id = 'input') => P.buildLevel({ id, name: id, par: 10, map: ['########', '#.....E#', '#......#', '#......#', '#......#', '#......#', '########'], snake: [[3, 4]], dir: 'U', exit: { keys: 0, plates: [] } }).level;

test('arah baru mengganti repeat lama, satu tap tidak menjadi tiga langkah', () => {
  const w = makePuzzleWorld({ levels: [room()], animate: true }); w.eng.startRun();
  w.eng.setDir(0, -1); w.now += 20; w.eng.setDir(0, -1, { repeat: true, source: 'up' }); w.eng.setDir(-1, 0);
  w.frame(130); w.frame(130);
  assert.equal(w.last('score'), 2); assert.equal(w.rafQueue.length, 0); w.eng.destroy();
});

test('arah tertahan tembok tidak menahan arah baru; repeat yang dilepas dibatalkan', () => {
  const lv = { ...room(), snake: [{ x: 3, y: 2 }] };
  const w = makePuzzleWorld({ levels: [lv], animate: true }); w.eng.startRun();
  w.eng.setDir(0, -1); w.eng.setDir(0, -1, { repeat: true, source: 'up' }); w.eng.setDir(-1, 0);
  w.frame(130); assert.equal(w.last('score'), 2);
  w.eng.setDir(-1, 0, { repeat: true, source: 'left' }); w.eng.cancelHeldInput('left'); w.frame(130);
  assert.equal(w.last('score'), 2); w.eng.destroy();
});

test('repeat milik aplikasi, arah terakhir menang, keyup/clear berhenti dan pemain terpisah', () => {
  const calls = [], timers = new Map(); let seq = 0, enabled = true;
  const input = createDirectionInput({ send: (...v) => calls.push(v), enabled: () => enabled, stepMode: () => true,
    later: fn => { timers.set(++seq, fn); return seq; }, stop: id => timers.delete(id) });
  const tick = () => { const q = [...timers.values()]; timers.clear(); q.forEach(fn => fn()); };
  input.press('up', 0, 0, -1); input.press('up', 0, 0, -1); assert.equal(calls.length, 1);
  tick(); assert.equal(calls.length, 2); assert.equal(calls[1][3].repeat, true);
  input.press('left', 0, -1, 0); input.release('up'); tick();
  assert.deepEqual(calls.at(-1).slice(0, 3), [0, -1, 0]);
  input.press('p2', 1, 1, 0); tick(); assert.equal(calls.at(-1)[0], 1);
  input.clear(); const n = calls.length; tick(); assert.equal(calls.length, n);
  input.press('diagonal', 0, 1, 1); assert.equal(calls.length, n);
  input.press('left', 0, -1, 0); enabled = false; tick(); assert.equal(timers.size, 0);
});

test('gagal simpan A lalu berhasil simpan B tetap menyimpan dua ruang dan dua koin', () => {
  const lv = P.buildLevel({ id: 'save-a', name: 'save', par: 4, map: ['########', '#.FK.E.#', '########'], snake: [[1, 1]], dir: 'R', exit: { keys: 1, plates: [] } }).level;
  const noop = () => {}, ctx = new Proxy({}, { get: () => noop, set: () => true });
  let disk = { v: 1, puzzle: { levels: {} } }, saves = 0, last;
  const e = createPuzzleGame({ canvas: { width: 680, height: 600, getContext: () => ctx }, sounds: { playChomp: noop, playMove: noop },
    levels: [lv, { ...lv, id: 'save-b' }], io: { load: () => disk, save: p => { if (++saves === 1) return false; disk = p; return true; } }, onUpdate: p => { if (p.puzzleMenu) last = p.puzzleMenu; } });
  e.startRun(); for (let i = 0; i < 4; i++) e.setDir(1, 0); assert.equal(last.savePending, true);
  e.startRun(); for (let i = 0; i < 4; i++) e.setDir(1, 0);
  assert.equal(last.savePending, false); assert.equal(last.coins, 2); assert.ok(disk.puzzle.levels['save-a']); assert.ok(disk.puzzle.levels['save-b']);
  assert.equal(last.levels[1].unlocked, true); e.destroy();
});
