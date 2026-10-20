import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzle as P, campaign } from './helpers/env.mjs';

const build = extra => {
  const r = P.buildLevel({ id: 'dungeon', name: 'Dungeon', par: 99, map: ['#########', '#.......#', '#.......#', '#......E#', '#########'], snake: [[2, 2]], dir: 'R', exit: { keys: 0, plates: [] }, ...extra });
  assert.ok(r.level, r.errors.join('; ')); return r.level;
};
const withGuard = (kind = 'warden') => build({ guards: [{ x: 3, y: 2, dir: 'L', kind }] });
const frozen = o => { if (o && typeof o === 'object') { Object.values(o).forEach(frozen); Object.freeze(o); } return o; };

test('tuas membuka jeruji permanen, nomor tautan valid, undo mengembalikan pintu tertutup', () => {
  const lv = build({ map: ['#########', '#..!G..E#', '#########'], snake: [[2, 1]], links: [{ lever: [3, 1], gate: [4, 1] }] });
  const start = P.newSession(lv), r = P.move(start, 'R');
  assert.equal(P.gateOpen(lv.gates[0], 1, start.state), false);
  assert.equal(r.events.leverOn, true);
  for (const turn of [2, 3, 4, 20]) assert.equal(P.gateOpen(lv.gates[0], turn, r.state), true);
  assert.equal(P.move(r.session, 'R').moved, true);
  assert.deepEqual(P.undo(r.session).session.state, start.state);
  assert.equal(P.buildLevel({ id: 'bad', par: 1, map: ['#####', '#.GE#', '#####'], snake: [[1, 1]], dir: 'R' }).level, null);
});

test('gerbang ritme lama: menunggu atau keluar saat jeruji menutup tidak mengunci pemain', () => {
  const lv = build({ map: ['#########', '#..h...E#', '#########'], snake: [[2, 1]] });
  let s = P.move(P.newSession(lv), 'R').session;
  const wait = P.move(s, 'W'); assert.equal(wait.moved, true); s = wait.session;
  assert.equal(P.move(s, 'R').moved, true);
});

test('LOS tidak menembus sisi tembok atau sudut diagonal', () => {
  const lv = build({ map: ['#########', '#..#....#', '#.......#', '#......E#', '#########'], snake: [[1, 3]], guards: [{ x: 2, y: 2, dir: 'R', range: 4 }] });
  const st = P.initialState(lv), g = { ...st.guards[0], dir: { x: 1, y: 0 } }; st.guards[0] = g;
  const cells = P.visionCells(lv, st, g, 1);
  assert.ok(cells.some(c => c.x === 4 && c.y === 2));
  assert.ok(!cells.some(c => c.x === 4 && c.y === 1), 'ray melewati sudut tembok (3,1)');
  assert.ok(cells.some(c => c.x === 6 && c.y === 1), 'ray lain yang bebas tetap terlihat');
});

test('musuh menuju petak yang sama tidak bertumpuk atau masuk ke petak pemain', () => {
  const lv = build({ snake: [[4, 3]], guards: [{ x: 3, y: 2, dir: 'R' }, { x: 5, y: 2, dir: 'L' }] });
  let st = P.initialState(lv);
  st.guards = st.guards.map(g => ({ ...g, mode: 'chase', target: { x: 4, y: 2 }, memory: 3 }));
  for (let i = 0; i < 8; i++) {
    st = P.stepState(lv, st, 'W').state;
    const live = st.guards.filter(g => g.hp > 0);
    assert.equal(new Set(live.map(g => `${g.x},${g.y}`)).size, live.length);
    assert.ok(live.every(g => g.x !== st.snake[0].x || g.y !== st.snake[0].y));
    if (st.status !== 'playing') break;
  }
});

test('bump attack: penjaga 2 HP, slime 1 HP, tidak maju atau tumbuh, musuh mati tidak menghalangi', () => {
  for (const [kind, hp] of [['warden', 2], ['slime', 1]]) {
    const lv = withGuard(kind); let s = frozen(P.newSession(lv));
    for (let h = hp; h > 0; h--) {
      const r = P.move(s, 'R'); assert.equal(r.events.hit, true); s = r.session;
      assert.equal(s.state.guards[0].hp, h - 1); assert.deepEqual(s.state.snake, [{ x: 2, y: 2 }]);
    }
    assert.equal(s.state.defeated, 1); assert.equal(s.state.apples, 0);
    assert.deepEqual(P.visionCells(lv, s.state, s.state.guards[0], s.state.steps + 1), []);
    assert.deepEqual(P.move(s, 'R').state.snake, [{ x: 3, y: 2 }]);
  }
});

