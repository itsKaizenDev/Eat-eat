'use client';
import gsap from 'gsap';
import { COLS, ROWS, EFFECTS, SHRINK, MODE_NAMES, colorForKind } from './constants';
import { createSimClock } from './sim/clock';
import { cellKey, sameCell, isOpposite, inBounds, pickFreeCell, bodyAfterMove, findSpawn } from './sim/grid';
import { loadBest, saveBest, SPEEDS, TA_DURATIONS } from './storage';

// Mesin game Snake (canvas imperative). Tahap 1–2:
//  - lifecycle eksplisit: startRun / pauseRun / resumeRun / releasePause / returnToMenu / destroy
//  - semua deadline gameplay memakai jam simulasi (membeku saat pause)
//  - langkah game dijadwalkan dari RAF terhadap jam simulasi (tanpa setInterval)
//  - tick single-player & 2P bersifat transaksional (snapshot -> collision bersama -> commit -> hasil sekali)
//  - RNG & jam dapat diinjeksi (opsi `rng`, `now`) untuk test deterministik
// State simulasi tetap mutable biasa (bukan React state).
export function createSnakeGame({ canvas, sounds, onUpdate, rng, now: nowFn, inspect }) {
  const ctx = canvas.getContext('2d');
  let cell = canvas.width / COLS;
  const rand = rng || (() => Math.random());
  const realNow = nowFn || (() => performance.now());
  const clock = createSimClock(realNow);

  const BLOCKERS = ['help', 'orientation', 'hidden']; // alasan pause yang tidak bisa dilepas lewat tombol Lanjut
  let mode = 'classic';
  // 'menu' | 'playing' | 'paused' | 'won' | 'lost'
  let state = 'menu';
  const pauseReasons = new Set();
  let snake, prevSnake, dir, inputQueue = [], foods = [], lastTick = 0, nextTickAt = 0, curInterval = 140, score, speed, tongueT = 0, portalRot = 0;
  let speedMult = 1, borderInset = 0, poisonSwarm = false, canTeleport = false, activeEffects = [], nearWallWarned = false, darkVeilActive = false;
  let bombTiles = [];
  let players = [], taEndAt = 0, lastTimerText = null;
  let swallows = [], warps = [], pops = [];
  let speedPref = 'normal', taDuration = 90;
  const NIGHT_PAL = { a: '#16283a', b: '#1a2f44', out: '#2f9e5b', inn: '#5fe08a', head: '#c9ffd9' };
  // Penyempitan arena Hard/Impossible dihitung oleh simulasi (jam simulasi), bukan GSAP.
  let inset = { v: 0, from: 0, to: 0, t0: 0, dur: 0, ease: 'linear', widening: false };
  let reversed = false;
  function isHard() { return mode === 'mayhemhard' || mode === 'impossible'; }
  function isMayhem() { return mode === 'mayhem' || mode === 'mayhemplus' || isHard(); }
  function isNight() { return mode === 'classicnight'; }
  function isMP() { return mode === 'multiplayer' || mode === 'mayhemduo'; }
  function isActive() { return state === 'playing' || state === 'paused'; }
  function speedFor(sc) {
    const pref = mode === 'impossible' ? 'ngebut' : speedPref;
    if (pref === 'santai') return Math.max(110, 180 - Math.floor(sc / 4) * 4);
    if (pref === 'ngebut') return Math.max(50, 100 - Math.floor(sc / 3) * 6);
    if (pref === 'konstan') return 140;
    return Math.max(60, 140 - Math.floor(sc / 4) * 8);
  }
  // Satu sumber kebenaran untuk interval langkah: dipakai simulasi DAN interpolasi.
  function effInterval() { return Math.max(35, speed * speedMult); }
  function retime() { curInterval = effInterval(); nextTickAt = lastTick + curInterval; }

  let best = loadBest(), bestDirty = false;
  let rafId = null;
  let destroyed = false;

  const SPRITE_SRC = {
    normal: '/assets/game/apple-normal.png',
    big: '/assets/game/apple-big.png',
    poison: '/assets/game/apple-poison.png',
    lucky: '/assets/game/apple-lucky.png',
    teleport: '/assets/game/apple-teleport.png',
    dark: '/assets/game/apple-dark.png',
    bomb: '/assets/game/apple-bomb.png',
    time: '/assets/game/apple-time.png',
    bombTile: '/assets/game/bomb.png',
    portal: '/assets/game/portal.png',
  };
  const sprites = {};
  Object.entries(SPRITE_SRC).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    sprites[key] = img;
  });
  function spriteReady(img) { return img && img.complete && img.naturalWidth > 0; }

  function emit(patch) { if (!destroyed) onUpdate(patch); }

  function foodCountFor(m) { return (m === 'mayhemplus' || m === 'mayhemhard' || m === 'impossible') ? 6 : (m === 'multiplayer' || m === 'mayhemduo') ? 5 : 4; }

  function bounds() { return { minX: borderInset, maxX: COLS - 1 - borderInset, minY: borderInset, maxY: ROWS - 1 - borderInset }; }

  function setMode(m) { mode = m; }

  // Sel yang tidak boleh dipakai spawn: tubuh aktif (sesuai mode), makanan, ranjau.
  function occupied() {
    const s = new Set();
    if (isMP()) players.forEach(p => { if (p.alive) p.snake.forEach(c => s.add(cellKey(c.x, c.y))); });
    else if (snake) snake.forEach(c => s.add(cellKey(c.x, c.y)));
    foods.forEach(f => s.add(cellKey(f.x, f.y)));
    bombTiles.forEach(t => s.add(cellKey(t.x, t.y)));
    return s;
  }

  function killVisualTweens() {
    swallows.forEach(o => gsap.killTweensOf(o)); warps.forEach(o => gsap.killTweensOf(o)); pops.forEach(o => gsap.killTweensOf(o));
    foods.forEach(f => gsap.killTweensOf(f.scale));
    gsap.killTweensOf(canvas);
    gsap.set(canvas, { x: 0 });
  }

  // Menyiapkan dunia baru (tidak mengubah `state`).
  function reset() {
    killVisualTweens();
    snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
    prevSnake = snake.map(s => ({ ...s }));
    dir = { x: 1, y: 0 }; inputQueue = [];
    score = 0; speed = speedFor(0); swallows = []; warps = []; pops = []; bombTiles = [];
    inset = { v: 0, from: 0, to: 0, t0: 0, dur: 0, ease: 'linear', widening: false };
    reversed = false; speedMult = 1; borderInset = 0; poisonSwarm = false; canTeleport = false; activeEffects = []; nearWallWarned = false; darkVeilActive = false;
    pauseReasons.clear(); taEndAt = 0; lastTimerText = null;
    curInterval = effInterval(); lastTick = 0; nextTickAt = 0;
    if (isMP()) initMultiplayer();
    foods = [];
    const fc = foodCountFor(mode);
    for (let i = 0; i < fc; i++) { const slot = (isMayhem() && mode !== 'mayhem' && i < 2) ? 'forced' : 'random'; addFood(slot); }
    emitFullState();
  }

  function taLeft() { return taEndAt > 0 ? Math.max(0, taEndAt - clock.now()) : taDuration * 1000; }

  function emitFullState() {
    const t = mode === 'timeattack' ? fmtTime(taLeft()) : null;
    lastTimerText = t;
    emit({
      score, best, modeLabel: 'Snake · ' + MODE_NAMES[mode], mode,
      effects: activeEffects.map(e => ({ type: e.type, label: e.label, t: e.timed ? Math.max(0, Math.ceil(Math.min(e.holdMs == null ? Infinity : e.holdMs, e.endsAt - clock.now()) / 1000)) + 's' : '' })),
      mpHud: isMP() ? mpHudData() : null,
      timerText: t,
      running: isActive(), paused: state === 'paused',
      puzzle: null, puzzleMenu: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
    });
  }

  function fmtTime(ms) { const s = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  function mpHudData() {
    return {
      p1Label: players[0] ? players[0].label + ': ' + players[0].score : '',
      p1Lives: players[0] ? players[0].lives : 0,
      p2Label: players[1] ? players[1].label + ': ' + players[1].score : '',
      p2Lives: players[1] ? players[1].lives : 0,
    };
  }

  function initMultiplayer() {
    const b = bounds();
    players = [
      { id: 'P1', label: 'P1 (Panah)', color: '#4f7d17', inner: '#5f9c22', snake: [{ x: b.minX + 4, y: 7 }, { x: b.minX + 3, y: 7 }, { x: b.minX + 2, y: 7 }], dir: { x: 1, y: 0 }, score: 0, lives: 3, alive: true, respawnAt: 0, respawnTries: 0 },
      { id: 'P2', label: 'P2 (WASD)', color: '#2f6f8f', inner: '#3f92bf', snake: [{ x: b.maxX - 4, y: 7 }, { x: b.maxX - 3, y: 7 }, { x: b.maxX - 2, y: 7 }], dir: { x: -1, y: 0 }, score: 0, lives: 3, alive: true, respawnAt: 0, respawnTries: 0 },
    ];
    players.forEach(p => { p.queue = []; p.prevSnake = p.snake.map(s => ({ ...s })); });
  }

  function rollKind() {
    if (mode === 'mayhemduo') { const r = rand(); if (r < 0.05) return 'teleport'; if (r < 0.10) return 'bomb'; if (r < 0.28) return 'poison'; if (r < 0.38) return 'big'; if (r < 0.46) return 'lucky'; return 'normal'; }
    if (mode === 'timeattack' && rand() < 0.14) return 'time';
    if (mode === 'multiplayer') { const r = rand(); if (r < 0.18) return 'poison'; if (r < 0.3) return 'big'; return 'normal'; }
    if (poisonSwarm && rand() < 0.85) return 'poison';
    if (isMayhem()) {
      const rt = rand();
      if (rt < 0.05) return 'teleport';
      if (rt < 0.09) return 'bomb';
      if (rt < 0.13) return 'dark';
      const plus = mode !== 'mayhem', imp = mode === 'impossible';
      const pPoison = imp ? 0.4 : plus ? 0.34 : 0.26, pBig = plus ? 0.13 : 0.09, pLucky = imp ? 0.16 : plus ? 0.11 : 0.06;
      const r = rand();
      if (r < pPoison) return 'poison';
      if (r < pPoison + pBig) return 'big';
      if (r < pPoison + pBig + pLucky) return 'lucky';
    }
    return 'normal';
  }

  // Mengembalikan makanan baru, atau null kalau tidak ada sel bebas. Tidak pernah looping tanpa batas.
  function spawnFood(slot) {
    slot = slot || 'random';
    const p = pickFreeCell(bounds(), occupied(), rand);
    if (!p) return null;
    const kind = slot === 'forced' ? (rand() < 0.5 ? 'poison' : 'big') : rollKind();
    const timed = kind === 'poison' || kind === 'big' || kind === 'lucky' || kind === 'teleport' || kind === 'bomb' || kind === 'dark' || kind === 'time';
    const dur = (mode === 'impossible' ? 0.75 : 1) * (kind === 'big' ? 3400 + rand() * 2000 : 2600 + rand() * 1800);
    const t = clock.now();
    const f = { x: p.x, y: p.y, kind, slot, scale: { v: 0.4 }, expiresAt: timed ? t + dur : null, disguised: isHard() && kind === 'poison', revealUntil: t + 450, expiring: 0, expiringFrom: 1 };
    gsap.to(f.scale, { v: 1, duration: 0.28, ease: 'back.out(2.2)' }); // visual saja
    return f;
  }
  function addFood(slot) { const f = spawnFood(slot); if (f) foods.push(f); return f; }

  // Makanan kadaluarsa: mengecil (dihitung dari jam simulasi), lalu diganti.
  function checkFoodExpiry(now) {
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      if (f.expiring) {
        const t = (now - f.expiring) / 220;
        if (t >= 1) { foods.splice(i, 1); addFood(f.slot); }
        else f.scale.v = Math.max(0, f.expiringFrom * (1 - t));
      } else if (f.expiresAt && now > f.expiresAt) {
        f.expiring = Math.max(1, now); f.expiringFrom = f.scale.v; gsap.killTweensOf(f.scale);
      }
    }
  }

  function checkBombExpiry(now) {
    for (let i = bombTiles.length - 1; i >= 0; i--) { if (now > bombTiles[i].expiresAt) bombTiles.splice(i, 1); }
  }

  function startInset(to, durMs, ease) { inset.from = inset.v; inset.to = to; inset.t0 = clock.now(); inset.dur = durMs; inset.ease = ease; }

  function relocateOutsideFoods() {
    const b = bounds();
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      if (!inBounds(f, b)) { const slot = f.slot; foods.splice(i, 1); addFood(slot); }
    }
  }

  function recomputeEffects() {
    let sm = 1, bi = 0, ps = false, tp = false, dk = false, rv = false;
    activeEffects.forEach(e => {
      if (e.type === 'fast') sm *= 0.6;
      if (e.type === 'slow') sm *= 1.7;
      if (e.type === 'reverse') rv = true;
      if (e.type === 'swarm') ps = true;
      if (e.type === 'teleport') tp = true;
      if (e.type === 'dark') dk = true;
    });
    speedMult = sm; poisonSwarm = ps; canTeleport = tp; darkVeilActive = dk; reversed = rv;
    // Arena dikendalikan satu mekanisme untuk semua mode: ubin demi ubin menyempit, lalu melebar saat efek habis.
    borderInset = Math.floor(inset.v);
    if (!activeEffects.some(e => e.type === 'shrink') && inset.v > 0 && !inset.widening) {
      inset.widening = true; startInset(0, SHRINK.widenMs, 'inout');
    }
  }

  function triggerEffect(type) {
    const d = EFFECTS[type];
    activeEffects = activeEffects.filter(e => e.type !== type);
    // Shrink: waktu efek = sisa animasi menyempit (1 ubin / SHRINK.tileMs) + lama bertahan (d.dur). HUD hanya menampilkan lama bertahan.
    const shrinkLead = type === 'shrink' ? (SHRINK.maxInset - inset.v) * SHRINK.tileMs : 0;
    activeEffects.push({ type, label: d.label, endsAt: clock.now() + shrinkLead + d.dur, timed: d.timed, holdMs: type === 'shrink' ? d.dur : null });
    if (type === 'nerf') { snake = snake.slice(0, Math.min(2, snake.length)); score = Math.max(0, score - 3); if (snake.length < 1) return gameOver(); }
    if (type === 'buff') { const tail = { ...snake[snake.length - 1] }; for (let i = 0; i < 10; i++) snake.push({ ...tail }); score += 5; bumpBest(); }
    if (type === 'shrink') { inset.widening = false; startInset(SHRINK.maxInset, shrinkLead, 'linear'); }
    recomputeEffects();
    retime();
    emitFullState();
  }

  function updateInset(now) {
    if (inset.dur > 0) {
      const t = Math.min(1, (now - inset.t0) / inset.dur);
      const e = inset.ease === 'inout' ? (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)) : t;
      inset.v = inset.from + (inset.to - inset.from) * e;
      if (t >= 1) { inset.dur = 0; if (inset.to === 0) inset.widening = false; }
    }
    const ni = Math.floor(inset.v);
    if (ni === borderInset) return;
    const grow = ni > borderInset; borderInset = ni;
    if (grow) relocateOutsideFoods();
  }

  function revertEffectIfExpired(now) {
    const before = activeEffects.length;
    activeEffects = activeEffects.filter(e => now <= e.endsAt);
    if (activeEffects.length !== before) { recomputeEffects(); retime(); }
  }

  function bumpBest() { if (score > best) { best = score; bestDirty = true; } }
  function persistBest() { if (bestDirty) { saveBest(best); bestDirty = false; } }

  function wrapWithInset(v, lo, hi) { const w = hi - lo + 1; return lo + (((v - lo) % w) + w) % w; }

  function addWarp(a, b) {
    const w = { a, b, prog: 0 };
    warps.push(w);
    gsap.to(w, { prog: 1, duration: 0.4, ease: 'power1.out', onComplete: () => { warps = warps.filter(x => x !== w); } });
  }

  function plantBombs(n) {
    for (let i = 0; i < n; i++) {
      const p = pickFreeCell(bounds(), occupied(), rand);
      if (!p) break;
      bombTiles.push({ x: p.x, y: p.y, hits: 0, expiresAt: clock.now() + 30000 });
    }
  }

  function tick() {
    if (state !== 'playing') return;
    prevSnake = snake.map(s => ({ ...s }));
    if (inputQueue.length) dir = inputQueue.shift();
    let hx = snake[0].x + dir.x, hy = snake[0].y + dir.y;
    const b = bounds();
    const outOfBounds = hx < b.minX || hx > b.maxX || hy < b.minY || hy > b.maxY;
    if (isMayhem() && !canTeleport) {
      const atEdge = !outOfBounds && (hx === b.minX || hx === b.maxX || hy === b.minY || hy === b.maxY);
      if (atEdge && !nearWallWarned) { sounds.playEits(); nearWallWarned = true; }
      else if (!atEdge) nearWallWarned = false;
    }
    if (outOfBounds) {
      if (mode === 'portal' || canTeleport) {
        const nx = wrapWithInset(hx, b.minX, b.maxX), ny = wrapWithInset(hy, b.minY, b.maxY);
        addWarp({ x: snake[0].x, y: snake[0].y }, { x: nx, y: ny });
        hx = nx; hy = ny;
      } else return gameOver();
    }
    const head = { x: hx, y: hy };
    const fi = foods.findIndex(f => f.x === head.x && f.y === head.y);
    // Aturan ekor: kalau ular tidak tumbuh di langkah ini, sel ekor dilepas di langkah yang sama.
    if (bodyAfterMove(snake, fi !== -1).some(s => s.x === head.x && s.y === head.y)) return gameOver();
    snake.unshift(head);

    const bi = bombTiles.findIndex(t => t.x === head.x && t.y === head.y);
    if (bi !== -1) { bombTiles.splice(bi, 1); return gameOver('bomb'); }

    if (fi !== -1) {
      const eaten = foods[fi];
      const ek = eaten.kind;
      const sw = { prog: 0, kind: ek };
      swallows.push(sw);
      gsap.to(sw, { prog: 1, duration: 0.5, ease: 'power2.in', onComplete: () => { swallows = swallows.filter(x => x !== sw); } });
      const pop = { x: eaten.x, y: eaten.y, kind: ek, r: 0.15, a: 1 };
      pops.push(pop);
      gsap.to(pop, { r: 1.4, a: 0, duration: 0.4, ease: 'power2.out', onComplete: () => { pops = pops.filter(x => x !== pop); } });
      foods.splice(fi, 1); addFood(eaten.slot);
      sounds.playChomp();

      if (ek === 'poison') {
        let removed = 0; const cut = isHard() ? Math.ceil(snake.length / 2) : 3; while (removed < cut && snake.length > 1) { snake.pop(); removed++; }
        score = Math.max(0, score - 2);
        if (snake.length <= 1) return gameOver('poison');
      } else if (ek === 'lucky') {
        score += 1; bumpBest();
        const pool = mode === 'impossible' ? ['fast', 'shrink', 'swarm', 'nerf', 'reverse'] : isHard() ? ['fast', 'slow', 'shrink', 'swarm', 'nerf', 'buff', 'reverse'] : ['fast', 'slow', 'shrink', 'swarm', 'nerf', 'buff'];
        triggerEffect(pool[Math.floor(rand() * pool.length)]);
      } else if (ek === 'teleport') {
        score += 1; bumpBest();
        triggerEffect('teleport');
      } else if (ek === 'bomb') {
        score += 1; bumpBest();
        plantBombs(4);
        triggerEffect('bomb');
      } else if (ek === 'time') {
        score += 1; bumpBest();
        taEndAt += 2000;
        triggerEffect('timebonus');
      } else if (ek === 'dark') {
        score += 1; bumpBest();
        triggerEffect('dark');
      } else {
        score += ek === 'big' ? 3 : 1; bumpBest();
      }
    } else { snake.pop(); }
    if (state !== 'playing') return;
    // Kebijakan speed tunggal: setiap perubahan skor mengikuti speedFor (Konstan tetap konstan).
    speed = speedFor(score);
    retime();
    emitFullState();
  }

  function shakeCanvas() {
    gsap.timeline()
      .to(canvas, { x: -8, duration: 0.05, ease: 'power1.inOut' })
      .to(canvas, { x: 7, duration: 0.05, ease: 'power1.inOut' })
      .to(canvas, { x: -5, duration: 0.05, ease: 'power1.inOut' })
      .to(canvas, { x: 3, duration: 0.05, ease: 'power1.inOut' })
      .to(canvas, { x: 0, duration: 0.05, ease: 'power1.inOut' });
  }

  // Akhir ronde: idempoten. Hasil, suara kematian, dan penyimpanan skor terjadi sekali saja.
  function endRun(finalState, overlay, opts) {
    if (!isActive()) return false;
    const o = opts || {};
    state = finalState; clock.stop(); pauseReasons.clear(); persistBest();
    if (o.death) { sounds.playDeath(o.reason); shakeCanvas(); }
    emitFullState();
    emit({ overlay });
    return true;
  }

  function gameOver(reason) {
    return endRun('lost', { phase: 'gameover', mood: reason === 'poison' ? 'sick' : 'shock', title: 'Game Over', sub: 'Skor: ' + score + ' — pilih mode & main lagi', btnText: 'Main Lagi' }, { death: true, reason });
  }

  function timeUp() {
    return endRun('won', { phase: 'gameover', mood: 'dizzy', title: 'Waktu Habis!', sub: 'Skor akhir: ' + score + ' — pilih mode & main lagi', btnText: 'Main Lagi' });
  }

  function endMultiplayer(winner) {
    const title = winner ? (winner.label + ' Menang!') : 'Seri!';
    return endRun('won', { phase: 'gameover', mood: winner ? 'win' : 'dizzy', title, sub: 'P1: ' + players[0].score + ' • P2: ' + players[1].score, btnText: 'Main Lagi' });
  }

  // Aturan hasil 2P (sekali per tick): skor >= 50 menang; kalau keduanya tembus di tick yang sama,
  // skor lebih tinggi menang, sama = seri. Selain itu, pemain yang tersisa menang; semua habis = seri.
  function decideMultiplayerResult() {
    const reached = players.filter(p => p.score >= 50);
    if (reached.length) {
      reached.sort((a, b) => b.score - a.score);
      const winner = reached.length === 1 || reached[0].score > reached[1].score ? reached[0] : null;
      return endMultiplayer(winner);
    }
    const alive = players.filter(p => p.alive);
    if (alive.length <= 1) return endMultiplayer(alive[0] || null);
  }

  function tryRespawn(p, now) {
    const b = bounds();
    const home = p.id === 'P1' ? { x: 1, y: 0 } : { x: -1, y: 0 };
    const homeX = p.id === 'P1' ? b.minX + 4 : b.maxX - 4;
    const spot = findSpawn(b, occupied(), [home, { x: -home.x, y: 0 }], homeX, 7);
    if (spot) {
      p.snake = spot.snake; p.prevSnake = p.snake.map(s => ({ ...s }));
      p.dir = spot.dir; p.queue = []; p.respawnAt = 0; p.respawnTries = 0;
      return;
    }
    p.respawnTries++;
    if (p.respawnTries === 10) bombTiles = []; // retry terbatas: bersihkan ranjau sekali sebelum menyerah
    if (p.respawnTries > 12) { p.alive = false; p.respawnAt = 0; return; }
    p.respawnAt = now + 300;
  }

  // Tick 2P transaksional: snapshot -> niat gerak -> collision bersama -> commit -> hasil sekali.
  function tickMultiplayer() {
    if (state !== 'playing') return;
    const now = clock.now();
    const justRespawned = new Set();
    players.forEach(p => { if (p.alive && p.respawnAt && now >= p.respawnAt) { tryRespawn(p, now); if (!p.respawnAt) justRespawned.add(p); } });
    const acting = players.filter(p => p.alive && !p.respawnAt && p.snake.length && !justRespawned.has(p));
    const b = bounds();
    const plan = acting.map(p => {
      p.prevSnake = p.snake.map(s => ({ ...s }));
      if (p.queue.length) p.dir = p.queue.shift();
      const h = { x: p.snake[0].x + p.dir.x, y: p.snake[0].y + p.dir.y };
      let wall = false;
      if (!inBounds(h, b)) { if (canTeleport) { h.x = wrapWithInset(h.x, b.minX, b.maxX); h.y = wrapWithInset(h.y, b.minY, b.maxY); } else wall = true; }
      const fi = wall ? -1 : foods.findIndex(f => f.x === h.x && f.y === h.y);
      return { p, h, wall, growing: fi !== -1, dead: false, bomb: false };
    });
    plan.forEach(e => {
      let dead = e.wall;
      if (!dead && bodyAfterMove(e.p.snake, e.growing).some(s => sameCell(s, e.h))) dead = true;
      if (!dead) plan.forEach(o => { if (o !== e && (bodyAfterMove(o.p.snake, o.growing).some(s => sameCell(s, e.h)) || sameCell(o.h, e.h))) dead = true; });
      if (!dead && bombTiles.some(t => sameCell(t, e.h))) { dead = true; e.bomb = true; }
      e.dead = dead;
    });
    if (plan.some(e => e.bomb)) bombTiles = bombTiles.filter(t => !plan.some(e => e.bomb && sameCell(t, e.h)));
    // commit pergerakan
    plan.forEach(e => { if (e.dead) return; e.p.snake.unshift(e.h); if (!e.growing) e.p.snake.pop(); });
    // konsumsi makanan oleh yang selamat
    plan.forEach(e => {
      if (e.dead || !e.growing) return;
      const p = e.p;
      const idx = foods.findIndex(f => sameCell(f, e.h));
      if (idx === -1) return;
      const eaten = foods[idx]; foods.splice(idx, 1); addFood(eaten.slot); sounds.playChomp();
      if (eaten.kind === 'poison') { let r = 0; while (r < 3 && p.snake.length > 1) { p.snake.pop(); r++; } p.score = Math.max(0, p.score - 2); }
      else if (eaten.kind === 'big') { p.score += 3; }
      else if (eaten.kind === 'bomb') { p.score += 1; plantBombs(4); triggerEffect('bomb'); }
      else if (eaten.kind === 'teleport') { p.score += 1; triggerEffect('teleport'); }
      else if (eaten.kind === 'lucky') {
        p.score += 1;
        const r = ['fast', 'slow', 'buff', 'nerf'][Math.floor(rand() * 4)];
        if (r === 'buff') p.score += 5; else if (r === 'nerf') p.score = Math.max(0, p.score - 3); else triggerEffect(r);
      }
      else { p.score += 1; }
    });
    // kematian (suara & guncangan sekali per tick)
    const dead = plan.filter(e => e.dead);
    if (dead.length) {
      sounds.playDeath(); shakeCanvas();
      dead.forEach(e => {
        const p = e.p; p.lives--; p.snake = []; p.queue = [];
        if (p.lives <= 0) p.alive = false; else { p.respawnAt = now + 1200; p.respawnTries = 0; }
      });
    }
    decideMultiplayerResult();
    if (state === 'playing') { retime(); emitFullState(); }
  }

  // ---------- lifecycle ----------
  function startRun() {
    if (state !== 'menu' && state !== 'won' && state !== 'lost') return false; // hanya berhasil sekali
    reset(); clock.reset();
    state = 'playing'; clock.start();
    const t = clock.now();
    lastTick = t; curInterval = effInterval(); nextTickAt = t + curInterval;
    if (mode === 'timeattack') taEndAt = t + taDuration * 1000;
    emit({ overlay: { phase: 'none' } });
    emitFullState();
    return true;
  }

  function pauseRun(reason) {
    reason = reason || 'user';
    if (!isActive()) return false;
    pauseReasons.add('user'); // setelah penghalang lepas, ronde tetap menunggu tindakan lanjut eksplisit
    if (reason !== 'user') pauseReasons.add(reason);
    if (state === 'playing') {
      state = 'paused'; clock.stop();
      emitFullState();
      emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Jeda', sub: 'Tekan Main untuk lanjut', btnText: 'Lanjut' } });
    }
    return true;
  }

  // Melepas satu penghalang (bantuan/tab/orientasi). Tidak melanjutkan permainan.
  function releasePause(reason) { if (reason && reason !== 'user') pauseReasons.delete(reason); }

  // Tindakan lanjut eksplisit. Gagal bila masih ada penghalang lain.
  function resumeRun() {
    if (state !== 'paused') return false;
    if ([...pauseReasons].some(r => BLOCKERS.includes(r))) return false;
    pauseReasons.clear();
    state = 'playing'; clock.start();
    emitFullState();
    emit({ overlay: { phase: 'none' } });
    return true;
  }

  function togglePause() { return state === 'playing' ? pauseRun('user') : state === 'paused' ? resumeRun() : false; }

  function returnToMenu() {
    if (state === 'menu') return;
    persistBest();
    state = 'menu'; clock.reset(); pauseReasons.clear();
    reset();
    emit({ overlay: { phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' } });
  }

  // Pastikan ronde berjalan sebelum input arah dipakai; true kalau input boleh diproses.
  function ensurePlaying() {
    if (state === 'menu' || state === 'won' || state === 'lost') return startRun();
    if (state === 'paused') return resumeRun();
    return state === 'playing';
  }

  function queueDir(q, current, x, y) {
    const last = q.length ? q[q.length - 1] : current;
    if (isOpposite(last, { x, y }) || (last.x === x && last.y === y)) return false;
    if (q.length >= 2) return false;
    q.push({ x, y });
    return true;
  }

  function setDir(x, y) {
    if (isMP()) return;
    if (!ensurePlaying()) return;
    if (reversed) { x = -x; y = -y; }
    if (queueDir(inputQueue, dir, x, y)) sounds.playMove();
  }

  function setDirMP(which, x, y) {
    if (!isMP()) return;
    if (!ensurePlaying()) return;
    const p = players[which];
    if (!p || !p.alive) return;
    if (queueDir(p.queue, p.dir, x, y)) sounds.playMove();
  }


  // ---- drawing (canvas rendering, identik dengan versi single-file lama) ----
  function board() {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = isNight() ? (((x + y) % 2 === 0) ? NIGHT_PAL.a : NIGHT_PAL.b) : (((x + y) % 2 === 0) ? '#a2d149' : '#aad751');
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
    if (borderInset > 0) {
      const b = bounds();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, b.minY * cell);
      ctx.fillRect(0, (b.maxY + 1) * cell, canvas.width, canvas.height - (b.maxY + 1) * cell);
      ctx.fillRect(0, b.minY * cell, b.minX * cell, (b.maxY - b.minY + 1) * cell);
      ctx.fillRect((b.maxX + 1) * cell, b.minY * cell, canvas.width - (b.maxX + 1) * cell, (b.maxY - b.minY + 1) * cell);
    }
    if (!inset.widening && inset.v > 0 && inset.v < 3 && inset.v % 1 > 0.6) { // peringatan: ring merah sebelum ubin berikutnya menutup
      const k = borderInset, n = COLS - 2 * k, m = ROWS - 2 * k;
      ctx.fillStyle = 'rgba(230,60,40,' + (0.25 + 0.2 * Math.sin(realNow() / 90)) + ')';
      ctx.fillRect(k * cell, k * cell, n * cell, cell); ctx.fillRect(k * cell, (ROWS - 1 - k) * cell, n * cell, cell);
      ctx.fillRect(k * cell, (k + 1) * cell, cell, (m - 2) * cell); ctx.fillRect((COLS - 1 - k) * cell, (k + 1) * cell, cell, (m - 2) * cell);
    }
    if (mode === 'portal' || canTeleport) {
      portalRot += 0.02;
      const b = bounds();
      const rings = [[(b.minX + b.maxX + 1) / 2, b.minY], [(b.minX + b.maxX + 1) / 2, b.maxY + 1], [b.minX, (b.minY + b.maxY + 1) / 2], [b.maxX + 1, (b.minY + b.maxY + 1) / 2]];
      const img = sprites.portal;
      rings.forEach(([gx, gy], i) => {
        const cx = gx * cell, cy = gy * cell;
        if (spriteReady(img)) {
          const w = cell * 1.3;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(portalRot * (i % 2 ? 1 : -1));
          ctx.drawImage(img, -w / 2, -w / 2, w, w);
          ctx.restore();
        } else {
          for (let k = 0; k < 3; k++) {
            const rad = cell * (0.55 + k * 0.28);
            ctx.strokeStyle = `rgba(${120 + k * 30},80,220,${0.55 - k * 0.15})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cx, cy, rad, portalRot * (k % 2 ? 1 : -1), portalRot * (k % 2 ? 1 : -1) + Math.PI * 1.4); ctx.stroke();
          }
        }
      });
    }
  }

  function headExpression() {
    let mouthOpen = false, sparkle = false, scared = false;
    if (!snake[0] || !foods.length) return { mouthOpen, sparkle, scared };
    const NEAR_R = 3; let bestD = 999, bestKind = null;
    foods.forEach(f => { const d = Math.max(Math.abs(f.x - snake[0].x), Math.abs(f.y - snake[0].y)); if (d < bestD) { bestD = d; bestKind = f.disguised ? 'normal' : f.kind; } });
    if (bestD <= NEAR_R) {
      if (bestKind === 'normal') { mouthOpen = true; }
      else if (bestKind === 'big') { mouthOpen = true; sparkle = true; }
      else if (bestKind === 'poison' || bestKind === 'bomb' || bestKind === 'dark') { scared = true; }
    }
    return { mouthOpen, sparkle, scared };
  }

  function drawBombTiles() {
    const now = realNow();
    const img = sprites.bombTile;
    bombTiles.forEach(t => {
      const cx = t.x * cell + cell / 2, cy = t.y * cell + cell / 2;
      const pulse = 0.5 + 0.5 * Math.sin(now / 150);
      ctx.fillStyle = `rgba(230,60,40,${0.2 + pulse * 0.2})`;
      ctx.fillRect(t.x * cell, t.y * cell, cell, cell);
      if (spriteReady(img)) {
        const w = cell * (0.8 + pulse * 0.06);
        ctx.drawImage(img, cx - w / 2, cy - w / 2, w, w);
      } else {
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath(); ctx.arc(cx, cy, cell * 0.24, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function drawApple(f) {
    const cx = f.x * cell + cell / 2, cy = f.y * cell + cell / 2;
    let s = f.scale.v * (f.kind === 'big' ? 1.25 : 1);
    let alpha = 1;
    if (f.expiresAt) {
      const remain = f.expiresAt - clock.now();
      if (remain < 1000 && remain > 0) alpha = 0.35 + 0.65 * Math.abs(Math.sin(realNow() / 90));
    }
    const img = sprites[(f.disguised && clock.now() > f.revealUntil) ? 'normal' : f.kind];
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.scale(s, s);
    if (spriteReady(img)) {
      const w = cell * 0.92;
      ctx.drawImage(img, -w / 2, -w / 2, w, w);
    } else {
      // fallback vector kalau sprite belum sempat ke-load
      ctx.fillStyle = colorForKind(f.kind);
      ctx.beginPath(); ctx.arc(0, 0, cell * 0.34, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawPops() {
    pops.forEach(p => {
      const cx = p.x * cell + cell / 2, cy = p.y * cell + cell / 2;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.a);
      ctx.strokeStyle = colorForKind(p.kind); ctx.lineWidth = cell * 0.07;
      ctx.beginPath(); ctx.arc(cx, cy, cell * 0.3 * p.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    });
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function getInterp(t) { return snake.map((s, i) => { const p = prevSnake[i] || s; if (Math.abs(s.x - p.x) > 1 || Math.abs(s.y - p.y) > 1) return { x: s.x, y: s.y }; return { x: lerp(p.x, s.x, t), y: lerp(p.y, s.y, t) }; }); }
  function getInterpFor(snk, prev, t) { return snk.map((s, i) => { const p = prev[i] || s; if (Math.abs(s.x - p.x) > 1 || Math.abs(s.y - p.y) > 1) return { x: s.x, y: s.y }; return { x: lerp(p.x, s.x, t), y: lerp(p.y, s.y, t) }; }); }
  function quadPt(p0, p1, p2, t) { const mt = 1 - t; return { x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x, y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y }; }
  function mixHex(a, b, t) {
    const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    return 'rgb(' + pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',') + ')';
  }

  function draw() {
    if (isMP()) { drawMultiplayer(); return; }
    const prog = state === 'playing' ? Math.min(1, (clock.now() - lastTick) / curInterval) : 1;
    board(); drawBombTiles(); foods.forEach(drawApple); drawPops();

    warps.forEach(w => {
      const img = sprites.portal;
      [w.a, w.b].forEach(p => {
        const cx = p.x * cell + cell / 2, cy = p.y * cell + cell / 2;
        if (spriteReady(img)) {
          const size = cell * (0.5 + w.prog * 1.3);
          ctx.save(); ctx.globalAlpha = 1 - w.prog;
          ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
          ctx.restore(); ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = `rgba(160,90,230,${1 - w.prog})`; ctx.lineWidth = cell * 0.12;
          ctx.beginPath(); ctx.arc(cx, cy, cell * (0.2 + w.prog * 0.9), 0, Math.PI * 2); ctx.stroke();
        }
      });
    });

    if (!snake.length) return;
    const pts = getInterp(prog);
    const P = pts.map(p => ({ x: p.x * cell + cell / 2, y: p.y * cell + cell / 2 }));
    if (!P.length) return;

    function bulgeAt(idx) {
      let extra = 0, tint = 0, col = '';
      swallows.forEach(sw => {
        const span = Math.min(3, P.length - 1);
        const target = sw.prog * span, sigma = 0.78;
        const peak = (sw.kind === 'big' ? 0.95 : sw.kind === 'poison' ? 0.7 : sw.kind === 'lucky' ? 0.8 : 0.6);
        const amt = peak * Math.exp(-((idx - target) * (idx - target)) / (2 * sigma * sigma)) * (1 - sw.prog * 0.25);
        extra += amt; if (amt > tint) { tint = amt; col = sw.kind; }
      });
      return { extra, tint: Math.min(1, tint / 0.4), col };
    }

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const SUB = 4;
    for (let i = 0; i < P.length - 1; i++) {
      const rawDist = Math.max(Math.abs(snake[i].x - snake[i + 1].x), Math.abs(snake[i].y - snake[i + 1].y));
      if (rawDist > 1) continue;
      const prevRawJump = i > 0 && Math.max(Math.abs(snake[i - 1].x - snake[i].x), Math.abs(snake[i - 1].y - snake[i].y)) > 1;
      const nextRawJump = i < P.length - 2 && Math.max(Math.abs(snake[i + 1].x - snake[i + 2].x), Math.abs(snake[i + 1].y - snake[i + 2].y)) > 1;
      const prevMid = (i === 0 || prevRawJump) ? P[i] : { x: (P[i - 1].x + P[i].x) / 2, y: (P[i - 1].y + P[i].y) / 2 };
      const nextMid = (i === P.length - 2 || nextRawJump) ? P[i + 1] : { x: (P[i].x + P[i + 1].x) / 2, y: (P[i].y + P[i + 1].y) / 2 };
      for (let s = 0; s < SUB; s++) {
        const t0 = s / SUB, t1 = (s + 1) / SUB;
        const a = quadPt(prevMid, P[i], nextMid, t0), b = quadPt(prevMid, P[i], nextMid, t1);
        const bg = bulgeAt(i - 0.5 + (t0 + t1) / 2);
        const w = cell * (0.82 + bg.extra);
        ctx.strokeStyle = isNight() ? NIGHT_PAL.out : '#4f7d17'; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const baseIn = isNight() ? NIGHT_PAL.inn : '#5f9c22';
        const innerCol = bg.tint > 0.03 ? mixHex(baseIn, colorForKind(bg.col), bg.tint) : baseIn;
        ctx.strokeStyle = innerCol; ctx.lineWidth = w * 0.7;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    const hx = P[0].x, hy = P[0].y;
    // kepala: lingkaran lebih besar + outline, biar jelas beda dari badan (di malam ada glow)
    ctx.save();
    if (isNight()) { ctx.shadowColor = '#7dffb0'; ctx.shadowBlur = cell * 0.9; }
    ctx.fillStyle = isNight() ? '#1e7a45' : '#3d6b12';
    ctx.beginPath(); ctx.arc(hx, hy, cell * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = isNight() ? NIGHT_PAL.head : '#79b82e';
    ctx.beginPath(); ctx.arc(hx, hy, cell * 0.44, 0, Math.PI * 2); ctx.fill();
    tongueT += 16;
    const tongueOut = (Math.sin(tongueT / 180) > 0.55) && state === 'playing';
    if (tongueOut) {
      ctx.strokeStyle = '#c93c2e'; ctx.lineWidth = cell * 0.05; ctx.lineCap = 'round';
      const tl = cell * 0.42;
      ctx.beginPath(); ctx.moveTo(hx + dir.x * cell * 0.34, hy + dir.y * cell * 0.34); ctx.lineTo(hx + dir.x * (cell * 0.34 + tl), hy + dir.y * (cell * 0.34 + tl)); ctx.stroke();
      const fx = hx + dir.x * (cell * 0.34 + tl), fy = hy + dir.y * (cell * 0.34 + tl);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (dir.y ? cell * 0.09 : 0), fy + (dir.x ? cell * 0.09 : 0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - (dir.y ? cell * 0.09 : 0), fy - (dir.x ? cell * 0.09 : 0)); ctx.stroke();
    }
    const expr = headExpression();
    if (expr.mouthOpen && !tongueOut) {
      ctx.fillStyle = '#7a2318';
      const mw = cell * 0.30, mh = cell * 0.16;
      const mx = hx + dir.x * cell * 0.30, my = hy + dir.y * cell * 0.30;
      ctx.beginPath();
      if (dir.x !== 0) ctx.ellipse(mx, my, mh, mw, 0, 0, Math.PI * 2);
      else ctx.ellipse(mx, my, mw, mh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    const off = cell * 0.16, r = cell * (expr.scared ? 0.065 : 0.085);
    let e1, e2;
    if (dir.x === 1) { e1 = [hx + off, hy - off]; e2 = [hx + off, hy + off]; }
    else if (dir.x === -1) { e1 = [hx - off, hy - off]; e2 = [hx - off, hy + off]; }
    else if (dir.y === 1) { e1 = [hx - off, hy + off]; e2 = [hx + off, hy + off]; }
    else { e1 = [hx - off, hy - off]; e2 = [hx + off, hy - off]; }
    [e1, e2].forEach(p => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#202124'; ctx.beginPath(); ctx.arc(p[0] + dir.x * r * 0.3, p[1] + dir.y * r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill();
      if (expr.sparkle) {
        ctx.strokeStyle = '#fff59d'; ctx.lineWidth = cell * 0.02; ctx.beginPath();
        ctx.moveTo(p[0] - r * 1.3, p[1] - r * 1.3); ctx.lineTo(p[0] - r * 0.6, p[1] - r * 0.6);
        ctx.moveTo(p[0] - r * 1.3, p[1] - r * 0.4); ctx.lineTo(p[0] - r * 0.7, p[1] - r * 0.15);
        ctx.stroke();
      }
      if (expr.scared) {
        ctx.strokeStyle = '#202124'; ctx.lineWidth = cell * 0.035; ctx.beginPath();
        ctx.moveTo(p[0] - r * 1.1, p[1] - r * 1.4); ctx.lineTo(p[0] + r * 1.1, p[1] - r * 0.2); ctx.stroke();
      }
    });
    if (darkVeilActive) applyDarkVeil(hx, hy);
  }


  // Veil gelap digambar di layer terpisah (offscreen), lalu ditempel ke canvas utama.
  // Dengan begitu lubang `destination-out` tidak menghapus dunia yang sudah tergambar.
  let veilCanvas = null;
  function applyDarkVeil(hx, hy) {
    if (typeof document === 'undefined') return;
    if (!veilCanvas) { veilCanvas = document.createElement('canvas'); veilCanvas.width = canvas.width; veilCanvas.height = canvas.height; }
    const v = veilCanvas.getContext('2d');
    v.globalCompositeOperation = 'source-over';
    v.clearRect(0, 0, veilCanvas.width, veilCanvas.height);
    v.fillStyle = 'rgba(2,4,2,1)';
    v.fillRect(0, 0, veilCanvas.width, veilCanvas.height);
    v.globalCompositeOperation = 'destination-out';
    const g = v.createRadialGradient(hx, hy, 0, hx, hy, cell * 4.3);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.75, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    v.fillStyle = g;
    v.beginPath(); v.arc(hx, hy, cell * 4.3, 0, Math.PI * 2); v.fill();
    v.globalCompositeOperation = 'source-over';
    ctx.drawImage(veilCanvas, 0, 0);
  }

  // Garis tubuh diputus saat ada lompatan (wrap portal), seperti render single-player.
  function tracePath(pts) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > cell * 1.5) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
  }

  function drawSimpleSnakeBody(pts, colorOuter, colorInner, d) {
    if (!pts.length) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = colorOuter; ctx.lineWidth = cell * 0.82;
    tracePath(pts); ctx.stroke();
    ctx.strokeStyle = colorInner; ctx.lineWidth = cell * 0.82 * 0.7;
    tracePath(pts); ctx.stroke();
    const hx = pts[0].x, hy = pts[0].y, off = cell * 0.16, r = cell * 0.085;
    let e1, e2;
    if (d.x === 1) { e1 = [hx + off, hy - off]; e2 = [hx + off, hy + off]; }
    else if (d.x === -1) { e1 = [hx - off, hy - off]; e2 = [hx - off, hy + off]; }
    else if (d.y === 1) { e1 = [hx - off, hy + off]; e2 = [hx + off, hy + off]; }
    else { e1 = [hx - off, hy - off]; e2 = [hx + off, hy - off]; }
    [e1, e2].forEach(p => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(p[0] + d.x * r * 0.3, p[1] + d.y * r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawMultiplayer() {
    const prog = state === 'playing' ? Math.min(1, (clock.now() - lastTick) / curInterval) : 1;
    board(); drawBombTiles(); foods.forEach(drawApple); drawPops();
    players.forEach(p => {
      if (!p.alive || p.respawnAt || !p.snake.length) return;
      const pts = getInterpFor(p.snake, p.prevSnake, prog).map(pt => ({ x: pt.x * cell + cell / 2, y: pt.y * cell + cell / 2 }));
      drawSimpleSnakeBody(pts, p.color, p.inner, p.dir);
    });
  }

  // Dunia hanya maju saat `playing`: jam simulasi membeku saat pause, dan tidak ada langkah/efek/timer setelah ronde berakhir.
  function stepWorld() {
    const now = clock.now();
    checkFoodExpiry(now); checkBombExpiry(now); revertEffectIfExpired(now); updateInset(now);
    let steps = 0;
    while (state === 'playing' && nextTickAt <= now && steps < 3) {
      if (mode === 'timeattack' && nextTickAt > taEndAt) break; // langkah yang jatuh tepat di akhir shift diproses dulu
      lastTick = nextTickAt;
      if (isMP()) tickMultiplayer(); else tick();
      steps++;
    }
    if (state !== 'playing') return;
    if (nextTickAt <= now - curInterval) { lastTick = now; nextTickAt = now + curInterval; } // buang tunggakan setelah jeda panjang
    if (mode === 'timeattack') {
      const remain = taEndAt - now;
      const txt = fmtTime(remain);
      if (txt !== lastTimerText) { lastTimerText = txt; emit({ timerText: txt }); }
      if (remain <= 0) timeUp();
    }
  }

  function loop() {
    if (destroyed) return;
    if (state === 'playing') stepWorld();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  reset();
  emit({ overlay: { phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' } });
  rafId = requestAnimationFrame(loop);

  // Hook inspeksi untuk test: hanya aktif bila pemanggil memberikan `inspect` (produksi tidak).
  if (inspect) {
    inspect({
      get state() { return state; },
      get snake() { return snake; }, set snake(v) { snake = v; prevSnake = v.map(s => ({ ...s })); },
      get dir() { return dir; }, set dir(v) { dir = v; inputQueue = []; },
      get foods() { return foods; }, set foods(v) { foods = v; },
      get players() { return players; },
      get activeEffects() { return activeEffects; },
      get bombTiles() { return bombTiles; },
      get score() { return score; }, set score(v) { score = v; },
      get best() { return best; },
      get taEndAt() { return taEndAt; },
      get simNow() { return clock.now(); },
      get pauseReasons() { return [...pauseReasons]; },
      get curInterval() { return curInterval; },
      get borderInset() { return borderInset; },
      tick, tickMultiplayer, spawnFood, addFood, triggerEffect, stepWorld, plantBombs, gameOver,
    });
  }

  return {
    setMode,
    resize() { cell = canvas.width / COLS; veilCanvas = null; draw(); },
    setSpeedPref(v) { if (SPEEDS.includes(v)) speedPref = v; },
    setTaDuration(s) { if (TA_DURATIONS.includes(s)) { taDuration = s; if (!isActive()) emitFullState(); } },
    startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu,
    setDir,
    setDirMP,
    isRunning() { return isActive(); },
    getState() { return state; },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      persistBest(); clock.stop(); killVisualTweens();
    },
  };
}
