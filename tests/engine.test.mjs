import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, food } from './helpers/env.mjs';

// ---- P0: tidak ada langkah/efek/suara setelah ronde berakhir ----
test('P0: efek yang habis SETELAH game over tidak menghidupkan tick lagi', () => {
  const w = makeWorld('mayhem', { speed: 'normal' });
  w.eng.startRun();
  w.x.triggerEffect('fast');
  w.advance(2500); // menabrak tembok kanan
  assert.equal(w.eng.getState(), 'lost');
  const death = w.calls.death, over = w.overlays('gameover').length, head = JSON.stringify(w.x.snake[0]);
  w.advance(8000);
  assert.equal(w.calls.death, death, 'suara kematian tidak berulang');
  assert.equal(w.overlays('gameover').length, over, 'overlay game over tidak diemit ulang');
  assert.equal(JSON.stringify(w.x.snake[0]), head, 'ular tidak bergerak');
});

test('P0: spawnFood di papan penuh mengembalikan null (tidak hang)', () => {
  const w = makeWorld('classic');
  w.eng.startRun();
  const all = []; for (let y = 0; y < 15; y++) for (let x = 0; x < 17; x++) all.push({ x, y });
  w.x.snake = all; w.x.foods = [];
  assert.equal(w.x.spawnFood('random'), null);
  assert.equal(w.x.addFood('random'), null);
});

test('P0: kematian serentak 2P (nyawa terakhir) menghasilkan SATU hasil: Seri', () => {
  const w = makeWorld('multiplayer');
  w.eng.startRun();
  const [a, b] = w.x.players;
  a.lives = 1; b.lives = 1;
  a.snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }]; a.dir = { x: 1, y: 0 };
  b.snake = [{ x: 10, y: 7 }, { x: 11, y: 7 }, { x: 12, y: 7 }]; b.dir = { x: -1, y: 0 };
  w.x.foods = [];
  const mark = w.emits.length;
  w.x.tickMultiplayer();
  const ends = w.emits.slice(mark).filter(e => e.overlay && e.overlay.phase === 'gameover');
  assert.equal(ends.length, 1);
  assert.equal(ends[0].overlay.title, 'Seri!');
  assert.equal(w.calls.death, 1, 'suara kematian sekali per tick');
});

test('P0: dua pemain tembus 50 di tick yang sama -> skor lebih tinggi menang, sama = seri; hasil sekali', () => {
  // [skor awal P1, skor awal P2, apel P1, apel P2, judul yang diharapkan]
  const cases = [[49, 49, 'normal', 'normal', 'Seri!'], [49, 49, 'big', 'normal', 'P1 (Panah) Menang!'], [49, 48, 'normal', 'big', 'P2 (WASD) Menang!']];
  for (const [s1, s2, k1, k2, title] of cases) {
    const w = makeWorld('multiplayer');
    w.eng.startRun();
    const [a, b] = w.x.players;
    a.score = s1; b.score = s2;
    a.snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }]; a.dir = { x: 1, y: 0 };
    b.snake = [{ x: 3, y: 9 }, { x: 2, y: 9 }, { x: 1, y: 9 }]; b.dir = { x: 1, y: 0 };
    w.x.foods = [food(4, 3, k1), food(4, 9, k2)];
    const mark = w.emits.length;
    w.x.tickMultiplayer();
    const ends = w.emits.slice(mark).filter(e => e.overlay && e.overlay.phase === 'gameover');
    assert.equal(ends.length, 1, 'hasil di-emit sekali');
    assert.equal(ends[0].overlay.title, title);
  }
});

// ---- P1: pause, resume, input, aturan ----
test('P1: pause membekukan efek, makanan, ranjau, dan jam simulasi', () => {
  const w = makeWorld('mayhem');
  w.eng.startRun();
  w.x.triggerEffect('fast');
  w.x.foods = [Object.assign(food(0, 0), { expiresAt: w.x.simNow + 2000 })];
  w.x.bombTiles.push({ x: 1, y: 1, hits: 0, expiresAt: w.x.simNow + 2000 });
  w.advance(300); w.eng.pauseRun('user');
  const sim = w.x.simNow;
  w.advance(10000);
  assert.equal(w.x.simNow, sim, 'jam simulasi membeku');
  assert.equal(w.x.activeEffects.length, 1);
  assert.equal(w.x.bombTiles.length, 1);
  assert.equal(w.x.foods[0].expiring, 0);
  assert.equal(w.eng.resumeRun(), true);
  w.advance(100);
  assert.equal(w.x.activeEffects.length, 1, 'efek belum habis setelah resume');
});

