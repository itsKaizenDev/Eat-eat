import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle, LEVELS, RAW_LEVELS, REJECTED_LEVELS, loadLevels, makePuzzleWorld, animLib, pathLib } from './helpers/env.mjs';
import { SOLUTIONS } from './puzzle.fixtures.mjs';

const { buildLevel, newSession, move, undo, restart, stepState, solve, initialState } = puzzle;
const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
const build = (spec) => { const r = buildLevel({ par: 1, ...spec }); assert.ok(r.level, 'level harus valid: ' + r.errors.join('; ')); return r.level; };
const run = (session, path) => { let s = session; for (const k of path) s = move(s, k).session; return s; };

// ---------- konten level ----------
test('level: kelima level valid, id unik, tidak ada yang ditolak', () => {
  assert.equal(RAW_LEVELS.length, 5);
  assert.equal(LEVELS.length, 5);
  assert.deepEqual(REJECTED_LEVELS, []);
  assert.equal(new Set(LEVELS.map(l => l.id)).size, 5);
});

for (const lv of LEVELS) {
  test(`level ${lv.id} (${lv.name}): solusi beku diputar ulang -> menang, panjang = par = optimum BFS`, () => {
    const sol = SOLUTIONS[lv.id];
    assert.ok(sol, 'solusi ada');
    let s = newSession(lv);
    for (const k of sol) { const r = move(s, k); assert.ok(r.moved, `langkah ${k} ditolak (${r.reason})`); s = r.session; }
    assert.equal(s.state.status, 'won');
    assert.equal(s.state.steps, sol.length);
    assert.equal(lv.par, sol.length, 'par = panjang solusi');
    assert.equal(solve(lv).length, lv.par, 'par = optimum BFS');
  });
}

// ---------- tiap mekanik benar-benar dibutuhkan (ablasi) ----------
const ablate = (id, mutate) => { const spec = JSON.parse(JSON.stringify(RAW_LEVELS.find(l => l.id === id))); mutate(spec); const r = buildLevel(spec); return r.level ? solve(r.level) : 'invalid'; };
test('ablasi: semua apel opsional, menghapusnya tidak mengubah solusi optimum', () => {
  for (const lv of LEVELS) assert.equal(ablate(lv.id, sp => { sp.map = sp.map.map(r => r.replace(/F/g, '.')); }).length, lv.par);
});
test('ablasi: portal dibutuhkan di level 4 dan 5', () => {
  for (const id of ['jk-4', 'jk-5']) assert.equal(ablate(id, sp => { sp.map = sp.map.map(r => r.replace(/[123]/g, '.')); }), null, id);
});
test('ablasi: syarat kunci dan plate memperpanjang solusi', () => {
  assert.ok(ablate('jk-1', sp => { sp.exit.keys = 0; }).length < LEVELS[0].par);
  assert.ok(ablate('jk-2', sp => { sp.exit.plates = []; }).length < LEVELS[1].par);
  assert.ok(ablate('jk-3', sp => { sp.exit.plates = []; }).length < LEVELS[2].par);
  assert.ok(ablate('jk-5', sp => { sp.exit.plates = []; }).length < LEVELS[4].par);
  assert.ok(ablate('jk-5', sp => { sp.exit.keys = 0; }).length < LEVELS[4].par);
});

// ---------- aturan langkah ----------
const corridor = (map, snake, dir, exit) => build({ id: 't', name: 't', map, snake, dir, exit });

test('aturan: gerakan yang ditolak tidak mengubah state, tidak menghabiskan langkah, tidak menambah riwayat undo', () => {
  const lv = LEVELS[0];
  const s0 = deepFreeze(newSession(lv));
  // jk-1: kepala (3,1) leher (4,1) dir L. Berbalik -> ditolak; atas -> tembok; pintu/tembok dll.
  const rev = move(s0, 'R'); assert.equal(rev.moved, true); assert.equal(rev.state.snake.length, 1);
  const wall = move(s0, 'U'); assert.equal(wall.moved, false); assert.equal(wall.reason, 'tembok'); assert.equal(wall.session, s0);
  assert.equal(s0.state.steps, 0); assert.equal(s0.history.length, 0);
});

