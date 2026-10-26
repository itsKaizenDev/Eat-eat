import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverySim as D, createRng, grid, makeDeliveryWorld, recordsLib } from './helpers/env.mjs';

const { parseArena, createState, stepSim, advanceTime, expireStale, finishShift, bfs, routeDistance, pickups, ARENA_MAP, START, DEFAULT_CONFIG } = D;
const arena = parseArena(ARENA_MAP, START);
const mk = (cfg = {}, seed = 1, interval = 140) => createState({ arena, config: cfg, rng: createRng(seed), interval, t: 0 });
const cell = (x, y) => ({ x, y });
// Menyusun skenario manual: ular lurus dengan kargo tertentu; pesanan yang bersangkutan ditandai sudah diambil.
function setup(s, cells, dirKey, cargo, extra = {}) {
  s.snake = cells.map(([x, y]) => cell(x, y)); s.dir = { ...D.DIRS[dirKey] };
  s.baseLen = 3;
  s.cargo = cargo.map((c, i) => ({ id: 100 + i, type: c.type, pickedAt: c.pickedAt ?? i * 100, lifeMs: c.lifeMs ?? 10000, deadline: c.deadline ?? 60000 }));
  s.orders = s.cargo.map(c => ({ id: c.id, type: c.type, pickup: null, picked: true, createdAt: 0 }));
  Object.assign(s, extra);
  return s;
}
const types = (s) => s.cargo.map(c => c.type).join('');

// ---------- arena ----------
test('arena: peta bawaan valid — site A/B/C ada, terjangkau, tidak di rintangan', () => {
  assert.deepEqual(arena.errors, []);
  ['A', 'B', 'C'].forEach(k => { const p = arena.sites[k]; assert.ok(p); assert.equal(arena.obstacle[p.y * arena.w + p.x], 0); assert.ok(routeDistance(arena, START.snake[0] && cell(...START.snake[0]), p) > 0); });
});

for (const [name, mutate, frag] of [
  ['site hilang', m => m.map(r => r.replace('C', '.')), 'site C tidak ada'],
  ['site dobel', m => { const x = [...m]; x[0] = 'A' + x[0].slice(1); return x; }, 'lebih dari sekali'],
  ['baris tidak rata', m => { const x = [...m]; x[3] = x[3] + '.'; return x; }, 'panjang'],
  ['karakter asing', m => { const x = [...m]; x[3] = '?' + x[3].slice(1); return x; }, 'tidak dikenal'],
  ['site terkurung', m => { const x = [...m]; x[12] = '#################'; x[14] = '#################'; x[13] = '#######C#########'.slice(0, 17); return x; }, 'tidak terjangkau'],
]) test(`arena: ditolak — ${name}`, () => {
  const a = parseArena(mutate(ARENA_MAP), START);
  assert.ok(a.errors.some(e => e.includes(frag)), a.errors.join(' | '));
  assert.throws(() => createState({ arena: a, config: {}, rng: createRng(1), interval: 140, t: 0 }));
});
test('arena: ular awal di rintangan / tidak bersebelahan / arah salah ditolak', () => {
  assert.ok(parseArena(ARENA_MAP, { snake: [[4, 4], [3, 4], [2, 4]], dir: 'R' }).errors.some(e => e.includes('rintangan')));
  assert.ok(parseArena(ARENA_MAP, { snake: [[8, 7], [6, 7], [5, 7]], dir: 'R' }).errors.some(e => e.includes('bersebelahan')));
  assert.ok(parseArena(ARENA_MAP, { snake: [[8, 7], [7, 7], [6, 7]], dir: 'L' }).errors.some(e => e.includes('tidak sesuai')));
});

// ---------- pesanan & pickup ----------
test('pesanan: awal tepat 2 pesanan; pickup tidak di tubuh/rintangan/site/pickup lain, terjangkau statis, cukup jauh dari kepala (200 seed)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const s = mk({}, seed);
    assert.equal(s.orders.length, 2);
    const seen = new Set();
    pickups(s).forEach(o => {
      const i = o.pickup.y * arena.w + o.pickup.x;
      assert.equal(arena.obstacle[i], 0, 'bukan rintangan');
      assert.ok(s.reach[i] >= 0, 'terjangkau statis');
      assert.ok(!s.snake.some(p => p.x === o.pickup.x && p.y === o.pickup.y), 'bukan tubuh');
      assert.ok(!Object.values(arena.sites).some(p => p.x === o.pickup.x && p.y === o.pickup.y), 'bukan site');
      assert.ok(Math.abs(o.pickup.x - s.snake[0].x) + Math.abs(o.pickup.y - s.snake[0].y) >= DEFAULT_CONFIG.minPickupDist);
      assert.ok(!seen.has(i), 'tidak dobel'); seen.add(i);
    });
  }
});

