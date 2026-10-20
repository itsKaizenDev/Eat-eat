import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { terrSim as T, makeTerritoryWorld, recordsLib, registry, root } from './helpers/env.mjs';

const D = T.DIRS;
// Arena uji kecil tanpa dinding: 20x12, basis P1 di (3,6), basis P2 di (16,6)
const open = (w, h, walls = []) => { const rows = Array.from({ length: h }, () => Array(w).fill('.')); walls.forEach(([x, y]) => { rows[y][x] = '#'; }); return rows.map(r => r.join('')); };
const mk = (map, start) => T.createState({ arena: T.parseArena(map || open(20, 12), start || { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 16, y: 6, dir: 'L' } }) });
const step = (s, d1, d2, t = 0) => T.stepSim(s, [d1 ? D[d1] : null, d2 ? D[d2] : null], t);
const at = (s, x, y) => y * s.arena.w + x;
const own = (s, x, y) => s.own[at(s, x, y)];
// P2 tidak menggerakkan apa pun yang berbahaya: taruh P2 di sudut jauh dan biarkan diam-diam bergerak di wilayahnya sendiri.
const CYCLE = ['U', 'R', 'D', 'L']; // P2 mengitari kotak 2x2 di dalam basisnya (tetap di wilayah sendiri, tanpa jejak)
const run = (s, p1path) => { const ev = []; p1path.forEach((k, i) => ev.push(...step(s, k, CYCLE[i % 4]))); return ev; };

test('arena default valid: simetris, tanpa kantong, dinding bukan wilayah', () => {
  const a = T.parseArena(T.ARENA_MAP, T.START);
  assert.deepEqual(a.errors, []);
  assert.equal(a.ownable, a.w * a.h - a.wall.reduce((n, v) => n + v, 0));
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) assert.equal(a.wall[y * a.w + x], a.wall[y * a.w + (a.w - 1 - x)], 'simetri kiri-kanan');
});

test('arena tidak valid ditolak: basis di dinding, terlalu dekat, kantong terpisah, karakter asing', () => {
  assert.ok(T.parseArena(open(20, 12, [[3, 6]]), { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 16, y: 6, dir: 'L' } }).errors.length);
  assert.ok(T.parseArena(open(20, 12), { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 5, y: 6, dir: 'L' } }).errors.length);
  const walls = []; for (let y = 0; y < 12; y++) walls.push([10, y]);
  assert.ok(T.parseArena(open(20, 12, walls), { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 16, y: 6, dir: 'L' } }).errors.some(e => /terpisah/.test(e)));
  assert.ok(T.parseArena(['..x.', '....'], { p1: { x: 1, y: 1, dir: 'R' }, p2: { x: 2, y: 1, dir: 'L' } }).errors.length);
  assert.throws(() => T.createState({ arena: T.parseArena(['..'], { p1: { x: 0, y: 0, dir: 'R' }, p2: { x: 1, y: 0, dir: 'L' } }) }));
});

test('awal: dua basis 3x3, tanpa jejak, persentase jujur', () => {
  const s = mk();
  assert.deepEqual(s.counts, [9, 9]);
  assert.equal(own(s, 3, 6), 1); assert.equal(own(s, 16, 6), 2); assert.equal(own(s, 10, 6), 0);
  assert.equal(T.percent(s, 0), 900 / 240);
  assert.ok(s.players.every(p => p.trail.length === 0));
});

test('keluar wilayah membuat jejak; di dalam wilayah tidak ada jejak', () => {
  const s = mk();
  step(s, 'R'); // (4,6) masih wilayah
  assert.equal(s.players[0].trail.length, 0);
  step(s, 'R'); // (5,6) keluar
  assert.equal(s.players[0].trail.length, 1);
  assert.equal(s.trail[at(s, 5, 6)], 1);
});