test('aturan: maskot hanya satu petak dan bebas berbalik tanpa tabrakan tubuh', () => {
  const lv = LEVELS[0];
  const s = newSession(lv), next = move(s, 'R');
  assert.equal(next.state.snake.length, 1);
  const back = move(next.session, 'L');
  assert.deepEqual(back.state.snake, s.state.snake);
  assert.equal(back.state.steps, 2);
});

test('aturan: pintu terkunci kunci -> ditolak dengan jumlah kunci yang kurang; setelah kunci diambil diterima', () => {
  const lv = corridor(['#######', '#.E..K#', '#.....#', '#######'], [[3, 1], [4, 1]], 'L', { keys: 1, plates: [] });
  const locked = move(newSession(lv), 'L'); // kepala (3,1) -> (2,1) = pintu
  assert.equal(locked.moved, false); assert.equal(locked.reason, 'pintu'); assert.equal(locked.detail.keysMissing, 1);
  assert.equal(locked.session.state.steps, 0); assert.equal(locked.session.history.length, 0);
  // jalan memutar: D (3,2), R (4,2), R (5,2), U (5,1)=kunci, lalu kembali ke pintu
  const open = run(newSession(lv), 'DRRULL');
  assert.equal(open.state.keysHeld, 1);
  assert.deepEqual(open.state.snake[0], { x: 3, y: 1 });
  const win = move(open, 'L'); // (3,1) -> (2,1) = pintu, kunci sudah dipegang
  assert.equal(win.moved, true); assert.equal(win.session.state.status, 'won');
});

test('aturan: sakelar tetap aktif setelah ditinggal dan undo memulihkannya', () => {
  const lv = corridor(['########', '#.a..E.#', '########'], [[3, 1]], 'L', { keys: 0, plates: ['a'] });
  let s = newSession(lv);
  s = move(s, 'L').session;
  assert.deepEqual(s.state.activated, ['a']);
  assert.deepEqual(undo(s).session.state.activated, []);
  s = run(s, 'RRR');
  assert.equal(s.state.status, 'won');
  assert.deepEqual(s.state.activated, ['a']);
});

test('aturan: koleksi menambah hitungan apel saja; kunci terpisah, panjang tetap satu', () => {
  const lv = corridor(['########', '#..FK.E#', '########'], [[2, 1]], 'R', { keys: 1, plates: [] });
  let r = move(newSession(lv), 'R');
  assert.equal(r.events.ate, true); assert.equal(r.state.snake.length, 1); assert.equal(r.state.apples, 1);
  assert.equal(r.state.foods.length, 0);
  const before = r.session;
  r = move(r.session, 'R');
  assert.equal(r.events.key, true); assert.equal(r.state.snake.length, 1); assert.equal(r.state.keysHeld, 1);
  assert.equal(r.state.apples, 1);
  assert.deepEqual(undo(before).session.state.apples, 0);
});

test('aturan: portal bekerja dua arah (ujung a->b dan b->a)', () => {
  const lv4 = LEVELS.find(l => l.id === 'jk-4');
  let s = run(newSession(lv4), 'DR'); // masuk portal 1 di (3,3) -> muncul di (6,4)
  assert.deepEqual(s.state.snake[0], { x: 6, y: 4 });
  s = run(s, 'UL');                    // masuk portal 2 di (5,3) -> muncul di (9,4)
  assert.deepEqual(s.state.snake[0], { x: 9, y: 4 });
  const lv = build({ id: 'pp', name: 'pp', map: ['#########', '#1..#..1#', '#...#...#', '#...#..E#', '#########'], snake: [[6, 1], [5, 1]], dir: 'R', exit: { keys: 0, plates: [] } });
  const back = move(newSession(lv), 'R'); // masuk ujung kanan (7,1) -> muncul di ujung kiri (1,1)
  assert.equal(back.moved, true); assert.equal(back.events.warped, true);
  assert.deepEqual(back.session.state.snake[0], { x: 1, y: 1 });
});

test('aturan: teleport maskot tidak meninggalkan tubuh di ujung portal', () => {
  const lv = build({ id: 'pb', name: 'pb', map: ['#########', '#1..#..1#', '#...#...#', '#...#..E#', '#########'], snake: [[6, 1]], dir: 'R', exit: { keys: 0, plates: [] } });
  const r = move(newSession(lv), 'R');
  assert.equal(r.moved, true); assert.equal(r.state.snake.length, 1);
  assert.deepEqual(r.state.snake[0], { x: 1, y: 1 });
});

