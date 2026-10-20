// Tahap 9a: rintangan, power-up, penjaga (diam/patroli -> kejar -> pulang), semak, dan generator level 6..50.
import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle, generator, LEVELS } from './helpers/env.mjs';

const { buildLevel, validateLevel, newSession, move, undo, stepState, solve, initialState, visionCells, GUARD_STUN } = puzzle;
const { getLevel, clearLevelCache, MAX_LEVEL, TUTORIAL_COUNT, TIERS, tierOf, targetPar, mixSeed } = generator;

const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
const build = (spec) => { const r = buildLevel({ par: 1, id: 't', name: 't', ...spec }); assert.ok(r.level, 'level harus valid: ' + r.errors.join('; ')); return r.level; };
const run = (s, path) => { for (const k of path) { const r = move(s, k); assert.ok(r.moved, `langkah ${k} ditolak (${r.reason})`); s = r.session; } return s; };

// papan 11x5, satu lorong baris 1..3
const ROOM = ['###########', '#.........#', '#.........#', '#.........#', '###########'];
const withMap = (rows, extra = {}) => build({ map: rows, snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, ...extra });
const roomWithExit = (patch = {}) => { const m = ROOM.map(r => r.split('')); m[3][9] = 'E'; Object.entries(patch).forEach(([k, v]) => { const [x, y] = k.split(',').map(Number); m[y][x] = v; }); return m.map(r => r.join('')); };

// ---------- rintangan ----------
test('duri: ditolak tanpa Perisai (state utuh, langkah tidak terpakai); dengan Perisai lewat sekali dan duri hilang', () => {
  const lv = withMap(roomWithExit({ '3,1': 'S', '4,1': '^' }));
  const s0 = deepFreeze(newSession(lv));
  // tanpa perisai: dari awal langsung ke arah duri terlalu jauh; uji dengan level tanpa pickup
  const bare = withMap(roomWithExit({ '3,1': '^' }));
  const r0 = move(newSession(bare), 'R');
  assert.equal(r0.moved, false); assert.equal(r0.reason, 'duri');
  assert.equal(r0.session.state.steps, 0); assert.equal(r0.session.history.length, 0);
  // dengan perisai
  let s = run(s0, 'R');                          // ambil Perisai di (3,1)
  assert.equal(s.state.shield, 1);
  s = run(s, 'R');                               // masuk duri (4,1)
  assert.equal(s.state.shield, 0); assert.deepEqual(s.state.cleared, ['4,1']);
  assert.deepEqual(s.state.snake[0], { x: 4, y: 1 });
  // duri sudah hilang: ular lain kali bebas lewat
  const again = stepState(lv, { ...s.state, snake: [{ x: 3, y: 1 }, { x: 2, y: 1 }] }, 'R');
  assert.equal(again.moved, true);
});

test('tembok retak: butuh Palu, Palu terpakai, tembok hilang', () => {
  const lv = withMap(roomWithExit({ '3,1': 'P', '4,1': 'x' }));
  let s = newSession(lv);
  const bare = withMap(roomWithExit({ '3,1': 'x' }));
  const rj = move(newSession(bare), 'R'); assert.equal(rj.moved, false); assert.equal(rj.reason, 'retak');
  s = run(s, 'R'); assert.equal(s.state.hammer, 1);
  s = run(s, 'R'); assert.equal(s.state.hammer, 0); assert.deepEqual(s.state.cleared, ['4,1']);
});

test('gerbang: g terbuka di langkah genap, h di langkah ganjil; ditolak tanpa mengubah apa pun', () => {
  const lvG = withMap(roomWithExit({ '4,1': 'g' }));
  let s = run(newSession(lvG), 'R');                    // langkah 1 -> (3,1)
  const ok = move(s, 'R'); assert.equal(ok.moved, true);   // langkah 2 genap -> g terbuka
  const lvH = withMap(roomWithExit({ '4,1': 'h' }));
  s = run(newSession(lvH), 'R');
  const no = move(s, 'R'); assert.equal(no.moved, false); assert.equal(no.reason, 'gerbang'); assert.equal(no.session, s);
  // langkah 1 (ganjil) ke h terbuka
  const lvH1 = withMap(roomWithExit({ '3,1': 'h' }));
  assert.equal(move(newSession(lvH1), 'R').moved, true);
  const lvG1 = withMap(roomWithExit({ '3,1': 'g' }));
  const rj = move(newSession(lvG1), 'R'); assert.equal(rj.moved, false); assert.equal(rj.reason, 'gerbang');
});