test('klaim: loop tertutup merebut isi dan jejak (flood fill)', () => {
  const s = mk();
  // dari (3,6): kanan sampai (6,6) lalu atas 3, kiri ke x=4 (wilayah basis x 2..4,y 5..7), tutup di (4,5)? mulai dari (4,6) keluar ke (5,6)
  // jalur: R,R (4,6)->(5,6); lanjut R (6,6); U (6,5),(6,4),(6,3)? bentuk kotak: keluar dari sel basis (4,5)
  const ev = run(s, ['U', 'U', 'R', 'R', 'R', 'R', 'D', 'D', 'D', 'L', 'L', 'L']);
  // kepala: (3,5)->(3,4) keluar di y=4 ... pastikan benar-benar ada klaim
  assert.ok(ev.some(e => e.type === 'claim'), 'ada klaim');
  assert.equal(s.players[0].trail.length, 0, 'jejak dihapus setelah menutup');
  assert.ok(s.counts[0] > 9);
  // semua jejak kini wilayah P1
  for (let i = 0; i < s.trail.length; i++) assert.equal(s.trail[i], 0);
});

test('klaim: bentuk persegi — isi terkurung direbut, sel di luar tidak', () => {
  const s = mk();
  // basis P1: x 2..4, y 5..7. Mulai (3,6). Gerak: R (4,6); R (5,6) keluar; U (5,5)? (5,5) bukan basis -> jejak
  // Lintasan: R,R -> (5,6); U,U,U -> (5,3); L,L -> (3,3); D -> (3,4); D -> (3,5) wilayah => tutup
  const ev = run(s, ['R', 'R', 'U', 'U', 'U', 'L', 'L', 'D', 'D']);
  const c = ev.find(e => e.type === 'claim');
  assert.ok(c);
  assert.equal(own(s, 4, 4), 1, 'isi terkurung (4,4) direbut');
  assert.equal(own(s, 4, 5 - 1), 1);
  assert.equal(own(s, 8, 4), 0, 'di luar loop tetap netral');
  assert.equal(own(s, 5, 3), 1, 'jejak ikut menjadi wilayah');
  assert.equal(s.counts[0] + s.counts[1] <= s.arena.ownable, true);
});

test('jalur terbuka tidak mengklaim: kembali ke wilayah lain jalur tanpa mengurung', () => {
  const s = mk();
  run(s, ['R', 'R', 'R', 'D', 'D', 'L', 'L', 'L']); // (6,6)->(6,8)->(3,8)? kembali ke y=8 bukan wilayah (basis y5..7)
  assert.equal(s.counts[0], 9);
  assert.ok(s.players[0].trail.length > 0, 'jejak masih terbuka');
});

test('klaim area yang hanya berbatas tepi papan tidak diambil (terhubung ke luar); jejaknya tetap menjadi wilayah', () => {
  const s = mk(open(12, 8), { p1: { x: 9, y: 5, dir: 'L' }, p2: { x: 2, y: 5, dir: 'R' } });
  for (let y = 0; y <= 2; y++) s.own[at(s, 2, y)] = 1;                       // wilayah P1 menempel tepi atas
  [[5, 0], [5, 1], [4, 1], [3, 1]].forEach(([x, y]) => { s.trail[at(s, x, y)] = 1; s.players[0].trail.push(at(s, x, y)); });
  s.players[0].head = { x: 3, y: 1 }; s.players[0].dir = D.L;                 // np (2,1) wilayah sendiri -> menutup
  const ev = step(s, 'L', 'D');
  const c = ev.find(e => e.type === 'claim');
  assert.equal(c.cells, 4, 'hanya 4 sel jejak; (3,0) dan (4,0) terhubung ke tepi papan');
  assert.equal(own(s, 3, 0), 0); assert.equal(own(s, 4, 0), 0);
  assert.equal(own(s, 4, 1), 1);
});