test('murni: simulasi tidak memutasi state/level (state beku tidak melempar)', () => {
  for (const lv of LEVELS) {
    deepFreeze(lv);
    let s = deepFreeze(newSession(lv));
    for (const k of SOLUTIONS[lv.id]) { const r = move(s, k); s = deepFreeze(r.session); }
    assert.equal(s.state.status, 'won');
  }
});

// ---------- undo & restart ----------
test('undo: dapat diulang sampai awal dan memulihkan state PERSIS (semua level, setiap langkah)', () => {
  for (const lv of LEVELS) {
    const sol = SOLUTIONS[lv.id];
    const snapshots = [newSession(lv)];
    let s = snapshots[0];
    for (const k of sol.slice(0, -1)) { s = move(s, k).session; snapshots.push(s); }
    for (let i = snapshots.length - 1; i > 0; i--) {
      const u = undo(s); assert.equal(u.undone, true);
      s = u.session;
      assert.deepEqual(s.state, snapshots[i - 1].state, `${lv.id}: setelah undo ke langkah ${i - 1}`);
    }
    assert.equal(undo(s).undone, false, 'tidak bisa undo melewati awal');
    assert.deepEqual(s.state, initialState(lv));
  }
});

test('undo: dari kondisi menang memulihkan status playing; langkah menang yang sama menghasilkan state menang yang identik', () => {
  const lv = LEVELS[1], sol = SOLUTIONS['jk-2'];
  const pre = run(newSession(lv), sol.slice(0, -1));
  const won = move(pre, sol[sol.length - 1]);
  assert.equal(won.session.state.status, 'won');
  const u = undo(won.session);
  assert.deepEqual(u.session.state, pre.state);
  assert.equal(u.session.state.status, 'playing');
  const again = move(u.session, sol[sol.length - 1]);
  assert.deepEqual(again.session.state, won.session.state);
});

test('restart: kembali ke state awal dengan riwayat kosong', () => {
  const s = run(newSession(LEVELS[0]), 'DD');
  const r = restart(s);
  assert.deepEqual(r.state, initialState(LEVELS[0]));
  assert.equal(r.history.length, 0);
});

// ---------- validasi level ----------
const base = () => JSON.parse(JSON.stringify(RAW_LEVELS[0]));
const invalid = (name, mutate, fragment) => test(`validasi: level invalid ditolak — ${name}`, () => {
  const spec = base(); mutate(spec);
  const r = buildLevel(spec);
  assert.equal(r.level, null);
  assert.ok(r.errors.some(e => e.includes(fragment)), `diharapkan error memuat "${fragment}", dapat: ${r.errors.join(' | ')}`);
  const { levels, rejected } = loadLevels([spec]);
  assert.equal(levels.length, 0); assert.equal(rejected.length, 1);
});
invalid('baris tidak rata', s => { s.map[2] = '#E..#..K'; }, 'baris 2');
invalid('dua pintu keluar', s => { s.map[1] = '#E......#'; }, 'tepat 1 pintu');
invalid('tanpa pintu keluar', s => { s.map[2] = '#...#..K#'; }, 'tepat 1 pintu');
invalid('karakter asing', s => { s.map[1] = '#...?...#'; }, 'tidak dikenal');
invalid('ular menimpa tembok', s => { s.snake = [[4, 2], [3, 2]]; }, 'tembok');
invalid('ular tidak bersebelahan', s => { s.snake = [[3, 1], [6, 1]]; }, 'tidak bersebelahan');
invalid('tanpa posisi pemain', s => { s.snake = []; }, 'minimal 1');
invalid('arah tidak cocok', s => { s.dir = 'R'; }, 'tidak sesuai');
invalid('arah tidak dikenal', s => { s.dir = 'X'; }, 'arah awal');
invalid('par nol', s => { s.par = 0; }, 'par');
invalid('kunci kurang', s => { s.exit.keys = 2; }, 'butuh 2 kunci');
invalid('plate syarat tidak ada', s => { s.exit.plates = ['a']; }, "plate 'a'");
invalid('portal satu ujung', s => { s.map[3] = '#1......#'; }, 'portal 1');
invalid('makanan di atas ular', s => { s.map[1] = '#..FF...#'; s.snake = [[3, 1], [4, 1]]; }, 'dipakai');
invalid('peta kosong', s => { s.map = []; }, 'map kosong');