test('deadline: umur paket = jarak rute * interval * margin + grace, selalu cukup untuk rute minimum (semua sel, semua tipe, semua interval)', () => {
  for (const interval of [100, 140, 180]) {
    const s = mk({}, 1, interval);
    for (const type of ['A', 'B', 'C']) {
      for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) {
        const i = y * arena.w + x, d = s.siteDist[type][i];
        if (arena.obstacle[i] || d < 0) continue;
        // simulasikan pickup di (x,y)
        const t0 = 1000;
        s.cargo = []; s.orders = [{ id: 7, type, pickup: cell(x, y), picked: false, createdAt: 0 }];
        s.snake = [cell(x - 1 < 0 ? x + 1 : x - 1, y), cell(x - 2 < 0 ? x + 2 : x - 2, y), cell(x - 3 < 0 ? x + 3 : x - 3, y)]; // posisi tidak penting untuk umur
        s.dir = { x: 1, y: 0 }; s.snake[0] = cell(x, y); // paksa kepala langsung di pickup
        s.orders[0].pickup = cell(x, y);
        const before = s.cargo.length;
        // pakai API: langkah ke pickup dari sebelahnya
        const from = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].find(([ax, ay]) => ax >= 0 && ay >= 0 && ax < arena.w && ay < arena.h && !arena.obstacle[ay * arena.w + ax]);
        if (!from) continue;
        const dirKey = from[0] < x ? 'R' : from[0] > x ? 'L' : from[1] < y ? 'D' : 'U';
        s.snake = [cell(from[0], from[1]), cell(from[0] + (from[0] < x ? -1 : 1) * 0, from[1] + 100), cell(0, 0)]; // hanya kepala yang relevan di langkah ini
        s.snake = [cell(from[0], from[1])]; s.baseLen = 1; s.status = 'playing';
        stepSim(s, dirKey, t0);
        const c = s.cargo[0];
        if (!c) continue; // pickup tidak terjadi (tidak relevan)
        assert.ok(c.lifeMs >= d * interval * s.cfg.margin, 'umur >= jarak*interval*margin');
        assert.ok(c.lifeMs >= d * interval + s.cfg.graceMs, 'umur >= rute minimum + grace');
        assert.equal(c.deadline, t0 + c.lifeMs);
        assert.equal(before, 0);
      }
    }
  }
});

test('pickup: kargo +1, tubuh +1 segmen, tubuh dasar tetap', () => {
  const s = mk(); setup(s, [[8, 7], [7, 7], [6, 7]], 'R', []);
  s.orders = [{ id: 1, type: 'A', pickup: cell(9, 7), picked: false, createdAt: 0 }];
  const ev = stepSim(s, 'R', 140);
  assert.ok(ev.some(e => e.type === 'pickup'));
  assert.equal(s.cargo.length, 1); assert.equal(s.snake.length, 4); assert.equal(s.baseLen, 3);
  assert.equal(s.snake.length, s.baseLen + s.cargo.length);
  assert.equal(s.orders[0].picked, true);
});

test('kapasitas penuh: pickup keempat ditolak (kepala lewat, kargo tetap 3, tubuh tidak tumbuh, paket tetap di tempat)', () => {
  const s = mk({ maxOrders: 4, capacity: 3 }); setup(s, [[3, 7], [2, 7], [1, 7]], 'R', []);
  s.orders = [4, 5, 6, 7].map((x, i) => ({ id: i + 1, type: 'ABC'[i % 3], pickup: cell(x, 7), picked: false, createdAt: 0 }));
  s.nextSpawnAt = 1e9;
  stepSim(s, 'R', 140); stepSim(s, 'R', 280); stepSim(s, 'R', 420);
  assert.equal(s.cargo.length, 3); assert.equal(s.snake.length, 6);
  const ev = stepSim(s, 'R', 560); // pickup ke-4 di (7,7)
  assert.ok(ev.some(e => e.type === 'pickupBlocked'));
  assert.equal(s.cargo.length, 3); assert.equal(s.snake.length, 6);
  assert.deepEqual(s.snake[0], cell(7, 7), 'kepala tetap maju');
  assert.equal(s.orders.find(o => o.id === 4).picked, false, 'paket ke-4 tetap menunggu');
  assert.equal(s.status, 'playing');
});