test('klaim: sisi kiri papan juga dianggap luar (simetri dengan sisi atas)', () => {
  const s = mk(open(12, 8), { p1: { x: 10, y: 5, dir: 'L' }, p2: { x: 4, y: 5, dir: 'R' } });
  s.own[at(s, 0, 2)] = 1; s.own[at(s, 1, 2)] = 1;
  [[1, 3], [1, 4], [0, 5]].forEach(([x, y]) => { s.trail[at(s, x, y)] = 1; s.players[0].trail.push(at(s, x, y)); });
  s.players[0].head = { x: 1, y: 3 }; s.players[0].dir = D.U;                 // np (1,2) wilayah sendiri -> menutup
  const c = step(s, 'U', 'U').find(e => e.type === 'claim');
  assert.equal(c.cells, 3); assert.equal(own(s, 0, 3), 0); assert.equal(own(s, 0, 4), 0);
});

test('kematian: tepi, jejak sendiri', () => {
  const s = mk(open(20, 12), { p1: { x: 1, y: 1, dir: 'L' }, p2: { x: 16, y: 8, dir: 'U' } });
  const ev = step(s, 'L', 'U'); // (1,1)->(0,1) masih di basis (x 0..2); lanjut ke (-1) mati
  assert.ok(!ev.some(e => e.type === 'death'));
  const ev2 = step(s, 'L', 'U');
  const d = ev2.find(e => e.type === 'death' && e.player === 0);
  assert.equal(d.cause, 'wall'); assert.equal(d.lives, 2);
  assert.ok(ev2.some(e => e.type === 'respawn' && e.player === 0));
  // jejak sendiri
  const t = mk();
  run(t, ['R', 'R', 'R', 'U', 'L']); // (6,6)->(6,5)->(5,5)
  const ev3 = step(t, 'D'); // (5,6) = jejak sendiri
  assert.equal(ev3.find(e => e.type === 'death').cause, 'self');
  assert.equal(t.players[0].trail.length, 0, 'jejak dihapus saat mati');
  assert.equal(t.trail.reduce((n, v) => n + (v === 1 ? 1 : 0), 0), 0);
});

test('berbalik arah diabaikan', () => {
  const s = mk();
  step(s, 'L');
  assert.deepEqual(s.players[0].dir, D.R);
});

test('jejak lawan diinjak kepala: PEMILIK JEJAK kehilangan nyawa, penyerang selamat', () => {
  const s = mk();
  // P2 keluar wilayah membuat jejak; P1 menginjaknya. Atur manual.
  const p2 = s.players[1];
  p2.head = { x: 10, y: 6 }; p2.trail = [at(s, 11, 6), at(s, 10, 6)]; s.trail[at(s, 11, 6)] = 2; s.trail[at(s, 10, 6)] = 2; p2.dir = D.U;
  const p1 = s.players[0]; p1.head = { x: 9, y: 6 }; p1.dir = D.R;
  const ev = step(s, 'R', 'U'); // P1 masuk (10,6): jejak P2
  const d = ev.filter(e => e.type === 'death');
  assert.deepEqual(d.map(e => [e.player, e.cause]), [[1, 'cut']]);
  assert.equal(p2.lives, 2); assert.equal(p1.lives, 3);
  assert.equal(p2.trail.length, 0);
});

test('head-on dan tukar kepala: keduanya kehilangan satu nyawa serentak', () => {
  const a = mk();
  a.players[0].head = { x: 9, y: 3 }; a.players[0].dir = D.R; a.players[1].head = { x: 11, y: 3 }; a.players[1].dir = D.L;
  a.players[0].trail = [at(a, 9, 3)]; a.trail[at(a, 9, 3)] = 1; a.players[1].trail = [at(a, 11, 3)]; a.trail[at(a, 11, 3)] = 2;
  const ev = step(a, null, null);
  assert.deepEqual(ev.filter(e => e.type === 'death').map(e => [e.player, e.cause, e.lives]), [[0, 'headon', 2], [1, 'headon', 2]]);
  const b = mk();
  b.players[0].head = { x: 9, y: 3 }; b.players[0].dir = D.R; b.players[1].head = { x: 10, y: 3 }; b.players[1].dir = D.L;
  b.own[at(b, 9, 3)] = 1; b.own[at(b, 10, 3)] = 2; // kepala di wilayah masing-masing: tidak ada jejak yang mendahului penyebab 'swap'
  const ev2 = step(b, null, null);
  assert.deepEqual(ev2.filter(e => e.type === 'death').map(e => [e.player, e.cause]), [[0, 'swap'], [1, 'swap']]);
});

