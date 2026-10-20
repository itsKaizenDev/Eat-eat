import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './helpers/env.mjs';

const MODES = ['classic', 'portal', 'timeattack', 'classicnight', 'mayhem', 'mayhemplus', 'mayhemhard', 'impossible', 'multiplayer', 'mayhemduo'];
const EFFECTS = ['fast', 'slow', 'shrink', 'swarm', 'teleport', 'dark', 'bomb', 'reverse'];
const D = [[0, -1], [0, 1], [-1, 0], [1, 0]];

// Regresi 10 mode: input & efek acak, banyak seed. Invarian yang dijaga:
// tidak melempar error, hasil akhir di-emit paling banyak sekali per ronde,
// dan setelah ronde berakhir tidak ada gerakan/suara/overlay tambahan.
for (const mode of MODES) {
  test(`fuzz ${mode}: invarian lifecycle & dunia`, () => {
    for (let seed = 1; seed <= 6; seed++) {
      const w = makeWorld(mode, { seed, speed: seed % 2 ? 'ngebut' : 'normal' });
      const mp = mode === 'multiplayer' || mode === 'mayhemduo';
      w.eng.startRun();
      const pick = (n) => Math.floor(((seed * 7919 + w.t * 31) % 1000) / 1000 * n);
      let ended = false, frozenHead = null, frozenDeath = 0;
      for (let i = 0; i < 1500; i++) {
        if (i % 7 === 0) { const d = D[(i * 13 + seed) % 4]; if (mp) w.eng.setDirMP(i % 2, d[0], d[1]); else w.eng.setDir(d[0], d[1]); }
        if (i % 120 === 60 && w.eng.getState() === 'playing' && !mp && mode !== 'classic' && mode !== 'portal' && mode !== 'timeattack' && mode !== 'classicnight') w.x.triggerEffect(EFFECTS[(i / 120 + seed) % EFFECTS.length | 0]);
        if (i === 500 && w.eng.getState() === 'playing') { w.eng.pauseRun('user'); w.advance(3000); w.eng.resumeRun(); }
        w.advance(16);
        const st = w.eng.getState();
        if (!mp && st === 'playing') {
          const b = w.x.borderInset;
          w.x.snake.forEach(c => assert.ok(c.x >= -1 && c.x <= 17 && c.y >= -1 && c.y <= 15, 'ular dalam jangkauan wajar'));
          assert.ok(w.x.foods.length > 0 && w.x.foods.length <= 6, 'jumlah makanan wajar');
          assert.ok(b >= 0 && b <= 3);
        }
        if (st === 'won' || st === 'lost') {
          if (!ended) { ended = true; frozenHead = JSON.stringify(mp ? w.x.players.map(p => p.snake) : w.x.snake); frozenDeath = w.calls.death; }
          else { assert.equal(JSON.stringify(mp ? w.x.players.map(p => p.snake) : w.x.snake), frozenHead, 'dunia membeku setelah ronde berakhir'); assert.equal(w.calls.death, frozenDeath); }
          break;
        }
      }
      assert.ok(w.overlays('gameover').length <= 1, `${mode}/${seed}: hasil di-emit ${w.overlays('gameover').length}x`);
      if (ended) { w.advance(10000); assert.equal(w.overlays('gameover').length, 1); assert.equal(w.calls.death, frozenDeath); }
      w.eng.destroy();
    }
  });
}