test('validasi: rintangan/pickup/penjaga tidak boleh tumpang tindih atau tidak valid', () => {
  const bad = buildLevel({ id: 't', name: 't', par: 1, map: roomWithExit(), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 2, y: 1, dir: 'L' }] });
  assert.equal(bad.level, null);
  const bad2 = buildLevel({ id: 't', name: 't', par: 1, map: roomWithExit(), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 8, y: 2, dir: 'Q' }] });
  assert.equal(bad2.level, null);
  const bad3 = buildLevel({ id: 't', name: 't', par: 1, map: roomWithExit(), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 8, y: 2, dir: 'L', range: 9 }] });
  assert.equal(bad3.level, null);
  const bad4 = buildLevel({ id: 't', name: 't', par: 1, map: roomWithExit(), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 8, y: 2, dir: 'L', patrol: [[8, 2], [8, 9]] }] });
  assert.equal(bad4.level, null);
  const bad5 = buildLevel({ id: 't', name: 't', par: 1, map: roomWithExit({ '3,1': '?' }), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] } });
  assert.equal(bad5.level, null);
});

// ---------- penjaga ----------
const guardLevel = (patch = {}, guards = [{ x: 8, y: 2, dir: 'L', range: 3 }]) => withMap(roomWithExit(patch), { guards });

test('penjaga diam: tidak bergerak selama ular di luar pandangan; area pandang 3 lebar x range', () => {
  const lv = guardLevel();
  const st = initialState(lv);
  const cells = visionCells(lv, st, st.guards[0], 1).map(c => c.x + ',' + c.y).sort();
  // dari (8,2) menghadap kiri: x = 7,6,5 pada baris 1..3
  assert.deepEqual(cells, ['5,1', '5,2', '5,3', '6,1', '6,2', '6,3', '7,1', '7,2', '7,3']);
  let s = newSession(lv);
  s = run(s, 'RR');                                       // kepala (4,1): di luar pandangan
  assert.equal(s.state.guards[0].mode, 'idle'); assert.deepEqual([s.state.guards[0].x, s.state.guards[0].y], [8, 2]);
});

test('pandangan terhalang tembok: ular di balik tembok tidak terlihat', () => {
  const lv = guardLevel({ '7,1': '#', '7,2': '#', '7,3': '#' });
  const st = initialState(lv);
  assert.notDeepEqual(st.guards[0].dir, { x: -1, y: 0 }, 'berpaling dari tembok');
  assert.ok(visionCells(lv, st, st.guards[0], 1).every(c => c.x >= 8), 'tidak melihat tembus tembok');
});

test('penjaga terlihat, menyiapkan serangan, tiga serangan menghabiskan hati', () => {
  const lv = guardLevel(); let s = run(newSession(lv), 'RRR');
  assert.equal(s.state.guards[0].mode, 'alert'); assert.equal(s.state.hearts, 3);
  let last; for (let i = 0; i < 24 && s.state.status === 'playing'; i++) { last = move(s, 'W'); s = last.session; }
  assert.equal(s.state.status, 'lost'); assert.equal(s.state.hearts, 0); assert.equal(last.events.stung, true);
  assert.equal(move(s, 'D').reason, 'selesai');
});