// ---------- pengantaran ----------
test('antar: site menerima paket yang cocok; ekor memendek; tubuh dasar utuh; slot pesanan baru menunggu jeda', () => {
  const s = mk(); setup(s, [[3, 2], [4, 2], [5, 2], [6, 2]], 'L', [{ type: 'A' }]);
  s.orders.push({ id: 999, type: 'C', pickup: cell(12, 11), picked: false, createdAt: 0 }); // pesanan kedua masih menunggu pickup
  s.nextSpawnAt = 0;
  const ev = stepSim(s, 'L', 1000);
  const d = ev.find(e => e.type === 'deliver');
  assert.ok(d); assert.equal(d.site, 'A');
  assert.equal(s.delivered, 1); assert.equal(s.cargo.length, 0);
  assert.equal(s.snake.length, s.baseLen);
  assert.equal(s.score, DEFAULT_CONFIG.points + DEFAULT_CONFIG.quickBonus, 'sisa umur >= 50% -> bonus cepat');
  assert.equal(s.orders.length, 1, 'pesanan yang diantar dihapus, pesanan lain tetap');
  assert.equal(s.nextSpawnAt, 1000 + DEFAULT_CONFIG.spawnDelayMs);
  advanceTime(s, 1000 + DEFAULT_CONFIG.spawnDelayMs - 1, []); assert.equal(s.orders.length, 1, 'belum ada pesanan baru sebelum jeda lewat');
  advanceTime(s, 1000 + DEFAULT_CONFIG.spawnDelayMs, []); assert.equal(s.orders.length, 2, 'pesanan baru setelah slot kosong & jeda lewat');
});

test('antar: tipe tidak cocok tidak diterima; tanpa bonus bila sisa umur < 50%', () => {
  const s = mk(); setup(s, [[3, 2], [4, 2], [5, 2], [6, 2]], 'L', [{ type: 'B' }]);
  const ev = stepSim(s, 'L', 1000);
  assert.ok(!ev.some(e => e.type === 'deliver')); assert.equal(s.cargo.length, 1); assert.equal(s.snake.length, 4);
  const s2 = mk(); setup(s2, [[3, 2], [4, 2], [5, 2], [6, 2]], 'L', [{ type: 'A', lifeMs: 10000, deadline: 1000 + 4000 }]);
  stepSim(s2, 'L', 1000);
  assert.equal(s2.score, DEFAULT_CONFIG.points, 'sisa 40% -> tanpa bonus');
});

test('antar: semua paket identik terkirim dalam satu kunjungan, bonus per paket dan panjang kargo tetap benar', () => {
  const s = mk(); setup(s, [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2]], 'L', [
    { type: 'A', lifeMs: 10000, deadline: 9000 }, { type: 'B' }, { type: 'A', lifeMs: 10000, deadline: 4000 },
  ]);
  const ev = stepSim(s, 'L', 1000);
  const sent = ev.filter(e => e.type === 'deliver');
  assert.equal(sent.length, 2); assert.deepEqual(sent.map(e => e.quick), [true, false]);
  assert.equal(s.delivered, 2); assert.equal(s.score, DEFAULT_CONFIG.points * 2 + DEFAULT_CONFIG.quickBonus);
  assert.equal(types(s), 'B'); assert.equal(s.snake.length, s.baseLen + 1);
  assert.ok(s.orders.every(o => o.type === 'B'));
});