// ---------- controller ----------
test('controller: lifecycle — mulai sekali, arah tidak memulai dari menu, pause menahan input', () => {
  const w = makePuzzleWorld();
  assert.equal(w.eng.getState(), 'menu');
  w.eng.setDir(0, 1);
  assert.equal(w.eng.getState(), 'menu', 'arah tidak memulai ronde puzzle');
  assert.equal(w.eng.startRun(), true);
  assert.equal(w.eng.startRun(), false, 'start kedua ditolak');
  w.play('D');
  assert.equal(w.last('score'), 1);
  w.eng.pauseRun('help');
  w.play('D');
  assert.equal(w.last('score'), 1, 'input saat pause diabaikan');
  assert.equal(w.eng.resumeRun(), false, 'penghalang bantuan');
  w.eng.releasePause('help');
  assert.equal(w.eng.getState(), 'paused', 'melepas penghalang tidak melanjutkan');
  assert.equal(w.eng.resumeRun(), true);
  w.play('D');
  assert.equal(w.last('score'), 2);
});

test('controller: gerakan tertolak memberi pesan, bunyi tumbukan lembut (BUKAN eits), dan tidak mengubah langkah', () => {
  const w = makePuzzleWorld();
  w.eng.startRun();
  w.play('U');
  assert.equal(w.last('score'), 0);
  assert.equal(w.last('puzzle').message, 'Terhalang tembok.');
  assert.equal(w.calls.bump, 1); assert.equal(w.calls.eits, 0, 'puzzle tidak bisa mati: tidak memakai suara peringatan bahaya');
  assert.equal(w.eng.undo(), false, 'belum ada yang dibatalkan');
});

test('suara puzzle: pintu terkunci = bunyi "terkunci", berbalik = senyap, menang = bunyi menang; eits tidak pernah dipakai', () => {
  const w = makePuzzleWorld();
  w.eng.startRun();
  w.play('L');  // kepala (3,1) -> (2,1), lalu lanjut ke pintu tanpa kunci
  w.play('LL'); // (1,1) lalu (0,1)=tembok -> bump; sebelumnya (1,2) pintu
  const bumps = w.calls.bump;
  w.play('D');  // (1,1)->(1,2)=pintu E tanpa kunci
  assert.equal(w.calls.locked, 1);
  w.play('U'); w.play('D');
  assert.ok(w.calls.bump >= bumps);
  const w2 = makePuzzleWorld(); w2.eng.startRun(); w2.play('R'); // berbalik ke leher
  assert.equal(w2.calls.bump + w2.calls.locked + w2.calls.eits, 0, 'berbalik tidak berbunyi');
  const w3 = makePuzzleWorld();
  for (const lv of LEVELS) { w3.eng.startRun(); w3.play(SOLUTIONS[lv.id]); }
  assert.equal(w3.calls.win, 5); assert.equal(w3.calls.eits, 0);
});

test('controller: undo & ulang level lewat API', () => {
  const w = makePuzzleWorld();
  w.eng.startRun();
  w.play('DD');
  assert.equal(w.last('score'), 2);
  assert.equal(w.eng.undo(), true); assert.equal(w.last('score'), 1);
  assert.equal(w.eng.undo(), true); assert.equal(w.last('score'), 0);
  assert.equal(w.eng.undo(), false);
  w.play('DD'); assert.equal(w.eng.restartLevel(), true); assert.equal(w.last('score'), 0);
});