test('Perisai menahan satu pukulan: musuh pingsan di tempat selama GUARD_STUN', () => {
  const lv = guardLevel({ '3,1': 'S' }); let s = run(newSession(lv), 'RRR'), hit = null;
  for (let i = 0; i < 20; i++) { const r = move(s, 'W'); s = r.session; if (r.events.shielded) { hit = r; break; } }
  assert.ok(hit); assert.equal(s.state.shield, 0); assert.equal(s.state.hearts, 3);
  assert.equal(s.state.guards[0].cd, GUARD_STUN);
  assert.deepEqual([s.state.guards[0].x, s.state.guards[0].y], [6, 1]);
});

test('bersembunyi di semak: kejaran berhenti (return) lalu penjaga kembali ke posisi awal dan idle', () => {
  const lv = guardLevel({ '2,2': 'v', '3,2': 'v', '4,2': 'v', '5,2': 'v', '6,2': 'v' }, [{ x: 9, y: 2, dir: 'L', range: 5 }]);
  let s = run(newSession(lv), 'RR');
  assert.equal(s.state.guards[0].mode, 'alert');           // terlihat di (4,1)
  s = run(s, 'R');
  assert.equal(s.state.guards[0].mode, 'chase');
  s = run(s, 'D');                                         // kepala masuk semak (5,2) -> hilang dari pandangan
  assert.equal(s.state.guards[0].mode, 'idle');
  assert.deepEqual([s.state.guards[0].x, s.state.guards[0].y], [9, 2]);
  s = run(s, 'L');                                         // tetap di semak; penjaga tiba di rumah
  const g = s.state.guards[0];
  assert.deepEqual([g.x, g.y, g.mode], [9, 2, 'idle']);
  assert.deepEqual(g.dir, { x: -1, y: 0 });                // kembali menghadap arah awal
  assert.equal(s.state.status, 'playing');
});

test('patroli: bolak-balik di jalur tetap, satu sel per langkah ular', () => {
  const rows = ['###########', '#.........#', '#.........#', '#.........#', '#.........#', '#.........#', '###########'];
  const m = rows.map(r => r.split('')); m[5][9] = 'E';
  const lv = build({ map: m.map(r => r.join('')), snake: [[2, 5], [1, 5]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 9, y: 1, dir: 'D', range: 3, patrol: [[9, 1], [9, 2], [9, 3]] }] });
  let s = newSession(lv);
  const seen = [];
  for (const k of 'RRRR') { s = run(s, k); seen.push([s.state.guards[0].x, s.state.guards[0].y]); }
  assert.deepEqual(seen, [[9, 2], [9, 3], [9, 2], [9, 1]]);
});

test('masuk pintu pada langkah yang sama dengan sengatan = MENANG (kemenangan diprioritaskan)', () => {
  const m = ROOM.map(r => r.split('')); m[1][9] = 'E';
  const lv = build({ map: m.map(r => r.join('')), snake: [[8, 1], [7, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 9, y: 2, dir: 'L', range: 1 }] });
  const r = move(newSession(lv), 'R');
  assert.equal(r.moved, true);
  assert.equal(r.session.state.status, 'won');
  assert.equal(r.events.stung, false);
  // kontrol: tanpa pintu di sel itu, langkah yang sama memang berujung sengatan (penjaga mengejar masuk ke kepala)
  const m2 = ROOM.map(r => r.split('')); m2[3][9] = 'E';
  const lv2 = build({ map: m2.map(r => r.join('')), snake: [[8, 1], [7, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 9, y: 2, dir: 'L', range: 1 }] });
  const r2 = move(newSession(lv2), 'R');
  assert.equal(r2.session.state.status, 'playing');
  const contact = stepState(lv2, { ...r2.state, guards: [{ ...r2.state.guards[0], mode: 'chase', target: r2.state.snake[0], memory: 3 }] }, 'W');
  assert.equal(contact.state.status, 'playing');
  assert.equal(contact.state.hearts, 3, 'tidak mati seketika sebelum telegraph');
});