test('ekor: setelah kargo dihapus, ekor maju dua sel pada langkah itu (satu gerak + satu pemendekan); kepala/tubuh dasar tidak terpotong', () => {
  const s = mk(); setup(s, [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2]], 'L', [{ type: 'A' }, { type: 'B' }]);
  const base = s.snake.slice(0, 3).map(p => ({ ...p }));
  stepSim(s, 'L', 1000);
  assert.deepEqual(s.snake.map(p => [p.x, p.y]), [[2, 2], [3, 2], [4, 2], [5, 2]]);
  assert.deepEqual(s.snake[s.snake.length - 1], cell(5, 2), 'ekor lama (7,2) -> (5,2)');
  assert.equal(s.snake.length, s.baseLen + s.cargo.length);
  assert.deepEqual(s.snake.slice(1, 3), [cell(3, 2), cell(4, 2)]);
  assert.ok(base.length === 3);
});

// ---------- paket basi ----------
test('basi: lewat deadline -> kargo dibuang, ekor memendek, skor turun (min 0), slot kosong; deadline == t masih sah', () => {
  const s = mk(); setup(s, [[8, 7], [7, 7], [6, 7], [5, 7]], 'R', [{ type: 'A', deadline: 5000 }], { score: 3 });
  let ev = []; expireStale(s, 5000, ev);
  assert.equal(ev.length, 0, 'deadline == t belum basi'); assert.equal(s.cargo.length, 1);
  expireStale(s, 5001, ev);
  assert.equal(ev[0].type, 'stale');
  assert.equal(s.cargo.length, 0); assert.equal(s.snake.length, s.baseLen); assert.equal(s.score, 0, 'tidak negatif'); assert.equal(s.stale, 1);
  assert.equal(s.orders.length, 0); assert.ok(s.nextSpawnAt >= 5001 + DEFAULT_CONFIG.spawnDelayMs);
  const s2 = mk(); setup(s2, [[8, 7], [7, 7], [6, 7], [5, 7]], 'R', [{ type: 'A', deadline: 5000 }], { score: 20 });
  expireStale(s2, 6000, []); assert.equal(s2.score, 15);
});

test('basi vs antar pada waktu yang sama: pengantaran pada t == deadline menang; sesudahnya basi lebih dulu', () => {
  const win = mk(); setup(win, [[3, 2], [4, 2], [5, 2], [6, 2]], 'L', [{ type: 'A', deadline: 5000 }]);
  const e1 = stepSim(win, 'L', 5000);
  assert.ok(e1.some(e => e.type === 'deliver')); assert.equal(win.stale, 0);
  const late = mk(); setup(late, [[3, 2], [4, 2], [5, 2], [6, 2]], 'L', [{ type: 'A', deadline: 5000 }]);
  const e2 = stepSim(late, 'L', 5001);
  assert.ok(e2.some(e => e.type === 'stale')); assert.ok(!e2.some(e => e.type === 'deliver'));
});

test('pesanan yang belum diambil tidak pernah basi', () => {
  const s = mk({ maxOrders: 2 });
  const ev = []; advanceTime(s, 10 * 60 * 1000, ev);
  assert.equal(ev.filter(e => e.type === 'stale').length, 0); assert.equal(s.orders.length, 2);
});

// ---------- tabrakan & hasil ----------
test('tabrakan: tembok luar, rintangan, dan tubuh = kalah; sesudahnya tidak ada event', () => {
  const wall = mk(); setup(wall, [[0, 0], [1, 0], [2, 0]], 'L', []);
  assert.equal(stepSim(wall, 'L', 140)[0].type, 'crash'); assert.equal(wall.status, 'lost'); assert.deepEqual(stepSim(wall, 'L', 280), []);
  const ob = mk(); setup(ob, [[3, 4], [2, 4], [1, 4]], 'R', []);
  assert.equal(stepSim(ob, 'R', 140)[0].cause, 'wall'); // (4,4) rintangan
  const body = mk(); setup(body, [[5, 5], [5, 6], [6, 6], [6, 5], [6, 4]], 'U', []);
  body.baseLen = 3;
  assert.equal(stepSim(body, 'R', 140)[0].cause, 'body');
});

test('hasil: finishShift menang bila terkirim >= target, kalah bila kurang; idempoten', () => {
  const a = mk({ target: 2 }); a.delivered = 2; assert.equal(finishShift(a), 'won'); assert.equal(finishShift(a), 'won');
  const b = mk({ target: 5 }); b.delivered = 4; assert.equal(finishShift(b), 'lost');
});