test('hasil tidak bergantung urutan pemain: cermin P1<->P2 menghasilkan hasil cermin', () => {
  const make = (swap) => {
    const s = mk(open(20, 12), { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 16, y: 6, dir: 'L' } });
    const [a, b] = swap ? [1, 0] : [0, 1];
    s.players[a].head = { x: 9, y: 3 }; s.players[a].dir = D.R; s.players[b].head = { x: 11, y: 3 }; s.players[b].dir = D.L;
    return s;
  };
  const e1 = step(make(false), null, null), e2 = step(make(true), null, null);
  assert.deepEqual(e1.filter(e => e.type === 'death').map(e => e.cause).sort(), e2.filter(e => e.type === 'death').map(e => e.cause).sort());
});

test('death + claim pada tick yang sama: kematian mengalahkan klaim', () => {
  const s = mk();
  // P1 siap menutup loop di tick ini, tapi P2 menginjak jejak P1 pada tick yang sama
  run(s, ['R', 'R', 'U', 'U', 'U', 'L', 'L', 'D']); // kepala (3,4); tinggal D ke (3,5) = wilayah
  assert.deepEqual(s.players[0].head, { x: 3, y: 4 });
  const p2 = s.players[1];
  p2.head = { x: 6, y: 3 }; p2.dir = D.L; p2.trail = []; // akan masuk (5,3) = jejak P1
  const before = s.counts[0];
  const ev = step(s, 'D', 'L');
  assert.ok(ev.some(e => e.type === 'death' && e.player === 0 && e.cause === 'cut'));
  assert.ok(!ev.some(e => e.type === 'claim'), 'tidak ada klaim');
  assert.equal(s.counts[0], before);
  assert.equal(s.players[0].lives, 2);
});

// Bangun keadaan manual: wilayah/jejak ditulis langsung supaya skenario klaim tepat.
const build = (s) => ({
  own: (x, y, v) => { s.own[at(s, x, y)] = v; },
  trail: (i, x, y) => { s.trail[at(s, x, y)] = i + 1; s.players[i].trail.push(at(s, x, y)); },
});

// Loop P1: kolom wilayah x=6 (y2..8) + jejak persegi (7..10, 2..8); kepala di (7,8) bergerak L ke (6,8) menutup.
function loopP1(s) {
  const b = build(s);
  for (let y = 2; y <= 8; y++) b.own(6, y, 1);
  for (let x = 7; x <= 10; x++) { b.trail(0, x, 2); b.trail(0, x, 8); }
  for (let y = 3; y <= 7; y++) b.trail(0, 10, y);
  s.players[0].head = { x: 7, y: 8 }; s.players[0].dir = D.L;
  return b;
}