test('penjaga pingsan tidak menyengat dan tidak melihat', () => {
  const lv = guardLevel({ '3,1': 'S' });
  let s = newSession(lv);
  s = run(s, 'RRR');
  let guard = 0;
  while (guard++ < 10) { const r = move(s, 'W'); s = r.session; if (r.events.shielded) break; }
  assert.equal(s.state.guards[0].cd, GUARD_STUN);
  const r1 = move(s, 'D'); assert.equal(r1.moved, true);
  assert.equal(r1.session.state.guards[0].cd, GUARD_STUN - 1);
  assert.equal(r1.session.state.status, 'playing');
});

test('murni + undo: state beku tidak melempar, dan undo memulihkan SEMUA (penjaga, item, rintangan) persis', () => {
  const lv = guardLevel({ '3,1': 'S', '2,2': 'v', '3,2': 'v' });
  let s = deepFreeze(newSession(lv));
  const snaps = [s];
  for (const k of 'RRRD') { const r = move(s, k); if (!r.moved) break; s = deepFreeze(r.session); snaps.push(s); }
  for (let i = snaps.length - 1; i > 0; i--) { const u = undo(s); assert.equal(u.undone, true); s = u.session; assert.deepEqual(s.state, snaps[i - 1].state); }
  assert.deepEqual(s.state, initialState(lv));
});

test('determinisme: urutan input sama -> state akhir identik (tanpa RNG/jam di sim)', () => {
  const lv = guardLevel({ '3,1': 'S' });
  const a = run(newSession(lv), 'RRRRD'), b = run(newSession(lv), 'RRRRD');
  assert.deepEqual(a.state, b.state);
});

test('solver memahami penjaga dan semak: solusi terpendek menyusuri semak dan diputar ulang menang', () => {
  // Penjaga menutup jalur tengah; semak di baris bawah memungkinkan lewat tersembunyi.
  const rows = ['#############', '#...........#', '#...........#', '#...........#', '#...........#', '#############'];
  const m = rows.map(r => r.split('')); m[4][11] = 'E'; for (let x = 4; x <= 9; x++) m[4][x] = 'v';
  const lv = build({ map: m.map(r => r.join('')), snake: [[2, 4], [1, 4]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 7, y: 2, dir: 'D', range: 2 }] });
  const sol = solve(lv);
  assert.ok(sol, 'ada solusi');
  const s = run(newSession(lv), sol);
  assert.equal(s.state.status, 'won');
  assert.equal(sol.length, 9, 'jalur lurus lewat semak (hidden) = 9 langkah');
});

test('solver: lorong sempit dengan penjaga dapat dilalui setelah bertarung', () => {
  const rows = ['#########', '#.......#', '#########'];
  const m = rows.map(r => r.split('')); m[1][7] = 'E';
  const lv = build({ map: m.map(r => r.join('')), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 5, y: 1, dir: 'L', range: 3 }] });
  const solution = solve(lv); assert.ok(solution); assert.equal(run(newSession(lv), solution).state.status, 'won');
});

// ---------- generator ----------
test('generator: level 1..5 = tutorial buatan tangan; di luar 1..50 melempar RangeError', () => {
  for (let n = 1; n <= TUTORIAL_COUNT; n++) { const g = getLevel(n, 123); assert.equal(g.tutorial, true); assert.equal(g.level, LEVELS[n - 1]); }
  assert.equal(MAX_LEVEL, 50);
  for (const bad of [0, 51, -1, 1.5, NaN, '6']) assert.throws(() => getLevel(bad, 1), RangeError);
});

test('generator: tier menutupi level 6..50 tanpa celah, dan kurva target naik', () => {
  for (let n = 6; n <= 50; n++) assert.ok(tierOf(n), `level ${n} punya tier`);
  for (let n = 7; n <= 50; n++) assert.ok(targetPar(n) >= targetPar(n - 1));
  assert.equal(TIERS[0].from, 6); assert.equal(TIERS[TIERS.length - 1].to, 50);
});