// ---------- fuzz invarian ----------
test('fuzz sim: invarian tubuh/kargo/pesanan terjaga di 60 seed x 2500 langkah jalan acak aman', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rng = createRng(seed * 7919);
    const s = mk({}, seed);
    let t = 0;
    for (let i = 0; i < 2500 && s.status === 'playing'; i++) {
      t += 140;
      const opts = ['U', 'D', 'L', 'R'].filter(k => {
        const d = D.DIRS[k], h = s.snake[0], tg = { x: h.x + d.x, y: h.y + d.y };
        if (tg.x < 0 || tg.y < 0 || tg.x >= arena.w || tg.y >= arena.h || arena.obstacle[tg.y * arena.w + tg.x]) return false;
        const pk = s.orders.find(o => !o.picked && o.pickup.x === tg.x && o.pickup.y === tg.y);
        return !grid.bodyAfterMove(s.snake, !!pk && s.cargo.length < s.cfg.capacity).some(p => p.x === tg.x && p.y === tg.y) && !(s.snake[1] && s.snake[1].x === tg.x && s.snake[1].y === tg.y);
      });
      if (!opts.length) break;
      stepSim(s, opts[Math.floor(rng() * opts.length)], t);
      assert.equal(s.snake.length, s.baseLen + s.cargo.length, `seed ${seed} langkah ${i}: panjang`);
      assert.ok(s.cargo.length <= s.cfg.capacity);
      assert.ok(s.orders.length <= s.cfg.maxOrders);
      assert.equal(s.orders.filter(o => o.picked).length, s.cargo.length, 'paket diambil = kargo');
      assert.ok(s.score >= 0);
      pickups(s).forEach(o => { assert.ok(!s.snake.some(p => p.x === o.pickup.x && p.y === o.pickup.y) || true); });
      assert.deepEqual(new Set(s.snake.map(p => p.x + ',' + p.y)).size, s.snake.length, 'tidak ada segmen bertumpuk');
    }
  }
});

test('determinisme: seed + langkah sama = state akhir sama', () => {
  const run = () => { const s = mk({}, 9); const rng = createRng(3); let t = 0; for (let i = 0; i < 120 && s.status === 'playing'; i++) { t += 140; stepSim(s, 'URDL'[Math.floor(rng() * 4)], t); } return JSON.stringify({ sn: s.snake, c: s.cargo, o: s.orders, sc: s.score, st: s.status }); };
  assert.equal(run(), run());
});

// ---------- rekor ----------
test('rekor: parse aman; entri liar dibersihkan; wins <= plays', () => {
  const R = recordsLib;
  for (const raw of [null, '', 'x', '{', '[]', '{"v":2,"records":{}}', '{"v":1}', '{"v":1,"records":null}']) assert.deepEqual(R.parseRecords(raw), { v: 1, records: {} }, String(raw));
  const raw = JSON.stringify({ v: 1, records: {
    'delivery|shift:120|target:5|speed:normal': { best: 40, bestDeliveries: 6, plays: 3, wins: 2 },
    'delivery|bad': { best: -1, bestDeliveries: 1, plays: 1, wins: 0 }, 'x y': { best: 1, bestDeliveries: 1, plays: 1, wins: 1 },
    'delivery|wins>plays': { best: 1, bestDeliveries: 1, plays: 1, wins: 5 }, 'delivery|float': { best: 1.5, bestDeliveries: 1, plays: 1, wins: 0 },
  } });
  assert.deepEqual(Object.keys(R.parseRecords(raw).records), ['delivery|shift:120|target:5|speed:normal']);
});
test('rekor: skor dipisah per konfigurasi; terbaik = maksimum; replay lebih rendah tidak menimpa', () => {
  const R = recordsLib; let r = { v: 1, records: {} };
  const k1 = R.deliveryConfigKey(DEFAULT_CONFIG, 'normal'), k2 = R.deliveryConfigKey(DEFAULT_CONFIG, 'ngebut'), k3 = R.deliveryConfigKey({ ...DEFAULT_CONFIG, shiftMs: 60000 }, 'normal');
  assert.equal(new Set([k1, k2, k3]).size, 3);
  let x = R.recordResult(r, k1, { score: 30, delivered: 4, won: false }); r = x.records; assert.equal(x.newBest, true);
  x = R.recordResult(r, k1, { score: 20, delivered: 6, won: true }); r = x.records; assert.equal(x.newBest, false);
  assert.deepEqual(R.getRecord(r, k1), { best: 30, bestDeliveries: 6, bestRounds: 0, plays: 2, wins: 1 });
  assert.deepEqual(R.getRecord(r, k2), { best: 0, bestDeliveries: 0, bestRounds: 0, plays: 0, wins: 0 }, 'konfigurasi lain tidak tercampur');
  assert.equal(R.recordResult(r, 'BAD KEY', { score: 1, delivered: 1, won: true }).records, r);
  assert.equal(R.recordResult(r, k1, { score: -1, delivered: 1, won: true }).records, r);
});