test('controller: level selesai tepat sekali — hasil satu kali, progres tersimpan sekali, level berikutnya terbuka', () => {
  const w = makePuzzleWorld();
  w.eng.startRun();
  w.play(SOLUTIONS['jk-1']);
  assert.equal(w.eng.getState(), 'won');
  assert.equal(w.overlays('gameover').length, 1);
  assert.equal(w.overlays('gameover')[0].overlay.title, 'Ruang Selesai!');
  assert.equal(w.saves.length, 1);
  assert.equal(w.progress.puzzle.levels['jk-1'].best, 13);
  assert.equal(w.last('puzzleMenu').selected, 1, 'otomatis menyorot level berikutnya');
  assert.equal(w.last('puzzleMenu').levels[1].unlocked, true);
  // masukan setelah menang diabaikan: tidak ada hasil/simpan tambahan, undo juga tidak bisa
  w.play('LLLL'); assert.equal(w.eng.undo(), false);
  assert.equal(w.overlays('gameover').length, 1); assert.equal(w.saves.length, 1);
});

test('controller: level terkunci tidak bisa dipilih; hanya di menu', () => {
  const w = makePuzzleWorld();
  assert.equal(w.eng.setLevel(2), false, 'level 3 terkunci');
  assert.equal(w.eng.setLevel(0), true);
  w.eng.startRun();
  assert.equal(w.eng.setLevel(0), false, 'tidak bisa saat bermain');
});

test('controller: replay lebih panjang tidak merusak rekor; replay lebih pendek memperbaikinya', () => {
  const LONGER = 'LR' + SOLUTIONS['jk-1']; // jalur menang 17 langkah (par 15), diverifikasi DFS
  // rekor lama 15; percobaan 17 langkah TIDAK boleh menimpa
  const w = makePuzzleWorld({ progress: { v: 1, puzzle: { levels: { 'jk-1': { best: 13 } } } } });
  assert.equal(w.eng.setLevel(0), true);
  w.eng.startRun(); w.play(LONGER);
  assert.equal(w.eng.getState(), 'won');
  assert.equal(w.last('score'), 15);
  assert.equal(w.progress.puzzle.levels['jk-1'].best, 13, 'rekor tetap 15');
  assert.ok(!/Rekor baru/.test(w.overlays('gameover')[0].overlay.sub));
  // rekor lama 20; percobaan 15 langkah memperbaikinya dan diumumkan
  const w2 = makePuzzleWorld({ progress: { v: 1, puzzle: { levels: { 'jk-1': { best: 20 } } } } });
  w2.eng.setLevel(0); w2.eng.startRun(); w2.play(SOLUTIONS['jk-1']);
  assert.equal(w2.progress.puzzle.levels['jk-1'].best, 13);
  assert.match(w2.overlays('gameover')[0].overlay.sub, /Rekor baru/);
  assert.match(w2.overlays('gameover')[0].overlay.sub, /Par tercapai/);
});

test('controller: kelima level diselesaikan berurutan lewat input; tombol akhir "Main Lagi"', () => {
  const w = makePuzzleWorld();
  for (const lv of LEVELS) {
    w.eng.startRun();
    assert.equal(w.last('puzzle').name, lv.name);
    w.play(SOLUTIONS[lv.id]);
    assert.equal(w.eng.getState(), 'won', lv.id);
  }
  assert.equal(w.overlays('gameover').length, 5);
  assert.equal(w.overlays('gameover')[4].overlay.btnText, 'Main Lagi');
  LEVELS.forEach(l => assert.equal(w.progress.puzzle.levels[l.id].best, l.par));
  assert.equal(w.saves.length, 5);
});

test('controller: returnToMenu membersihkan ronde; level yang dipilih tetap', () => {
  const w = makePuzzleWorld();
  w.eng.startRun(); w.play('DD');
  w.eng.returnToMenu();
  assert.equal(w.eng.getState(), 'menu');
  assert.equal(w.last('score'), 0);
  assert.equal(w.overlays('start').length >= 2, true);
  assert.equal(w.eng.startRun(), true);
});

test('controller: tanpa level valid, mode tidak bisa dimulai dan tidak melempar', () => {
  const w = makePuzzleWorld({ levels: [] });
  assert.equal(w.eng.startRun(), false);
  assert.equal(w.last('puzzleMenu').levels.length, 0);
});

