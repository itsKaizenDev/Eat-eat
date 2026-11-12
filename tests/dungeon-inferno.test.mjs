import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { campaign, makePuzzleWorld, progressLib, puzzle, root, validation } from './helpers/env.mjs';
import { playBoss } from './helpers/dungeon-boss.mjs';
import { advance, guard, pt, room, withWall } from './puzzle.fixtures.mjs';

const { BOSS_LEVEL, CAMPAIGN_LEVELS, INFERNO_BOSS, INFERNO_LEVELS } = campaign;
const { audioScene } = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/audio/score.mjs'));
const { bossHp } = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/puzzle/boss.mjs'));
const routes = JSON.parse(fs.readFileSync(new URL('./fixtures/inferno-witnesses.json', import.meta.url)));

test('Dungeon has 99 ordered levels and a unique Inferno footprint for each room', () => {
  assert.deepEqual(CAMPAIGN_LEVELS.map(l => l.number), Array.from({ length: 99 }, (_, i) => i + 1));
  assert.equal(new Set(CAMPAIGN_LEVELS.map(l => l.id)).size, 99);
  assert.equal(BOSS_LEVEL.id, 'gen-51');
  assert.equal(CAMPAIGN_LEVELS[49], BOSS_LEVEL);
  assert.equal(CAMPAIGN_LEVELS[98], INFERNO_BOSS);
  assert.equal(new Set(INFERNO_LEVELS.map(l => l.map.join('\n'))).size, 48);
  assert.equal(new Set(INFERNO_LEVELS.map(l => l.tier)).size, 4);
  assert.ok(INFERNO_LEVELS.every(l => l.guards.every(g => g.corrupted) && l.beasts.length >= 4 && l.beasts.some(b => b.kind === 'echo')));
  assert.ok(INFERNO_LEVELS.at(-1).beasts.length > INFERNO_LEVELS[0].beasts.length);
});

test('all 48 Inferno missions preserve idle patrols and can be cleared with live threats', () => {
  for (const level of INFERNO_LEVELS) {
    assert.deepEqual(validation.validateLevel(level), [], level.id);
    assert.equal(validation.idleSurvival(level).ok, true, level.id);
    const state = puzzle.createState(level);
    assert.equal(state.guards[0].hp, 120);
    assert.ok(routes[level.number]?.length, level.id);
    validation.replayRoute(state, routes[level.number]);
    assert.equal(state.status, 'won', level.id);
    assert.equal(state.alerts, 0, level.id);
    assert.ok(state.time <= level.par, level.id);
  }
});

test('winning level 50 saves the boss result, freezes for the comic, then enters level 51 once', () => {
  const w = makePuzzleWorld({ levels: [BOSS_LEVEL, INFERNO_LEVELS[0]] });
  assert.equal(w.last('puzzleMenu').levels[1].unlocked, false);
  assert.equal(w.eng.startRun(), true);
  w.x.world.boss.defeated = true;
  Object.assign(w.x.world.player, BOSS_LEVEL.artifacts[0]);
  w.advance(50);
  Object.assign(w.x.world.player, BOSS_LEVEL.exit);
  w.advance(50);
  assert.equal(w.eng.getState(), 'story');
  assert.equal(w.last('overlay').phase, 'cutscene');
  assert.equal(w.last('puzzleMenu').levels[1].unlocked, true);
  assert.equal(w.progress.puzzle.levels[BOSS_LEVEL.id].coins, 50);
  const endTime = w.x.world.time;
  w.eng.setDir(1, 0);
  w.advance(1500);
  assert.equal(w.x.world.time, endTime);
  assert.equal(w.rafQueue.size, 0);
  w.eng.startRun();
  assert.equal(w.x.world.level.number, 51);
  assert.equal(w.eng.getState(), 'playing');
  assert.equal(w.progress.puzzle.infernoIntroSeen, true);
  assert.equal(w.eng.startRun(), false);
  w.eng.destroy();
});