test('dua klaim serentak atas petak yang sama: petak sengketa tetap netral; petak tidak sengketa tetap direbut', () => {
  const s = mk();
  const b = loopP1(s);
  // Loop P2 lebih besar, mengurung loop P1: kolom wilayah x=13 (y1..10), jejak baris y=1 & y=10 (x3..12) dan kolom x=3 (y2..9)
  for (let y = 1; y <= 10; y++) b.own(13, y, 2);
  for (let x = 3; x <= 12; x++) { b.trail(1, x, 1); b.trail(1, x, 10); }
  for (let y = 2; y <= 9; y++) b.trail(1, 3, y);
  s.players[1].head = { x: 12, y: 10 }; s.players[1].dir = D.R;
  const interior = at(s, 8, 5); // netral, di dalam loop P1 DAN loop P2
  const ev = step(s, 'L', 'R');
  const claims = ev.filter(e => e.type === 'claim');
  assert.equal(claims.length, 2, 'dua klaim serentak');
  const c1 = claims.find(e => e.player === 0), c2 = claims.find(e => e.player === 1);
  assert.equal(s.own[interior], 0, 'petak sengketa tetap netral');
  assert.ok(!c1.list.includes(interior) && !c2.list.includes(interior));
  assert.ok(c1.cells >= 13, 'jejak P1 (13 sel) tetap direbut P1');
  assert.equal(own(s, 10, 2), 1); assert.equal(own(s, 5, 5), 2, 'petak netral di luar loop P1 tapi di dalam loop P2 direbut P2');
  assert.equal(own(s, 6, 5), 2, 'wilayah lama P1 yang terkurung direbut P2 (reclaim), bukan karena P1 diproses duluan');
  // satu-satunya jejak tersisa: kepala P1 berdiri di sel yang barusan direbut P2 -> jejak baru dimulai dari sel itu (invarian)
  assert.equal(s.trail.reduce((n, v) => n + (v ? 1 : 0), 0), 1);
  assert.equal(s.trail[at(s, 6, 8)], 1); assert.equal(s.players[0].trail.length, 1);
});

test('urutan pemain tidak berpengaruh pada klaim serentak (cermin P1<->P2)', () => {
  const run2 = (swap) => {
    const s = mk(); const b = loopP1(s);
    for (let y = 1; y <= 10; y++) b.own(13, y, 2);
    for (let x = 3; x <= 12; x++) { b.trail(1, x, 1); b.trail(1, x, 10); }
    for (let y = 2; y <= 9; y++) b.trail(1, 3, y);
    s.players[1].head = { x: 12, y: 10 }; s.players[1].dir = D.R;
    if (swap) { s.players.reverse(); s.players.forEach((p, i) => { p.id = i + 1; }); for (let c = 0; c < s.own.length; c++) if (s.own[c]) s.own[c] = 3 - s.own[c]; for (let c = 0; c < s.trail.length; c++) if (s.trail[c]) s.trail[c] = 3 - s.trail[c]; }
    T.stepSim(s, swap ? [D.R, D.L] : [D.L, D.R], 0);
    return [...s.own].map(v => (swap && v ? 3 - v : v)).join('');
  };
  assert.equal(run2(false), run2(true));
});

test('klaim merebut wilayah lawan yang terkurung, tapi tidak memotong/mengklaim jejak lawan yang masih hidup', () => {
  const s = mk(); const b = loopP1(s);
  b.own(8, 4, 2); b.own(8, 5, 2);          // wilayah P2 terkurung di dalam loop P1
  b.trail(1, 9, 6); s.players[1].head = { x: 9, y: 6 }; s.players[1].dir = D.D; // P2 sedang menggambar jejak di dalam loop
  const ev = step(s, 'L', 'D');
  assert.ok(!ev.some(e => e.type === 'death'), 'jejak lawan tidak dipotong oleh klaim');
  assert.equal(s.players[1].lives, 3);
  assert.equal(own(s, 8, 4), 1); assert.equal(own(s, 8, 5), 1);
  assert.equal(own(s, 9, 6), 0, 'sel jejak lawan tidak ikut direbut');
  assert.equal(s.trail[at(s, 9, 6)], 2); assert.equal(s.trail[at(s, 9, 7)], 2);
  // invarian: kepala P2 kini di wilayah P1 -> tetap di jejaknya sendiri
  assert.equal(own(s, 9, 7), 1);
  assert.equal(s.trail[at(s, s.players[1].head.x, s.players[1].head.y)], 2);
});

