import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { campaign, geometry, root } from './helpers/env.mjs';

const read = name => import(pathToFileURL(root + '/node_modules/.cache/snake-tests/' + name + '.mjs'));
const { createStoryGame } = await read('story/controller');
const { CINEMATICS, ARENA_TRANSITION_MS, ARRIVAL_MS } = await read('puzzle/cinematics');
const { EXPEDITION_STAGES } = await read('expedition/story-world');
const { freshSave, parseSave } = await read('expedition/progress');
const { beginEncounter, hitEnemy, defeat } = await read('expedition/combat');
const { bindGeometry } = await read('expedition/world');
const { action, chooseAbility } = await read('expedition/sim');
const movieTime = key => ARENA_TRANSITION_MS + CINEMATICS[key].frames.reduce((n, shot) => n + shot.ms, 0);

function play({ completed = 0 } = {}) {
  const levels = Object.fromEntries(campaign.CAMPAIGN_LEVELS.slice(0, completed).map(l => [l.id, { best: 1 }]));
  let dungeon = { v: 1, puzzle: { levels } }, expedition, now = 1000, sequence = 0;
  const rafs = new Map(), ctx = new Proxy({}, { get: (t, k) => t[k] || (() => {}), set: (t,k,v) => { t[k]=v; return true; } });
  const last = {}, inspected = {};
  const game = createStoryGame({
    canvas: { width: 680, height: 600, getContext: () => ctx },
    onUpdate: patch => Object.assign(last, patch),
    inspect: (chapter, value) => { inspected[chapter] = value; },
    now: () => now,
    raf: cb => { const id = ++sequence; rafs.set(id, cb); return id; },
    caf: id => rafs.delete(id),
    dungeonIO: { load: () => dungeon, save: value => { dungeon = value; return true; } },
    expeditionIO: { load: () => expedition, save: value => { assert.ok(parseSave(JSON.stringify(value), true)); expedition = value; return true; } },
  });
  return { game, last, inspected, get dungeon() { return dungeon; }, get expedition() { return expedition; }, advance(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(now + 50, end);
      const queue = [...rafs.values()]; rafs.clear();
      for (const cb of queue) cb(now);
    }
  } };
}

test('Story starts with the apple theft comic, opens Dungeon automatically and locks Expedition', () => {
  const w = play();
  assert.equal(w.game.setStoryChapter('expedition'), false);
  assert.equal(w.game.startRun(), true);
  assert.equal(w.last.overlay.cinematic, 'opening');
  w.advance(movieTime('opening') + 50);
  assert.equal(w.game.getState(), 'arrival');
  assert.equal(w.dungeon.puzzle.storyOpeningSeen, true);
  w.advance(ARRIVAL_MS);
  assert.equal(w.game.getState(), 'playing');
  assert.equal(w.inspected.dungeon.world.level.number, 1);
  w.game.destroy();
});

test('Dungeon 100 saves Raja Bara, then the comic hands off to the first Expedition level', () => {
  const w = play({ completed: 99 });
  assert.equal(w.game.startRun(), true);
  const dungeon = w.inspected.dungeon.world;
  assert.equal(dungeon.level.number, 100);
  dungeon.boss.defeated = true;
  Object.assign(dungeon.player, dungeon.level.artifacts[0]);
  w.advance(50);
  Object.assign(dungeon.player, dungeon.level.exit);
  w.advance(50);
  assert.equal(w.last.overlay.cinematic, 'ascentStory');
  assert.ok(w.dungeon.puzzle.levels['inferno-100']);
  w.advance(movieTime('ascentStory') + 100);
  assert.equal(w.game.chapterKind(), 'roguelite');
  assert.equal(w.game.getState(), 'playing');
  assert.equal(w.last.roguelite.storyLevel, 1);
  assert.equal(w.dungeon.puzzle.storyExpeditionSeen, true);
  const first = w.inspected.expedition.world;
  first.player.hp = 77;
  for (const enemy of first.enemies) defeat(first, enemy);
  Object.assign(first.player, EXPEDITION_STAGES[0].exit);
  assert.equal(w.game.action('interact'), true);
  assert.equal(w.game.getState(), 'won');
  assert.equal(w.game.startRun(), true);
  assert.equal(w.last.roguelite.storyLevel, 2);
  assert.equal(w.expedition.current.player.hp, 77);
  w.game.returnToMenu();
  assert.equal(w.game.setStoryChapter('dungeon'), true);
  assert.equal(w.game.setStoryChapter('expedition'), true);
  assert.equal(w.last.roguelite.storyLevel, 2);
  w.game.destroy();
});

test('all 20 authored stages round-trip saves and have a reachable exit after their objectives', () => {
  assert.deepEqual(EXPEDITION_STAGES.map(w => w.region), [...Array(10).fill(0), ...Array(10).fill(1)]);
  assert.equal(new Set(EXPEDITION_STAGES.map(w => w.map.join('\n'))).size, 20);
  for (const stage of EXPEDITION_STAGES) {
    const save = freshSave(stage.number), s = save.current;
    assert.ok(parseSave(JSON.stringify(save), true), stage.id);
    assert.ok(!parseSave(JSON.stringify(save)), stage.id);
    for (const encounter of stage.encounters) {
      assert.notEqual(geometry.findPath(bindGeometry(s), s.player, encounter.shrine), null);
      const enemy = s.enemies.find(e => e.id === encounter.id);
      assert.equal(beginEncounter(s, enemy), true);
      if (enemy.type === 'larry') {
        for (let phase = 1; phase <= 3; phase++) {
          assert.equal(enemy.phase, phase);
          enemy.stage = 'recover'; enemy.hp = enemy.maxHp;
          assert.ok(hitEnemy(s, enemy, enemy.maxHp));
        }
      } else defeat(s, enemy);
      if (s.offer.length) assert.ok(chooseAbility(s, s.offer[0]));
    }
    for (const enemy of s.enemies.filter(e => e.kind === 'mob')) defeat(s, enemy);
    assert.notEqual(geometry.findPath(bindGeometry(s), s.player, stage.exit), null, stage.id);
    Object.assign(s.player, stage.exit);
    assert.equal(action(s, 'interact'), true, stage.id);
    assert.equal(s.status, 'won', stage.id);
    assert.ok(parseSave(JSON.stringify(save), true), stage.id);
    if (stage.number === 20) assert.match(s.message, /Apel emas kembali/);
  }
});
