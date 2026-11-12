import test from 'node:test';
import assert from 'node:assert/strict';
import { makePuzzleWorld, puzzle as P, threats } from './helpers/env.mjs';
import { advance, guard, pt, room, withWall } from './puzzle.fixtures.mjs';

test('sprint follows independently held sources and clears when pausing', () => {
  const w = makePuzzleWorld({ levels: [room()] });
  w.eng.startRun();
  w.eng.setDir(1, 0);
  w.eng.setModifier('run', true, 'ShiftLeft');
  w.eng.setModifier('run', true, 'sprint-touch');
  w.eng.setModifier('run', false, 'ShiftLeft');
  w.advance(120);
  assert.equal(w.x.world.player.gait, 'run');
  w.eng.setModifier('run', false, 'sprint-touch');
  w.advance(120);
  assert.equal(w.x.world.player.gait, 'walk');
  w.eng.setModifier('run', true, 'ShiftRight');
  w.eng.pauseRun();
  w.eng.resumeRun();
  w.advance(120);
  assert.equal(w.x.world.player.gait, 'walk');
  w.eng.destroy();
});

test('walking into and out of a dark area updates stealth without an action', () => {
  const s = P.createState(room({ shadows: [{ ...pt(4, 2), radius: .8 }] }));
  assert.equal(s.player.stealth, false);
  advance(s, .75, { x: 1 });
  assert.equal(s.player.stealth, true);
  assert.equal(s.player.hidden, false);
  advance(s, .6, { x: 1 });
  assert.equal(s.player.stealth, false);
});

test('potion temporarily blocks detection by guards, dogs and CCTV', () => {
  const s = P.createState(room({
    guards: [guard(5, 2, { pause: 30 })],
    dogs: [{ ...pt(6, 2), route: [pt(6, 2)], tethered: true, leash: 0, range: 6, speed: 0 }],
    crystals: [{ ...pt(7, 2), range: 8, facing: Math.PI, fov: .8, baseFacing: Math.PI, rate: 1, phase: 0, sweep: 0 }],
  }));
  assert.equal(P.canSeePlayer(s, s.guards[0]), true);
  assert.equal(threats.dogSees(s, s.dogs[0]), true);
  s.gadget = 'stealthPotion';
  assert.equal(P.action(s, 'gadget'), true);
  advance(s, 6);
  assert.equal(P.canSeePlayer(s, s.guards[0]), false);
  assert.equal(threats.dogSees(s, s.dogs[0]), false);
  assert.equal(s.cameraAlarm, false);
  assert.equal(s.alerts, 0);
  advance(s, 1.05);
  assert.equal(s.player.stealth, false);
  assert.equal(s.cameraAlarm, true);
});

test('ward absorbs one attack while frost freezes only enemies within unobstructed reach', () => {
  const trap = { ...pt(2, 2), period: 3, phase: 0, active: 2 };
  const level = withWall(room({
    guards: [guard(2, 4, { range: 0, pause: 30 }), guard(4, 2, { range: 0, pause: 30 })],
    hazards: [trap],
  }), 3, 2);
  const s = P.createState(level);
  s.gadget = 'frost';
  assert.equal(P.action(s, 'gadget'), true);
  assert.equal(s.guards[0].stunnedUntil, 3);
  assert.equal(s.guards[1].stunnedUntil, 0);
  s.gadget = 'ward';
  assert.equal(P.action(s, 'gadget'), true);
  P.step(s);
  assert.equal(s.status, 'playing');
  assert.equal(s.player.wardUntil, 0);
  advance(s, .7);
  assert.equal(s.status, 'lost');
});

test('thrown trap lands and arms before applying ten one-second poison ticks', () => {
  const s = P.createState(room({ guards: [guard(5, 2, { range: 0, pause: 30 })] }));
  const victim = s.guards[0];
  s.gadget = 'trap';
  assert.equal(P.action(s, 'gadget'), true);
  advance(s, .4);
  assert.equal(victim.poisonUntil, 0);
  while (!victim.poisonNextAt) {
    assert.ok(s.time < 1, 'trap should land on the guard');
    P.step(s);
  }
  assert.equal(victim.hp, victim.maxHp);
  advance(s, .98);
  assert.equal(victim.hp, victim.maxHp);
  P.step(s);
  assert.equal(victim.hp, victim.maxHp - 2);
  advance(s, 9);
  assert.equal(victim.hp, victim.maxHp - 20);
  assert.equal(victim.poisonUntil, 0);
  advance(s, 2);
  assert.equal(victim.hp, victim.maxHp - 20);
});