test('legacy boss records unlock Inferno without overwriting old room coins', () => {
  const levels = Object.fromEntries(CAMPAIGN_LEVELS.slice(0, 49).map(l => [l.id, { best: 20 }]));
  levels['gen-50'] = { best: 25, coins: 30 };
  const progress = { v: 1, puzzle: { levels } };
  assert.equal(progressLib.isUnlocked(progress, CAMPAIGN_LEVELS, 49), true);
  assert.equal(progressLib.isUnlocked(progress, CAMPAIGN_LEVELS, 50), false);
  levels['gen-51'] = { cleared: true, heist: { bestTimeMs: 140000, stars: 3, revision: 7, loot: 0, fewestAlerts: 0 }, coins: 50 };
  assert.equal(progressLib.isUnlocked(progress, CAMPAIGN_LEVELS, 50), true);
  const w = makePuzzleWorld({ progress, levels: CAMPAIGN_LEVELS });
  assert.equal(w.last('puzzleMenu').selected, 50);
  assert.equal(w.last('puzzleMenu').coins, 80);
  w.eng.startRun();
  assert.equal(w.last('overlay').phase, 'cutscene');
  w.eng.returnToMenu();
  w.eng.startRun();
  assert.equal(w.eng.getState(), 'story');
  w.eng.startRun();
  assert.equal(w.x.world.level.id, 'inferno-51');
  assert.equal(w.progress.puzzle.levels['gen-50'].coins, 30);
  w.eng.destroy();
});

const echo = (x, y) => ({ id: 'echo', kind: 'echo', ...pt(x, y), hearing: 7, strike: 1, windup: 1.2, recover: 3 });

test('the Echo Eater hears running through connected floor but ignores walking and closed walls', () => {
  const open = room({ spawn: pt(2, 2), beasts: [echo(6, 2)] });
  const walk = puzzle.createState(open);
  puzzle.step(walk, { x: 1, gait: 'walk' });
  assert.equal(walk.beasts[0].state, 'IDLE');
  const run = puzzle.createState(open);
  puzzle.step(run, { x: 1, gait: 'run' });
  assert.equal(run.beasts[0].state, 'TELEGRAPH');
  const mark = { ...run.beasts[0].mark };
  advance(run, .35, { y: 1, gait: 'run' });
  assert.deepEqual(run.beasts[0].mark, mark);
  let blocked = open;
  for (let y = 1; y < open.height - 1; y++) blocked = withWall(blocked, 4, y);
  const wall = puzzle.createState(blocked);
  puzzle.step(wall, { x: 1, gait: 'run' });
  assert.equal(wall.beasts[0].state, 'IDLE');
});

test('a real stone throw can feed the Echo Eater an unsuspecting corrupted guard', () => {
  const s = puzzle.createState(room({
    spawn: pt(2, 4), beasts: [echo(9, 4)],
    guards: [guard(5, 4, { corrupted: true, range: 0, pause: 20 })],
  }));
  s.player.facing = 0;
  assert.equal(puzzle.action(s, 'gadget'), true);
  puzzle.step(s, {});
  const b = s.beasts[0];
  assert.equal(b.state, 'TELEGRAPH');
  assert.ok(b.mark.x > s.guards[0].x && b.mark.x - s.guards[0].x < 1);
  advance(s, 1.5);
  assert.equal(s.guards[0].deathReason, 'devoured');
  assert.equal(b.meals, 1);
  assert.equal(s.status, 'playing');
});

test('Raja Bara can be defeated through all five phases and pays the locked crown', () => {
  assert.equal(bossHp(BOSS_LEVEL), 26);
  assert.equal(bossHp(INFERNO_BOSS), 34);
  const { s, skills, phases } = playBoss(INFERNO_BOSS, { limit: 540 });
  assert.equal(s.status, 'won', JSON.stringify({ time: s.time, phase: s.boss.phase, hp: s.boss.hp, lives: s.boss.lives, message: s.message }));
  assert.deepEqual([...phases], [1, 2, 3, 4, 5]);
  assert.ok(skills.has('fissures') && skills.has('eruption'));
  assert.equal(s.boss.hits, 34);
  assert.equal(s.result.coinReward, 100);
});

test('Inferno uses separate music and increases the Raja Bara danger stem without restarting it', () => {
  assert.equal(audioScene({ mode: 'puzzle', puzzle: { chapter: 'inferno' } }).key, 'inferno');
  const scene = (phase, stage) => audioScene({ mode: 'puzzle', running: true, puzzle: { chapter: 'inferno', boss: { phase, stage } } });
  const first = scene(1, 'GAP'), final = scene(5, 'ACTIVE');
  assert.equal(first.key, 'infernoBoss');
  assert.equal(final.key, first.key);
  assert.equal(final.variation, first.variation);
  assert.ok(final.intensity > first.intensity);
  assert.equal(scene(5, 'DEFEATED').key, 'inferno');
});