test('generator: deterministik — (seed, n) sama menghasilkan peta identik, cache dibersihkan pun sama; seed beda berbeda', () => {
  const a = getLevel(14, 77);
  clearLevelCache();
  const b = getLevel(14, 77);
  assert.deepEqual(a.level.walls, b.level.walls); assert.equal(a.level.id, b.level.id); assert.equal(a.par, b.par);
  const maps = new Set([1, 2, 3, 4, 5].map(sd => JSON.stringify(getLevel(14, sd).level.walls)));
  assert.ok(maps.size >= 3, 'seed berbeda umumnya memberi level berbeda');
  assert.notEqual(mixSeed(1, 2), mixSeed(2, 1));
});

const ALL = (() => { const out = []; for (let n = 6; n <= 50; n++) out.push(getLevel(n, 1)); return out; })();

test('generator: ke-45 level valid, bukan cadangan, solusi diputar ulang MENANG, par = optimum solver', () => {
  for (const g of ALL) {
    assert.deepEqual(validateLevel(g.level), [], `level ${g.n} valid`);
    assert.equal(g.fallback, false, `level ${g.n} bukan cadangan`);
    assert.ok(g.level.w <= 17 && g.level.h <= 15);
    const s = run(newSession(g.level), g.solution);
    assert.equal(s.state.status, 'won', `level ${g.n} solusi menang`);
    assert.equal(g.solution.length, g.par); assert.equal(g.level.par, g.par);
  }
  // optimum: ulangi solver pada sampel (BFS lapis demi lapis => terpendek)
  for (const n of [6, 20, 35, 44]) { const g = ALL[n - 6]; assert.equal(solve(g.level, 200000).length, g.par); }
});

test('generator: puzzle awal bertambah panjang, combat bertambah jenis dan jumlah musuh', () => {
  const avg = (a, b) => { const xs = ALL.filter(g => g.n >= a && g.n <= b).map(g => g.par); return xs.reduce((p, q) => p + q, 0) / xs.length; };
  const a = avg(6, 20), b = avg(21, 35), c = avg(36, 50);
  assert.ok(a < b, 'puzzle menambah rute');
  for (const g of ALL.filter(g => g.n >= 35)) assert.equal(g.level.guards.length, g.n < 43 ? 1 : 2);
  ALL.forEach(g => assert.ok(g.par >= 8));
});

test('generator: elemen baru muncul pada level pertama tiernya (portal 13, duri 20, gerbang 28, penjaga 35)', () => {
  const by = n => ALL[n - 6];
  assert.ok(by(13).features.barriers.includes('portal'));
  assert.ok(by(20).features.barriers.includes('spike'));
  assert.ok(by(28).features.barriers.includes('gate'));
  assert.ok(by(35).features.guards >= 1);
  // sebelum tier-nya, elemen itu belum ada
  for (let n = 6; n <= 12; n++) assert.deepEqual(by(n).features.barriers, ['gap']);
  for (let n = 6; n <= 34; n++) assert.equal(by(n).features.guards, 0);
});

test('generator: setiap penghalang wajib benar-benar dibutuhkan (ablasi: tanpa Palu/Perisai level retak/duri mustahil)', () => {
  let checked = 0;
  for (const g of ALL) {
    if (!g.features.barriers.includes('crack') && !g.features.barriers.includes('spike')) continue;
    const spec = JSON.parse(JSON.stringify(g.level));
    // hapus semua pickup dari peta: level tanpa Palu/Perisai tidak boleh bisa diselesaikan
    const noPick = { ...g.level, pickups: [] };
    assert.equal(solve(noPick, 60000), null, `level ${g.n}: tanpa pickup harus mustahil`);
    checked++;
  }
  assert.ok(checked >= 8, 'cukup banyak level dengan retak/duri untuk diuji');
});

test('generator: penjaga memang menghalangi — level tier penjaga yang diperiksa memuat penjaga dan solusinya tidak berstatus lost', () => {
  for (const g of ALL.filter(x => x.features.guards > 0)) {
    let s = newSession(g.level);
    for (const k of g.solution) { const r = move(s, k); assert.ok(r.moved); s = r.session; assert.notEqual(s.state.status, 'lost'); }
    assert.equal(s.state.status, 'won');
  }
});