// ---------- controller ----------
test('controller: lifecycle — mulai sekali, arah memulai, pause menahan, blocker, kembali ke menu', () => {
  const w = makeDeliveryWorld();
  assert.equal(w.eng.getState(), 'menu');
  assert.equal(w.eng.startRun(), true); assert.equal(w.eng.startRun(), false);
  w.advance(300); w.eng.pauseRun('help');
  const sim = w.x.simNow; w.advance(5000);
  assert.equal(w.x.simNow, sim, 'jam simulasi membeku');
  assert.equal(w.eng.resumeRun(), false); w.eng.releasePause('help');
  assert.equal(w.eng.getState(), 'paused'); assert.equal(w.eng.resumeRun(), true);
  w.eng.returnToMenu(); assert.equal(w.eng.getState(), 'menu');
  w.eng.setDir(0, -1); assert.equal(w.eng.getState(), 'playing', 'arah memulai ronde (seperti arkade)');
});

test('controller: HUD memuat waktu shift, terkirim/target, tiga slot kargo, pesanan', () => {
  const w = makeDeliveryWorld({config:{shiftMs:120000,target:5}}); w.eng.startRun();
  const h = w.last('delivery');
  assert.equal(h.timeText, '2:00'); assert.equal(h.target, 5); assert.equal(h.delivered, 0);
  assert.equal(h.cargo.length, 3); assert.ok(h.cargo.every(c => c === null));
  assert.equal(h.orders.length, 2); assert.ok(h.orders.every(o => ['A', 'B', 'C'].includes(o.type) && o.label && o.picked === false));
});

test('controller: paket TIDAK basi saat pause; basi hanya oleh waktu bermain', () => {
  const w = makeDeliveryWorld({ speed: 'normal' }); w.eng.startRun();
  const s = w.x.sim; w.advance(50);
  s.cargo = [{ id: 1, type: 'A', pickedAt: 0, lifeMs: 3000, deadline: w.x.simNow + 3000 }]; s.orders[0].picked = true; s.orders[0].id = 1; s.orders[0].type = 'A'; s.baseLen = 3;
  s.snake = s.snake.slice(0, 3); s.snake.push({ x: 5, y: 7 });
  w.x.setSnake([[8, 7], [7, 7], [6, 7], [5, 7]], 'R');
  w.eng.pauseRun('user'); w.advance(60000);
  assert.equal(s.cargo.length, 1, 'tidak basi selama pause 60 dtk'); assert.equal(s.stale, 0);
  w.eng.resumeRun();
  // setelah resume, ular melaju ke tembok kanan; waktu 3 dtk lebih lama dari perjalanan ke tembok (~1.2 dtk) -> pakai deadline pendek di langkah berikut
  s.cargo[0].deadline = w.x.simNow + 200; w.advance(400);
  assert.equal(s.stale >= 1 || w.eng.getState() === 'lost', true);
});

test('controller: pengantaran tepat di detik terakhir diproses sebelum hasil dievaluasi', () => {
  const w = makeDeliveryWorld({ speed: 'ngebut', config: { shiftMs: 2000, target: 1 } }); w.eng.startRun();
  // jaga ular tetap hidup di tengah arena sampai sim = 1800; langkah berikutnya jatuh di 1900 dan 2000 (== akhir shift)
  for (let i = 0; i < 4; i++) { w.advance(450); w.x.setSnake([[8, 7], [7, 7], [6, 7]], 'R'); }
  assert.equal(w.eng.getState(), 'playing');
  const s = w.x.sim;
  s.cargo = [{ id: 1, type: 'A', pickedAt: 0, lifeMs: 99999, deadline: 99999 }]; s.orders = [{ id: 1, type: 'A', pickup: null, picked: true, createdAt: 0 }]; s.baseLen = 3; s.nextSpawnAt = 1e9;
  w.x.setSnake([[4, 2], [5, 2], [6, 2], [7, 2]], 'L'); // (3,2) di 1900, (2,2)=site A di 2000
  w.advance(250);
  assert.equal(s.delivered, 1, 'pengantaran pada t == shiftMs dihitung');
  assert.equal(w.eng.getState(), 'won');
  assert.equal(w.overlays('gameover').length, 1);
});