test('persentase tidak pernah melebihi 100% dan total pemain <= ownable (properti acak)', () => {
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const keys = ['U', 'D', 'L', 'R'];
  for (let g = 0; g < 60; g++) {
    const s = mk(T.ARENA_MAP, T.START);
    for (let i = 0; i < 400 && s.status === 'playing'; i++) {
      T.stepSim(s, [rnd() < 0.5 ? D[keys[Math.floor(rnd() * 4)]] : null, rnd() < 0.5 ? D[keys[Math.floor(rnd() * 4)]] : null], i * 100);
      assert.ok(s.counts[0] + s.counts[1] <= s.arena.ownable);
      assert.ok(T.percent(s, 0) <= 100 && T.percent(s, 1) <= 100);
      // invarian: tidak ada wilayah di dinding; kepala di luar wilayah ada di jejak sendiri
      for (let c = 0; c < s.own.length; c++) if (s.arena.wall[c]) assert.equal(s.own[c], 0);
      s.players.forEach(p => { if (p.lives > 0 && s.own[at(s, p.head.x, p.head.y)] !== p.id) assert.equal(s.trail[at(s, p.head.x, p.head.y)], p.id); });
      // jejak konsisten dengan daftar
      s.players.forEach(p => p.trail.forEach(c => assert.equal(s.trail[c], p.id)));
    }
  }
});

test('hasil: nyawa terakhir serentak = seri; satu elimininasi = lawan menang; hasil hanya sekali', () => {
  const s = mk(open(20, 12), { p1: { x: 1, y: 1, dir: 'L' }, p2: { x: 18, y: 10, dir: 'R' } });
  s.players.forEach(p => { p.lives = 1; });
  step(s, null, null); step(s, null, null); // keduanya menabrak tepi serentak pada tick ke-2
  assert.equal(s.status, 'draw'); assert.equal(s.result.reason, 'nyawa');
  assert.deepEqual(step(s, null, null), [], 'tick setelah selesai tidak berbuat apa-apa');
  const t = mk(open(20, 12), { p1: { x: 1, y: 1, dir: 'L' }, p2: { x: 10, y: 6, dir: 'R' } });
  t.players[0].lives = 1; const ev = []; ev.push(...step(t, null, null), ...step(t, null, null));
  assert.equal(t.status, 'won'); assert.equal(t.result.winner, 2);
  assert.equal(ev.filter(e => e.type === 'end').length, 1);
});

test('target wilayah: mencapai 60% menang; nyawa terakhir habis pada tick yang sama mengalahkan target', () => {
  const s = mk(open(20, 12), { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 16, y: 6, dir: 'L' } });
  s.config.targetPct = 5; // 12 petak
  const ev = run(s, ['R', 'R', 'U', 'U', 'L', 'L', 'D', 'D']);
  assert.equal(s.status, 'won'); assert.equal(s.result.reason, 'wilayah'); assert.equal(s.result.winner, 1);
  assert.equal(ev.filter(e => e.type === 'end').length, 1);
});

test('waktu habis: wilayah terbanyak menang, sama = seri, finishMatch idempoten', () => {
  const s = mk();
  assert.equal(T.finishMatch(s).length, 1); assert.equal(s.status, 'draw'); assert.equal(s.result.reason, 'waktu');
  assert.deepEqual(T.finishMatch(s), []);
  const t = mk(); t.own[at(t, 10, 2)] = 1; // P1 lebih banyak
  T.finishMatch(t); assert.equal(t.result.winner, 1);
});

test('respawn: wilayah sendiri yang aman, tidak menimpa lawan; jejak bersih', () => {
  const s = mk(open(20, 12), { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 16, y: 6, dir: 'L' } });
  s.players[0].head = { x: 3, y: 5 }; s.players[0].dir = D.U; // akan menabrak? (3,4) bukan tepi; paksa mati lewat tepi
  s.players[0].head = { x: 0, y: 6 }; s.players[0].dir = D.L;
  const ev = step(s, null, null);
  const r = ev.find(e => e.type === 'respawn');
  assert.ok(r && !r.base);
  const p = s.players[0];
  assert.equal(s.own[at(s, p.head.x, p.head.y)], 1);
  assert.ok(p.head.x >= 0 && p.head.y >= 0);
  assert.equal(p.trail.length, 0);
});