test('P1: Time Attack — resume lewat arah atau tombol memberi sisa waktu yang sama', () => {
  for (const via of ['setDir', 'resume']) {
    const w = makeWorld('timeattack', { speed: 'santai' });
    w.eng.setTaDuration(30); w.eng.startRun();
    w.advance(1000); w.eng.pauseRun('user');
    w.advance(10000);
    if (via === 'setDir') w.eng.setDir(0, -1); else w.eng.resumeRun();
    w.advance(40);
    assert.equal(w.last('timerText'), '0:29', 'via ' + via);
  }
});

test('P1: Time Attack berakhir tepat sekali di batas waktu', () => {
  const w = makeWorld('timeattack', { speed: 'santai' });
  w.eng.setTaDuration(30); w.eng.startRun();
  // jaga ular tetap hidup: lingkari arena
  let guard = 0;
  while (w.eng.getState() === 'playing' && guard++ < 4000) {
    const h = w.x.snake[0], d = w.x.dir;
    if (d.x === 1 && h.x >= 15) w.eng.setDir(0, 1);
    else if (d.y === 1 && h.y >= 13) w.eng.setDir(-1, 0);
    else if (d.x === -1 && h.x <= 1) w.eng.setDir(0, -1);
    else if (d.y === -1 && h.y <= 1) w.eng.setDir(1, 0);
    w.advance(16);
  }
  assert.equal(w.eng.getState(), 'won');
  assert.equal(w.overlays('gameover').length, 1);
  assert.equal(w.last('timerText'), '0:00');
});

test('P1: arah pertama dari kondisi berhenti tidak hilang', () => {
  const w = makeWorld('classic', { speed: 'santai' });
  w.eng.setDir(0, -1);
  assert.equal(w.eng.getState(), 'playing');
  w.advance(200);
  assert.deepEqual(w.x.snake[0], { x: 8, y: 6 });
});

test('P1: dua input cepat dalam satu langkah keduanya terpakai (antrean 2)', () => {
  const w = makeWorld('classic', { speed: 'santai' });
  w.eng.startRun(); w.x.foods = [];
  w.eng.setDir(0, -1); w.eng.setDir(-1, 0);
  w.advance(400);
  const h = w.x.snake[0];
  assert.ok(h.x < 8 && h.y < 7, 'belok atas lalu kiri: ' + JSON.stringify(h));
});

test('P1: masuk sel ekor yang akan lepas itu legal; masuk sel ekor saat tumbuh tetap mati', () => {
  const w = makeWorld('classic');
  w.eng.startRun(); w.x.foods = [];
  w.x.snake = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }];
  w.x.dir = { x: -1, y: 0 };
  w.eng.setDir(0, 1);
  w.x.tick();
  assert.equal(w.eng.getState(), 'playing');
  assert.deepEqual(w.x.snake[0], { x: 5, y: 6 });
  // tumbuh: apel di sel ekor -> mati
  const w2 = makeWorld('classic');
  w2.eng.startRun();
  w2.x.snake = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }];
  w2.x.dir = { x: -1, y: 0 };
  w2.x.foods = [food(5, 6)];
  w2.eng.setDir(0, 1);
  w2.x.tick();
  assert.equal(w2.eng.getState(), 'lost');
});

// Menahan ular di tengah arena supaya yang diuji murni dinamika arena (bukan ular yang menabrak tembok).
const holdCenter = (w) => { w.x.snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }]; w.x.dir = { x: 1, y: 0 }; };