test('alert lalu windup mengunci sasaran: ada satu giliran untuk menghindar, serangan tidak mengikuti pemain', () => {
  const lv = withGuard(); let st = P.initialState(lv);
  st = P.stepState(lv, st, 'W').state; assert.equal(st.guards[0].mode, 'alert');
  st = P.stepState(lv, st, 'W').state; assert.equal(st.guards[0].mode, 'windup');
  assert.deepEqual(st.guards[0].aim, { x: 2, y: 2 });
  const dodge = P.stepState(lv, frozen(st), 'U');
  assert.equal(dodge.state.hearts, 3); assert.equal(dodge.state.guards[0].mode, 'recover');
  const hit = P.stepState(lv, st, 'W'); assert.equal(hit.state.hearts, 2); assert.equal(hit.events.hurt, true);
});

test('dua serangan serentak hanya satu damage; kebal satu giliran, hati ketiga habis = kalah', () => {
  const lv = build({ guards: [{ x: 3, y: 2, dir: 'L' }, { x: 2, y: 1, dir: 'D' }] });
  let st = P.initialState(lv);
  const armed = s => ({ ...s, guards: s.guards.map(g => ({ ...g, mode: 'windup', aim: { ...s.snake[0] } })) });
  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 2);
  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 2);
  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 1);
  st = P.stepState(lv, armed(st), 'W').state;
  const death = P.stepState(lv, armed(st), 'W');
  assert.equal(death.state.status, 'lost'); assert.equal(death.state.hearts, 0); assert.equal(death.events.stung, true);
  assert.equal(P.stepState(lv, death.state, 'R').reason, 'selesai');
});

test('heal pulih 1 maksimal 3; perisai stun di tempat dan tidak mereset posisi ke rumah', () => {
  const lv = build({ map: ['#########', '#.......#', '#..H....#', '#......E#', '#########'], guards: [{ x: 6, y: 2, dir: 'L' }] });
  const start = P.initialState(lv);
  for (const [hearts, expected] of [[1, 2], [3, 3]]) {
    const r = P.stepState(lv, { ...start, hearts }, 'R'); assert.equal(r.state.hearts, expected); assert.equal(r.events.pickup, 'heal');
  }
  const armed = { ...start, shield: 1, guards: [{ ...start.guards[0], x: 3, mode: 'windup', aim: { x: 2, y: 2 } }] };
  const r = P.stepState(lv, armed, 'W'); assert.equal(r.events.shielded, true); assert.equal(r.state.hearts, 3); assert.equal(r.state.shield, 0);
  assert.deepEqual([r.state.guards[0].x, r.state.guards[0].y, r.state.guards[0].cd], [3, 2, P.GUARD_STUN]);
});

test('A* combat sama optimum BFS exhaustive pada ruang kecil, solusi dapat diputar ulang', () => {
  const lv = build({ map: ['#######', '#....E#', '#.....#', '#######'], snake: [[1, 1]], guards: [{ x: 3, y: 1, dir: 'L' }] });
  const sol = P.solve(lv, 50000); assert.ok(sol);
  let frontier = [P.initialState(lv)], shortest = null;
  const seen = new Set();
  for (let depth = 1; depth <= sol.length; depth++) {
    const next = [];
    for (const st of frontier) for (const k of ['U', 'D', 'L', 'R', 'W']) {
      const r = P.stepState(lv, st, k); if (!r.moved || r.state.status === 'lost') continue;
      if (r.state.status === 'won') { shortest = depth; break; }
      const id = JSON.stringify({ ...r.state, steps: r.state.steps % 2, hurtUntil: Math.max(0, r.state.hurtUntil - r.state.steps) });
      if (!seen.has(id)) { seen.add(id); next.push(r.state); }
    }
    if (shortest !== null) break; frontier = next;
  }
  assert.equal(sol.length, shortest);
  let st = P.initialState(lv); for (const k of sol) st = P.stepState(lv, st, k).state;
  assert.equal(st.status, 'won');
});

test('kampanye 35–42 tepat satu musuh, 43–50 tepat dua, tuas permanen dan dua jenis musuh terpakai', () => {
  for (const [i, lv] of campaign.CAMPAIGN_LEVELS.entries()) {
    const n = i + 1;
    assert.equal(lv.guards.length, n < 35 ? 0 : n < 43 ? 1 : 2, `ruang ${n}`);
    assert.ok(lv.gates.every(g => g.open === 'lever'), `ruang ${n}: tidak ada paritas gerbang`);
    if (n >= 43) assert.deepEqual(new Set(lv.guards.map(g => g.kind)), new Set(['slime', 'warden']));
  }
});