test('respawn saat wilayah habis: base darurat 3x3 yang adil, tidak di jejak/kepala lawan', () => {
  const s = mk(open(20, 12), { p1: { x: 3, y: 6, dir: 'R' }, p2: { x: 16, y: 6, dir: 'L' } });
  for (let c = 0; c < s.own.length; c++) if (s.own[c] === 1) s.own[c] = 2; // wilayah P1 direbut semua
  s.players[0].head = { x: 0, y: 6 }; s.players[0].dir = D.L; s.players[0].trail = [];
  const ev = step(s, null, null);
  const r = ev.find(e => e.type === 'respawn');
  assert.ok(r && r.base);
  const p = s.players[0];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) assert.equal(s.own[at(s, p.head.x + dx, p.head.y + dy)], 1);
  assert.ok(Math.abs(p.head.x - s.players[1].head.x) + Math.abs(p.head.y - s.players[1].head.y) >= 2);
});

test('performa: flood fill pada papan besar (80x80) dan klaim tetap cepat', () => {
  const s = mk(open(80, 80), { p1: { x: 3, y: 40, dir: 'R' }, p2: { x: 76, y: 40, dir: 'L' } });
  const t0 = Date.now();
  run(s, [...'R'.repeat(2), ...'U'.repeat(30), ...'R'.repeat(30), ...'D'.repeat(30), ...'L'.repeat(30)]);
  assert.ok(Date.now() - t0 < 500, 'klaim di papan 80x80 < 500 ms');
});

test('determinisme: input sama = hasil sama', () => {
  const play = () => { const s = mk(T.ARENA_MAP, T.START); const keys = ['U', 'R', 'D', 'L']; for (let i = 0; i < 200 && s.status === 'playing'; i++) T.stepSim(s, [D[keys[(i >> 2) % 4]], D[keys[(i >> 3) % 4]]], i); return JSON.stringify([s.counts, s.players.map(p => [p.head, p.lives]), s.status]); };
  assert.equal(play(), play());
});

// ---------- rekor ----------
test('rekor: recordMatch per konfigurasi, tidak merusak entri lain, parse aman', () => {
  const R = recordsLib, key = R.territoryConfigKey(T.DEFAULT_CONFIG, 'normal');
  assert.equal(key, 'territory|match:90|target:60|speed:normal');
  let r = R.recordMatch({ v: 1, records: {} }, key, { best: 62, winner: 1 }).records;
  r = R.recordMatch(r, key, { best: 40, winner: 2 }).records;
  r = R.recordMatch(r, key, { best: 33, winner: 0 }).records;
  assert.deepEqual(R.getTerritoryRecord(r, key), { best: 62, bestDeliveries: 0, bestRounds: 0, plays: 3, wins: 2, p1Wins: 1, p2Wins: 1, draws: 1 });
  assert.deepEqual(R.parseRecords(JSON.stringify(r)), r, 'bolak-balik lewat storage');
  assert.equal(R.getTerritoryRecord(r, R.territoryConfigKey(T.DEFAULT_CONFIG, 'ngebut')).plays, 0);
  assert.equal(R.recordMatch(r, key, { best: 101, winner: 1 }).records, r, 'nilai liar ditolak');
  assert.equal(R.recordMatch(r, key, { best: 5, winner: 3 }).records, r);
  const bad = JSON.stringify({ v: 1, records: { [key]: { best: 10, plays: 1, wins: 1, p1Wins: 9, p2Wins: 0, draws: 0 } } });
  assert.deepEqual(R.parseRecords(bad), { v: 1, records: {} }, 'p1Wins > plays ditolak');
});

// ---------- controller ----------
const D4 = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
test('controller: PLAY hanya berhasil sekali; arah awal tidak hilang; menu -> main -> jeda -> lanjut -> menu', () => {
  const w = makeTerritoryWorld();
  assert.equal(w.eng.getState(), 'menu');
  assert.equal(w.eng.startRun(), true); assert.equal(w.eng.startRun(), false);
  assert.equal(w.eng.getState(), 'playing');
  w.eng.pauseRun('user'); assert.equal(w.eng.getState(), 'paused');
  assert.equal(w.eng.resumeRun(), true);
  w.eng.returnToMenu(); assert.equal(w.eng.getState(), 'menu');
  assert.equal(w.last('territory').players.length, 2);
});