test('shrink: arena menyempit 1 ubin demi 1 ubin (perlahan), bertahan 15 dtk, lalu melebar — di mode Mayhem biasa juga', () => {
  const w = makeWorld('mayhem', { seed: 5 });
  w.eng.startRun();
  w.x.triggerEffect('shrink');
  const t0 = w.t, first = {};
  let widenedAt = null, maxBorder = 0;
  for (let i = 0; i < 260; i++) {
    holdCenter(w); w.advance(100);
    const el = w.t - t0, b = w.x.borderInset;
    if (b > maxBorder) { maxBorder = b; first[b] = el; }
    if (maxBorder === 3 && b < 3 && widenedAt === null) widenedAt = el;
    assert.ok(b >= 0 && b <= 3);
    if (el > 100 && el < 1400) assert.equal(b, 0, 'belum langsung menyempit @' + el);
  }
  assert.ok(first[1] >= 1500 && first[1] <= 1700, 'ubin ke-1 @' + first[1]);
  assert.ok(first[2] >= 3000 && first[2] <= 3200, 'ubin ke-2 @' + first[2]);
  assert.ok(first[3] >= 4500 && first[3] <= 4700, 'ubin ke-3 @' + first[3]);
  assert.ok(widenedAt >= 4500 + 15000 && widenedAt <= 4500 + 15000 + 700, 'mulai melebar setelah 15 dtk bertahan @' + widenedAt);
  holdCenter(w); w.advance(1500);
  assert.equal(w.x.borderInset, 0, 'melebar kembali penuh');
});

test('shrink: tiap kali ubin menutup, makanan di luar arena dipindah ke dalam', () => {
  for (let s = 1; s <= 20; s++) {
    const w = makeWorld('mayhem', { seed: 100 + s });
    w.eng.startRun();
    w.x.foods = [food(0, 0), food(16, 14), food(0, 14), food(16, 0)];
    w.x.triggerEffect('shrink');
    for (let i = 0; i < 50; i++) { holdCenter(w); w.advance(100); }
    assert.equal(w.x.borderInset, 3);
    w.x.foods.forEach(f => assert.ok(f.x >= 3 && f.x <= 13 && f.y >= 3 && f.y <= 11, `seed ${s}: (${f.x},${f.y})`));
  }
});

test('shrink: HUD menampilkan lama bertahan (15 dtk), bukan animasi menyempit', () => {
  const w = makeWorld('mayhemplus', { seed: 2 });
  w.eng.startRun(); w.x.triggerEffect('shrink');
  const e = w.last('effects').find(x => x.type === 'shrink');
  assert.equal(e.t, '15s');
});

test('P1: spawn tidak menimpa tubuh, makanan, atau ranjau', () => {
  const w = makeWorld('mayhem');
  w.eng.startRun();
  w.x.plantBombs(8);
  for (let i = 0; i < 200; i++) {
    const f = w.x.spawnFood('random');
    assert.ok(f);
    assert.ok(!w.x.snake.some(s => s.x === f.x && s.y === f.y));
    assert.ok(!w.x.foods.some(o => o.x === f.x && o.y === f.y));
    assert.ok(!w.x.bombTiles.some(o => o.x === f.x && o.y === f.y));
    w.x.foods.push(f); if (w.x.foods.length > 40) w.x.foods.shift();
  }
});