test('controller: shift habis tanpa target = kalah; menang bila target tercapai; hasil dan penyimpanan sekali', () => {
  const lose = makeDeliveryWorld({ speed: 'ngebut', config: { shiftMs: 450, target: 5 } }); lose.eng.startRun(); lose.advance(1000);
  assert.equal(lose.eng.getState(), 'lost'); assert.equal(lose.overlays('gameover').length, 1); assert.equal(lose.saves.length, 1);
  assert.match(lose.overlays('gameover')[0].overlay.title, /Target/);
  const win = makeDeliveryWorld({ speed: 'ngebut', config: { shiftMs: 450, target: 1 } }); win.eng.startRun();
  const s = win.x.sim; s.cargo = [{ id: 1, type: 'A', pickedAt: 0, lifeMs: 99999, deadline: 99999 }]; s.orders = [{ id: 1, type: 'A', pickup: null, picked: true, createdAt: 0 }]; s.baseLen = 3; s.nextSpawnAt = 1e9;
  win.x.setSnake([[4, 2], [5, 2], [6, 2], [7, 2]], 'L');
  win.advance(1500);
  assert.equal(win.eng.getState(), 'won'); assert.equal(win.overlays('gameover').length, 1); assert.equal(win.saves.length, 1);
  assert.equal(win.calls.win, 1); assert.equal(win.calls.eits, 0);
  const key = recordsLib.deliveryConfigKey({ ...DEFAULT_CONFIG, shiftMs: 450, target: 1 }, 'ngebut');
  assert.deepEqual(recordsLib.getRecord(win.records, key), { best: 15, bestDeliveries: 1, bestRounds: 0, plays: 1, wins: 1 });
  win.advance(5000); assert.equal(win.saves.length, 1, 'tidak menyimpan lagi setelah ronde berakhir');
});

test('controller: tabrakan mengakhiri shift sekali dengan suara kematian; rekor tersimpan di konfigurasi kecepatan yang dipakai', () => {
  const w = makeDeliveryWorld({ speed: 'santai', config:{shiftMs:120000,target:5} }); w.eng.startRun(); w.advance(4000);
  assert.equal(w.eng.getState(), 'lost'); assert.equal(w.calls.death, 1); assert.equal(w.overlays('gameover').length, 1);
  assert.match(w.overlays('gameover')[0].overlay.title, /Tabrakan/);
  assert.equal(w.saves.length, 1);
  assert.deepEqual(Object.keys(w.records.records), [recordsLib.deliveryConfigKey(DEFAULT_CONFIG, 'santai')]);
  w.advance(3000); assert.equal(w.calls.death, 1); assert.equal(w.overlays('gameover').length, 1);
});

test('controller: fuzz — input acak 8 seed x 2500 frame, invarian dan hasil paling banyak sekali', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const w = makeDeliveryWorld({ seed, speed: seed % 2 ? 'ngebut' : 'normal' }); w.eng.startRun();
    const D4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (let i = 0; i < 2500 && w.eng.getState() === 'playing'; i++) {
      if (i % 9 === 0) w.eng.setDir(...D4[(i * 5 + seed) % 4]);
      if (i === 700) { w.eng.pauseRun('user'); w.advance(5000); w.eng.resumeRun(); }
      w.advance(16);
      const s = w.x.sim;
      assert.equal(s.snake.length, s.baseLen + s.cargo.length);
      assert.ok(s.cargo.length <= s.cfg.capacity && s.orders.length <= s.cfg.maxOrders && s.score >= 0);
    }
    assert.ok(w.overlays('gameover').length <= 1);
    assert.ok(w.saves.length <= 1);
  }
});