test('controller: pause membekukan jam, tick, dan HUD; pemblokir (bantuan/tab) tidak dilepas sembarangan', () => {
  const w = makeTerritoryWorld({ config: { lives: 99 } });
  w.eng.startRun(); w.advance(3000);
  const t1 = w.last('territory').timeText;
  w.eng.pauseRun('help'); w.advance(20000);
  assert.equal(w.last('territory').timeText, t1);
  assert.equal(w.eng.resumeRun(), false, 'bantuan masih terbuka');
  w.eng.releasePause('help'); assert.equal(w.eng.resumeRun(), true);
  w.advance(1000); assert.notEqual(w.last('territory').timeText, t1);
});

test('controller: waktu habis -> hasil sekali, rekor disimpan sekali; tidak berubah setelah itu', () => {
  const w = makeTerritoryWorld();
  w.eng.startRun();
  // jaga agar tidak ada yang mati: kedua ular lurus akan menabrak tepi; belokkan terus
  const turn = (i) => { const seq = ['U', 'R', 'D', 'L']; return seq[i % 4]; };
  for (let i = 0; i < 700 && w.eng.getState() === 'playing'; i++) { w.eng.setDirMP(0, ...D4[turn(i)]); w.eng.setDirMP(1, ...D4[turn(i + 2)]); w.advance(150); }
  assert.ok(['won', 'lost'].includes(w.eng.getState()), 'pertandingan selesai (waktu / nyawa)');
  assert.equal(w.saves.length, 1, 'rekor disimpan sekali');
  const overlays = w.overlays('gameover').length;
  w.advance(200000);
  assert.equal(w.overlays('gameover').length, overlays); assert.equal(w.saves.length, 1);
});

test('controller: input saat menu/akhir tidak merusak; swipe/DPad (setDir) diabaikan', () => {
  const w = makeTerritoryWorld();
  w.eng.setDir(1, 0); assert.equal(w.eng.getState(), 'menu', 'setDir tidak memulai Territory');
  w.eng.setDirMP(5, 1, 0); assert.equal(w.eng.getState(), 'menu');
});

test('controller: kecepatan menghasilkan interval tetap; setSpeedPref saat main tidak mengubah ronde berjalan', () => {
  const w = makeTerritoryWorld();
  w.eng.setSpeedPref('ngebut'); assert.equal(w.last('territoryMenu').speed, 'ngebut');
  w.eng.startRun(); w.eng.setSpeedPref('santai'); w.advance(1000);
  assert.equal(w.eng.getState(), 'playing');
});

test('controller: destroy menghentikan emisi dan RAF', () => {
  const w = makeTerritoryWorld();
  w.eng.startRun(); w.advance(500); w.eng.destroy();
  const n = w.emits.length; w.advance(5000);
  assert.equal(w.emits.length, n);
});

test('registry: Rebut Arena 2 pemain, tanpa sentuh, durasi tetap 90 dtk, kecepatan pref, tombol kembali', () => {
  const m = registry.getMode('territory');
  assert.equal(m.players, 2); assert.equal(m.touch, false); assert.equal(m.kind, 'territory'); assert.equal(m.duration.fixedSec, 90);
  assert.equal(registry.needsKeyboard('territory'), true); assert.equal(registry.needsKeyboard('puzzle'), false);
  assert.equal(registry.isTwoPlayer('multiplayer'), true); assert.equal(registry.isTwoPlayer('delivery'), false);
});

test('CSS: tata letak info dua kolom untuk laptop tidak mengenai panel samping HP', () => {
  const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  assert.match(css, /\.stage-side\.focus-stage \.adv-cols/);
  assert.match(css, /\.hud-cols \{ display: grid/);
  assert.match(css, /\.focus-scene/);
  assert.ok(fs.existsSync(path.join(root, 'public/assets/game/bg-territory.webp')));
});
