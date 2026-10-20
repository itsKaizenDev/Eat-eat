// Tahap 9b: kampanye 50 level di controller (5 tutorial + 45 buatan sistem), game over sengatan, pesan rintangan, progres.
import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle, generator, campaign, progressLib, LEVELS, makePuzzleWorld } from './helpers/env.mjs';

const { buildLevel, solve, newSession, move } = puzzle;
const { CAMPAIGN_SPECS, CAMPAIGN_LEVELS, CAMPAIGN_SEED } = campaign;
const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };
const clearedUpTo = (n) => ({ v: 1, puzzle: { levels: Object.fromEntries(CAMPAIGN_LEVELS.slice(0, n).map(l => [l.id, { best: l.par + 3 }])) } });

// ---------- data kampanye ----------
test('kampanye: 5 tutorial buatan tangan + 45 level buatan sistem = 50, id unik dan stabil', () => {
  assert.equal(CAMPAIGN_SPECS.length, 45);
  assert.equal(CAMPAIGN_LEVELS.length, 50);
  assert.deepEqual(CAMPAIGN_LEVELS.slice(0, 5).map(l => l.id), ['jk-1', 'jk-2', 'jk-3', 'jk-4', 'jk-5']);
  assert.deepEqual(CAMPAIGN_LEVELS.slice(5).map(l => l.id), Array.from({ length: 45 }, (_, i) => `gen-${i + 6}`));
  assert.equal(new Set(CAMPAIGN_LEVELS.map(l => l.id)).size, 50);
});

test('kampanye: semua level valid, solusi optimum solver = par, dan ada solusi yang menang saat diputar ulang', () => {
  for (const spec of CAMPAIGN_SPECS) {
    const r = buildLevel(spec);
    assert.ok(r.level, `${spec.id}: ${r.errors.join('; ')}`);
    const path = solve(r.level, 60000);
    assert.ok(path, `${spec.id} harus bisa diselesaikan`);
    assert.equal(path.length, spec.par, `${spec.id}: par harus = panjang solusi optimum`);
    let s = newSession(r.level);
    for (const k of path) { const m = move(s, k); assert.ok(m.moved, `${spec.id}: langkah ${k} ditolak`); s = m.session; }
    assert.equal(s.state.status, 'won', spec.id);
  }
});

test('kampanye: data yang dikirim identik dengan keluaran generator (seed kampanye tetap) — data basi tertangkap', () => {
  for (const spec of CAMPAIGN_SPECS) {
    const n = Number(spec.id.slice(4));
    const g = generator.getLevel(n, CAMPAIGN_SEED);
    assert.equal(g.fallback, false, spec.id);
    assert.deepEqual(spec.map, g.spec.map, spec.id);
    assert.deepEqual(spec.snake, g.spec.snake, spec.id);
    assert.equal(spec.par, g.par, spec.id);
  }
});

test('kampanye: kurva makin sulit (rata-rata par per sepertiga naik) dan tiap spec membawa tier + kartu pengantar bila tier baru', () => {
  const avg = (a, b) => { const xs = CAMPAIGN_SPECS.filter(s => { const n = Number(s.id.slice(4)); return n >= a && n <= b; }).map(s => s.par); return xs.reduce((x, y) => x + y, 0) / xs.length; };
  assert.ok(avg(6, 20) < avg(21, 34));
  for (const [i, lv] of CAMPAIGN_LEVELS.entries()) assert.equal(lv.guards.length, i < 34 ? 0 : i < 42 ? 1 : 2);
  for (const s of CAMPAIGN_SPECS) assert.ok(typeof s.tier === 'string' && s.tier);
  for (const n of [13, 20, 28, 35]) { const s = CAMPAIGN_SPECS.find(x => x.id === `gen-${n}`); assert.ok(s.intro && s.intro.length > 10, `level ${n} memperkenalkan elemen baru`); }
});

test('progres: id kampanye diterima parseProgress; rantai buka-kunci 50 level bekerja', () => {
  const p = progressLib.parseProgress(JSON.stringify(clearedUpTo(7)));
  assert.equal(p.puzzle.levels['gen-6'].best > 0, true);
  assert.equal(Object.keys(p.puzzle.levels).length, 7);
  assert.equal(progressLib.isUnlocked(p, CAMPAIGN_LEVELS, 7), true);
  assert.equal(progressLib.isUnlocked(p, CAMPAIGN_LEVELS, 8), false);
});

// ---------- controller dengan kampanye ----------
const world = (progress) => makePuzzleWorld({ progress, levels: CAMPAIGN_LEVELS });
const levelOf = (id) => CAMPAIGN_LEVELS.find(l => l.id === id);
const solutionOf = (id) => solve(levelOf(id), 60000);

test('controller: menu memuat 50 level; baru satu terbuka; level kampanye membawa info tier dan tutorial', () => {
  const w = world();
  const m = w.last('puzzleMenu');
  assert.equal(m.levels.length, 50);
  assert.deepEqual(m.levels.map(l => l.unlocked).filter(Boolean).length, 1);
  assert.equal(m.levels[0].tutorial, true); assert.equal(m.levels[5].tutorial, false);
  assert.equal(m.levels[5].tier, 'Lorong Kunci');
  assert.equal(w.last('puzzle').levelCount, 50);
});