test('P1: respawn 2P aman — tidak muncul di atas lawan/ranjau', () => {
  const w = makeWorld('multiplayer');
  w.eng.startRun();
  const [a, b] = w.x.players;
  // lawan memblokir jalur favorit P1 di baris 7
  b.snake = [{ x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
  b.dir = { x: 1, y: 0 };
  a.snake = []; a.respawnAt = w.x.simNow + 1; a.lives = 2;
  w.x.foods = [];
  w.advance(400);
  assert.equal(a.respawnAt, 0);
  assert.ok(a.snake.length === 3);
  a.snake.forEach(c => assert.ok(!b.snake.some(o => o.x === c.x && o.y === c.y), 'tidak tumpang tindih'));
});

test('P1: best rusak di storage menjadi 0, bukan NaN, dan rekor baru tersimpan saat ronde selesai', () => {
  const w = makeWorld('classic', { store: { snake_best: 'abc' } });
  assert.equal(w.last('best'), 0);
  w.eng.startRun(); w.x.foods = [food(9, 7)];
  w.x.tick();
  assert.equal(w.x.score, 1);
  assert.equal(w.store.snake_best, 'abc', 'tidak menulis storage tiap apel');
  w.advance(5000); // menabrak tembok -> ronde selesai -> tersimpan
  assert.equal(w.eng.getState(), 'lost');
  assert.equal(w.store.snake_best, '1');
});

// ---- lifecycle ----
test('lifecycle: startRun hanya berhasil sekali; PLAY terlambat tidak menjeda ronde', () => {
  const w = makeWorld('classic');
  assert.equal(w.eng.startRun(), true);
  assert.equal(w.eng.startRun(), false);
  w.eng.setDir(1, 0); // panah saat ronde sudah jalan
  assert.equal(w.eng.getState(), 'playing');
});

test('lifecycle: alasan pause — bantuan/tab menahan resume; melepas penghalang tidak melanjutkan', () => {
  const w = makeWorld('classic');
  w.eng.startRun();
  w.eng.pauseRun('help'); w.eng.pauseRun('hidden');
  assert.equal(w.eng.getState(), 'paused');
  assert.equal(w.eng.resumeRun(), false, 'masih ada penghalang');
  w.eng.setDir(0, -1);
  assert.equal(w.eng.getState(), 'paused', 'arah tidak melanjutkan saat ada penghalang');
  w.eng.releasePause('help');
  assert.equal(w.eng.getState(), 'paused');
  assert.equal(w.eng.resumeRun(), false, 'tab masih tersembunyi');
  w.eng.releasePause('hidden');
  assert.equal(w.eng.getState(), 'paused', 'tidak lanjut otomatis');
  assert.equal(w.eng.resumeRun(), true);
  assert.equal(w.eng.getState(), 'playing');
});

test('lifecycle: returnToMenu membersihkan ronde dan bisa dimulai lagi', () => {
  const w = makeWorld('classic');
  w.eng.startRun(); w.advance(300);
  const before = w.overlays('start').length;
  w.eng.returnToMenu();
  assert.equal(w.eng.getState(), 'menu');
  assert.equal(w.overlays('start').length, before + 1, 'returnToMenu mengumumkan menu sekali');
  assert.equal(w.x.score, 0);
  assert.equal(w.eng.startRun(), true);
});

test('lifecycle: pauseRun/resumeRun diabaikan di luar ronde aktif', () => {
  const w = makeWorld('classic');
  assert.equal(w.eng.pauseRun('user'), false);
  assert.equal(w.eng.resumeRun(), false);
  w.eng.startRun(); w.advance(5000); // game over
  assert.equal(w.eng.getState(), 'lost');
  assert.equal(w.eng.pauseRun('user'), false);
});

// ---- determinisme & performa HUD ----
test('determinisme: seed + input sama menghasilkan keadaan akhir sama', () => {
  const run = () => {
    const w = makeWorld('mayhemplus', { seed: 42, speed: 'ngebut' });
    w.eng.startRun();
    const keys = [[0, -1], [-1, 0], [0, 1], [1, 0]];
    for (let i = 0; i < 300; i++) { if (i % 9 === 0) w.eng.setDir(...keys[(i / 9) % 4]); w.advance(32); }
    return JSON.stringify({ s: w.x.snake, f: w.x.foods.map(f => [f.x, f.y, f.kind]), sc: w.x.score, st: w.eng.getState() });
  };
  assert.equal(run(), run());
});

test('HUD: timer Time Attack hanya di-emit saat teksnya berubah (bukan tiap frame)', () => {
  const w = makeWorld('timeattack', { speed: 'santai' });
  w.eng.setTaDuration(30); w.eng.startRun();
  const mark = w.emits.length;
  w.advance(1000);
  const timerEmits = w.emits.slice(mark).filter(e => 'timerText' in e && Object.keys(e).length === 1).length;
  assert.ok(timerEmits <= 2, 'emit timer-saja: ' + timerEmits);
});

test('interval langkah dan interpolasi memakai satu sumber (curInterval)', () => {
  const w = makeWorld('mayhem', { speed: 'ngebut' });
  w.eng.startRun(); w.x.triggerEffect('fast');
  assert.equal(w.x.curInterval, Math.max(35, 100 * 0.6));
  w.x.triggerEffect('slow'); // fast*slow = 1.02
  assert.equal(w.x.curInterval, Math.max(35, 100 * 0.6 * 1.7));
});

test('lifecycle: endRun idempoten — game over dipanggil dua kali tetap satu hasil, satu suara', () => {
  const w = makeWorld('classic');
  w.eng.startRun();
  w.x.gameOver(); w.x.gameOver('bomb');
  assert.equal(w.overlays('gameover').length, 1);
  assert.equal(w.calls.death, 1);
  assert.equal(w.eng.getState(), 'lost');
});