// ---------- animasi ----------
test('anim: animatedPoints — mulai dari posisi lama, tengah, selesai; tumbuh; lompatan portal tidak diinterpolasi', () => {
  const { animatedPoints } = animLib;
  const from = [{ x: 3, y: 1 }, { x: 4, y: 1 }];
  const cur = [{ x: 2, y: 1 }, { x: 3, y: 1 }];
  assert.deepEqual(animatedPoints(cur, from, 0), [{ x: 3, y: 1 }, { x: 4, y: 1 }]);
  assert.deepEqual(animatedPoints(cur, from, 0.5), [{ x: 2.5, y: 1 }, { x: 3.5, y: 1 }]);
  assert.deepEqual(animatedPoints(cur, from, 1), cur);
  assert.deepEqual(animatedPoints(cur, null, 0.3), cur);
  // tumbuh: segmen ekor baru muncul diam di sel ekor lama (tidak meluncur dari tempat lain)
  const grown = [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }];
  const g = animatedPoints(grown, from, 0.5);
  assert.deepEqual(g[2], { x: 4, y: 1 });
  // lompatan: kepala berpindah > 1 sel -> langsung di tujuan, tubuh lain tetap meluncur
  const jumped = [{ x: 9, y: 4 }, { x: 3, y: 1 }];
  const j = animatedPoints(jumped, from, 0.5);
  assert.deepEqual(j[0], { x: 9, y: 4 }); assert.deepEqual(j[1], { x: 3.5, y: 1 });
  // memendek: segmen berlebih tidak dihasilkan
  assert.equal(animatedPoints([{ x: 2, y: 1 }], from, 0.5).length, 1);
  assert.ok(animLib.easeOutCubic(0) === 0 && animLib.easeOutCubic(1) === 1 && animLib.easeOutCubic(0.5) > 0.5);
});

test('anim: traceSmooth membulatkan tikungan dan memutus garis di lompatan', () => {
  const calls = [];
  const ctx = { beginPath: () => calls.push('begin'), moveTo: () => calls.push('move'), lineTo: () => calls.push('line'), quadraticCurveTo: () => calls.push('quad') };
  pathLib.traceSmooth(ctx, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }], 1.5);
  assert.deepEqual(calls, ['begin', 'move', 'quad', 'quad', 'line']);
  calls.length = 0;
  pathLib.traceSmooth(ctx, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 9, y: 9 }, { x: 9, y: 8 }], 1.5);
  assert.equal(calls.filter(c => c === 'move').length, 2, 'dua potongan karena lompatan');
});

test('anim: controller menjadwalkan frame hanya selama animasi, lalu berhenti; simulasi tidak berubah', () => {
  const w = makePuzzleWorld({ animate: true });
  assert.equal(w.rafQueue.length, 0, 'diam = tidak ada loop per-frame');
  w.eng.startRun(); assert.equal(w.rafQueue.length, 0);
  w.play('D');
  assert.equal(w.rafQueue.length, 1, 'langkah memulai animasi');
  assert.equal(w.last('score'), 1, 'state langsung final, animasi hanya visual');
  let frames = 0;
  while (w.rafQueue.length && frames < 50) { w.frame(16); frames++; }
  assert.ok(frames >= 5 && frames <= 12, 'sekitar 120 ms / 16 ms: ' + frames);
  assert.equal(w.rafQueue.length, 0, 'loop berhenti setelah animasi selesai');
  // langkah beruntun cepat: tidak menumpuk loop (maks satu terjadwal)
  w.play('DD'); assert.ok(w.rafQueue.length <= 1);
  w.eng.destroy(); assert.equal(w.rafQueue.length, 0, 'destroy membatalkan frame tertunda');
});

test('anim: efek pop saat makan dan riak saat portal; undo dan ulang tidak merusak state', () => {
  const w = makePuzzleWorld({ animate: true });
  for (let i = 0; i < 1; i++) w.eng.setLevel(0);
  w.eng.startRun();
  w.play('D'); w.frame(150); w.play('D'); w.frame(400);
  assert.equal(w.last('score'), 2);
  assert.equal(w.eng.undo(), true); assert.equal(w.last('score'), 1);
  assert.equal(w.rafQueue.length, 1, 'undo juga meluncur');
  w.frame(400);
  assert.equal(w.eng.restartLevel(), true); assert.equal(w.last('score'), 0);
  assert.equal(w.rafQueue.length, 0, 'ulang level langsung (tanpa luncuran)');
});