test('controller: menyelesaikan tutorial membuka level 6; menang di level 6 menyimpan kunci progres gen-6', () => {
  const w = world(clearedUpTo(5));
  assert.equal(w.last('puzzleMenu').selected, 5, 'otomatis menyorot level terbuka pertama yang belum selesai');
  w.eng.startRun();
  assert.equal(w.last('puzzle').levelNo, 6);
  w.play(solutionOf('gen-6'));
  assert.equal(w.eng.getState(), 'won');
  assert.equal(w.progress.puzzle.levels['gen-6'].best, levelOf('gen-6').par);
  assert.equal(w.overlays('gameover').length, 1);
  assert.equal(w.saves.length, 1);
});

test('controller: level 50 selesai = "Semua Ruang Tamat!" sekali, tombol Main Lagi', () => {
  const w = world(clearedUpTo(49));
  assert.equal(w.last('puzzleMenu').selected, 49);
  w.eng.startRun();
  w.play(solutionOf('gen-50'));
  assert.equal(w.eng.getState(), 'won');
  const o = w.overlays('gameover');
  assert.equal(o.length, 1);
  assert.equal(o[0].overlay.title, 'Semua Ruang Tamat!');
  assert.equal(o[0].overlay.btnText, 'Main Lagi');
  assert.equal(w.saves.length, 1);
});

// ---------- game over: sengatan ----------
const ROOM = ['###########', '#.........#', '#.........#', '#.........#', '###########'];
const guardRoom = () => { const m = ROOM.map(r => r.split('')); m[3][9] = 'E'; const r = buildLevel({ id: 'tg', name: 'Uji Penjaga', goal: 'x', par: 99, map: m.map(x => x.join('')), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 8, y: 2, dir: 'L', range: 3 }] }); assert.ok(r.level, r.errors.join(';')); return r.level; };
const rejectRoom = (ch) => { const m = ROOM.map(r => r.split('')); m[3][9] = 'E'; m[1][3] = ch; const r = buildLevel({ id: 'tr', name: 'Uji', goal: 'x', par: 99, map: m.map(x => x.join('')), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] } }); assert.ok(r.level, r.errors.join(';')); return r.level; };

test('sengatan = game over: hasil satu kali, suara mati sekali, tidak menyimpan progres, input berikutnya diabaikan', () => {
  const w = makePuzzleWorld({ levels: [guardRoom()] });
  w.eng.startRun();
  w.play('RRR');
  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 24) w.eng.setDir(...D.W);
  assert.equal(w.eng.getState(), 'lost');
  const o = w.overlays('gameover');
  assert.equal(o.length, 1);
  assert.equal(o[0].overlay.title, 'Hati Habis!');
  assert.equal(o[0].overlay.btnText, 'Coba Lagi');
  assert.equal(w.calls.death, 1); assert.equal(w.saves.length, 0);
  const steps = w.last('score');
  w.eng.setDir(...D.D); w.eng.setDir(...D.R);
  assert.equal(w.last('score'), steps, 'tidak ada langkah setelah kalah');
  assert.equal(w.eng.undo(), false, 'game over: tidak bisa undo');
  assert.equal(w.overlays('gameover').length, 1);
});

test('Coba Lagi memulai level yang SAMA dari awal (langkah 0, penjaga di rumah)', () => {
  const w = makePuzzleWorld({ levels: [guardRoom()] });
  w.eng.startRun();
  w.play('RRR');
  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 24) w.eng.setDir(...D.W);
  assert.equal(w.eng.getState(), 'lost');
  assert.equal(w.eng.startRun(), true);
  assert.equal(w.eng.getState(), 'playing');
  assert.equal(w.last('score'), 0);
  assert.equal(w.last('puzzle').guard, 'idle');
  assert.equal(w.eng.startRun(), false, 'start ganda tidak berlaku');
});

test('HUD: penjaga melihat ular -> pesan peringatan + status guard "chase"; Palu/Perisai tampil di HUD', () => {
  const w = makePuzzleWorld({ levels: [guardRoom()] });
  w.eng.startRun();
  w.play('RRR');
  assert.equal(w.last('puzzle').guard, 'alert');
  assert.match(w.last('puzzle').message, /Terlihat! Satu giliran/);
  assert.equal(w.last('puzzle').hammer, 0); assert.equal(w.last('puzzle').shield, 0);
});

test('pesan penolakan rintangan: duri/retak/gerbang dijelaskan, tidak memakai langkah, bunyi tumbukan lembut', () => {
  for (const [ch, re] of [['^', /Duri.*Perisai/], ['x', /retak.*Palu/i], ['g', /Gerbang/]]) {
    const w = makePuzzleWorld({ levels: [rejectRoom(ch)] });
    w.eng.startRun();
    // gerbang 'g' terbuka di langkah genap; langkah pertama bernomor 1 (ganjil) -> tertutup
    w.play('R');
    assert.match(w.last('puzzle').message, re, ch);
    assert.equal(w.last('score'), 0); assert.equal(w.calls.eits, 0); assert.equal(w.calls.bump, 1);
  }
});

test('pengambilan Palu/Perisai: HUD menampilkan jumlah, pesan, dan bunyi', () => {
  const m = ROOM.map(r => r.split('')); m[3][9] = 'E'; m[1][3] = 'S'; m[1][4] = 'P';
  const lv = buildLevel({ id: 'tp', name: 'Uji', goal: 'x', par: 99, map: m.map(x => x.join('')), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] } }).level;
  const w = makePuzzleWorld({ levels: [lv] });
  w.eng.startRun(); w.play('R');
  assert.equal(w.last('puzzle').shield, 1); assert.match(w.last('puzzle').message, /Perisai/);
  w.play('R');
  assert.equal(w.last('puzzle').hammer, 1); assert.match(w.last('puzzle').message, /Palu/);
});
