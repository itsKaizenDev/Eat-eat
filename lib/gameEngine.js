'use client';
import gsap from 'gsap';
import { COLS, ROWS, EFFECTS, MODE_NAMES, colorForKind } from './constants';

// Port 1:1 dari game engine Snake single-file yang lama (canvas imperative),
// cuma dipindah jadi modul supaya bisa dipakai dari komponen React/Next.js.
// Semua state internal (snake, foods, dst) tetap mutable biasa (bukan React
// state) biar tick-rate game nggak kebentur re-render React tiap frame.
export function createSnakeGame({ canvas, sounds, onUpdate }) {
  const ctx = canvas.getContext('2d');
  const cell = canvas.width / COLS;

  let mode = 'classic';
  let snake, prevSnake, dir, nextDir, foods = [], tickTimer, lastTick, running = false, paused = false, score, speed, tongueT = 0, portalRot = 0;
  let speedMult = 1, borderInset = 0, poisonSwarm = false, canTeleport = false, activeEffects = [], nearWallWarned = false, darkVeilActive = false;
  let bombTiles = [];
  let players = [], taEndAt = 0, taTimeLeft = 0;
  let swallows = [], warps = [], pops = [];
  let speedPref = 'normal', taDuration = 90;
  const NIGHT_PAL = { a: '#16283a', b: '#1a2f44', out: '#2f9e5b', inn: '#5fe08a', head: '#c9ffd9' };
  let insetAnim = { v: 0 }, widening = false, reversed = false;
  function isHard() { return mode === 'mayhemhard' || mode === 'impossible'; }
  function isMayhem() { return mode === 'mayhem' || mode === 'mayhemplus' || isHard(); }
  function isNight() { return mode === 'classicnight'; }
  function speedFor(sc) {
    const pref = mode === 'impossible' ? 'ngebut' : speedPref;
    if (pref === 'santai') return Math.max(110, 180 - Math.floor(sc / 4) * 4);
    if (pref === 'ngebut') return Math.max(50, 100 - Math.floor(sc / 3) * 6);
    if (pref === 'konstan') return 140;
    return Math.max(60, 140 - Math.floor(sc / 4) * 8);
  }
  let best = 0;
  try { best = parseInt(localStorage.getItem('snake_best') || '0'); } catch (e) {}
  let rafId = null;
  let destroyed = false;

  // Preload sprite PNG (apel, bom, portal). ctx.drawImage otomatis no-op
  // kalau gambar belum selesai load, jadi aman dipanggil dari frame pertama.
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

  function isMP() { return mode === 'multiplayer' || mode === 'mayhemduo'; }

  function emit(patch) { if (!destroyed) onUpdate(patch); }

  function foodCountFor(m) { return (m === 'mayhemplus' || m === 'mayhemhard' || m === 'impossible') ? 6 : (m === 'multiplayer' || m === 'mayhemduo') ? 5 : 4; }

  function bounds() { return { minX: borderInset, maxX: COLS - 1 - borderInset, minY: borderInset, maxY: ROWS - 1 - borderInset }; }

  function setMode(m) { mode = m; }

  function reset() {
    snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
    prevSnake = snake.map(s => ({ ...s }));
    dir = { x: 1, y: 0 }; nextDir = dir;
    score = 0; speed = speedFor(0); running = false; paused = false; swallows = []; warps = []; bombTiles = [];
    gsap.killTweensOf(insetAnim); insetAnim.v = 0; widening = false; reversed = false; speedMult = 1; borderInset = 0; poisonSwarm = false; canTeleport = false; activeEffects = []; nearWallWarned = false; darkVeilActive = false;
    if (isMP()) initMultiplayer();
    foods = [];
    const fc = foodCountFor(mode);
    for (let i = 0; i < fc; i++) { const slot = (isMayhem() && mode !== 'mayhem' && i < 2) ? 'forced' : 'random'; foods.push(spawnFood(slot)); }
    if (mode === 'timeattack') { taTimeLeft = taDuration * 1000; taEndAt = 0; }
    emitFullState();
  }

  function emitFullState() {
    emit({
      score, best, modeLabel: 'Snake · ' + MODE_NAMES[mode], mode,
      effects: activeEffects.map(e => ({ type: e.type, label: e.label, t: e.timed ? Math.ceil((e.endsAt - performance.now()) / 1000) + 's' : '' })),
      mpHud: isMP() ? mpHudData() : null,
      timerText: mode === 'timeattack' ? fmtTime(taTimeLeft) : null,
      running, paused,
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
      { id: 'P1', label: 'P1 (Panah)', color: '#4f7d17', inner: '#5f9c22', snake: [{ x: b.minX + 4, y: 7 }, { x: b.minX + 3, y: 7 }, { x: b.minX + 2, y: 7 }], dir: { x: 1, y: 0 }, score: 0, lives: 3, alive: true, respawnAt: 0 },
      { id: 'P2', label: 'P2 (WASD)', color: '#2f6f8f', inner: '#3f92bf', snake: [{ x: b.maxX - 4, y: 7 }, { x: b.maxX - 3, y: 7 }, { x: b.maxX - 2, y: 7 }], dir: { x: -1, y: 0 }, score: 0, lives: 3, alive: true, respawnAt: 0 },
    ];
    players.forEach(p => { p.nextDir = p.dir; p.prevSnake = p.snake.map(s => ({ ...s })); });
  }

  function rollKind() {
    if (mode === 'mayhemduo') { const r = Math.random(); if (r < 0.05) return 'teleport'; if (r < 0.10) return 'bomb'; if (r < 0.28) return 'poison'; if (r < 0.38) return 'big'; if (r < 0.46) return 'lucky'; return 'normal'; }
    if (mode === 'timeattack' && Math.random() < 0.14) return 'time';
    if (mode === 'multiplayer') { const r = Math.random(); if (r < 0.18) return 'poison'; if (r < 0.3) return 'big'; return 'normal'; }
    if (poisonSwarm && Math.random() < 0.85) return 'poison';
    if (isMayhem()) {
      const rt = Math.random();
      if (rt < 0.05) return 'teleport';
      if (rt < 0.09) return 'bomb';
      if (rt < 0.13) return 'dark';
      const plus = mode !== 'mayhem', imp = mode === 'impossible';
      const pPoison = imp ? 0.4 : plus ? 0.34 : 0.26, pBig = plus ? 0.13 : 0.09, pLucky = imp ? 0.16 : plus ? 0.11 : 0.06;
      const r = Math.random();
      if (r < pPoison) return 'poison';
      if (r < pPoison + pBig) return 'big';
      if (r < pPoison + pBig + pLucky) return 'lucky';
    }
    return 'normal';
  }

  function spawnFood(slot) {
    slot = slot || 'random';
    const b = bounds();
    let ok = false, p;
    while (!ok) {
      p = { x: b.minX + Math.floor(Math.random() * (b.maxX - b.minX + 1)), y: b.minY + Math.floor(Math.random() * (b.maxY - b.minY + 1)) };
      ok = !snake.some(s => s.x === p.x && s.y === p.y) && !foods.some(f => f.x === p.x && f.y === p.y);
      if (isMP()) ok = ok && !players.some(pl => pl.alive && pl.snake.some(s => s.x === p.x && s.y === p.y));
    }
    const kind = slot === 'forced' ? (Math.random() < 0.5 ? 'poison' : 'big') : rollKind();
    const timed = kind === 'poison' || kind === 'big' || kind === 'lucky' || kind === 'teleport' || kind === 'bomb' || kind === 'dark' || kind === 'time';
    const dur = (mode === 'impossible' ? 0.75 : 1) * (kind === 'big' ? 3400 + Math.random() * 2000 : 2600 + Math.random() * 1800);
    const f = { x: p.x, y: p.y, kind, slot, scale: { v: 0.4 }, expiresAt: timed ? performance.now() + dur : null, disguised: isHard() && kind === 'poison', revealUntil: performance.now() + 450 };
    gsap.to(f.scale, { v: 1, duration: 0.28, ease: 'back.out(2.2)' });
    return f;
  }

  function checkFoodExpiry() {
    if (!running || paused) return;
    const now = performance.now();
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      // Mengecil dulu (smooth) sebelum beneran diganti, bukan lenyap instan.
      if (f.expiresAt && now > f.expiresAt && !f.expiring) {
        f.expiring = true;
        gsap.to(f.scale, {
          v: 0, duration: 0.22, ease: 'back.in(2)',
          onComplete: () => {
            const idx = foods.indexOf(f);
            if (idx !== -1) { foods.splice(idx, 1); foods.push(spawnFood(f.slot)); }
          },
        });
      }
    }
  }

  function checkBombExpiry() {
    const now = performance.now();
    for (let i = bombTiles.length - 1; i >= 0; i--) { if (now > bombTiles[i].expiresAt) bombTiles.splice(i, 1); }
  }

  function recomputeEffects() {
    let sm = 1, bi = 0, ps = false, tp = false, dk = false, rv = false;
    activeEffects.forEach(e => {
      if (e.type === 'fast') sm *= 0.6;
      if (e.type === 'slow') sm *= 1.7;
      if (e.type === 'shrink' && !isHard()) bi = 3;
      if (e.type === 'reverse') rv = true;
      if (e.type === 'swarm') ps = true;
      if (e.type === 'teleport') tp = true;
      if (e.type === 'dark') dk = true;
    });
    speedMult = sm; borderInset = bi; poisonSwarm = ps; canTeleport = tp; darkVeilActive = dk; reversed = rv;
    if (isHard()) {
      borderInset = Math.floor(insetAnim.v);
      if (!activeEffects.some(e => e.type === 'shrink') && insetAnim.v > 0 && !widening) {
        widening = true; gsap.killTweensOf(insetAnim);
        gsap.to(insetAnim, { v: 0, duration: 1.2, ease: 'power1.inOut', onComplete: () => { widening = false; } });
      }
    }
  }

  function triggerEffect(type) {
    const d = EFFECTS[type];
    activeEffects = activeEffects.filter(e => e.type !== type);
    activeEffects.push({ type, label: d.label, endsAt: performance.now() + d.dur, timed: d.timed });
    if (type === 'nerf') { snake = snake.slice(0, Math.min(2, snake.length)); score = Math.max(0, score - 3); if (snake.length < 1) return gameOver(); }
    if (type === 'buff') { const tail = { ...snake[snake.length - 1] }; for (let i = 0; i < 10; i++) snake.push({ ...tail }); score += 5; bumpBest(); }
    if (type === 'shrink' && isHard()) { widening = false; gsap.killTweensOf(insetAnim); gsap.to(insetAnim, { v: 3, duration: d.dur / 1000 * 0.85, ease: 'none' }); }
    if (type === 'shrink' && !isHard()) {
      const b = { minX: 3, maxX: COLS - 4, minY: 3, maxY: ROWS - 4 };
      for (let i = foods.length - 1; i >= 0; i--) { const f = foods[i]; if (f.x < b.minX || f.x > b.maxX || f.y < b.minY || f.y > b.maxY) { const slot = f.slot; foods.splice(i, 1); foods.push(spawnFood(slot)); } }
    }
    recomputeEffects();
    restartTimer();
    emitFullState();
  }

  function syncInset() {
    if (!isHard() || !snake) return;
    const ni = Math.floor(insetAnim.v);
    if (ni === borderInset) return;
    const grow = ni > borderInset; borderInset = ni;
    if (grow) {
      const b = bounds();
      for (let i = foods.length - 1; i >= 0; i--) { const f = foods[i]; if (f.x < b.minX || f.x > b.maxX || f.y < b.minY || f.y > b.maxY) { const slot = f.slot; foods.splice(i, 1); foods.push(spawnFood(slot)); } }
    }
  }

  function revertEffectIfExpired() {
    const now = performance.now();
    const before = activeEffects.length;
    activeEffects = activeEffects.filter(e => now <= e.endsAt);
    if (activeEffects.length !== before) { recomputeEffects(); restartTimer(); }
  }

  function bumpBest() { if (score > best) { best = score; try { localStorage.setItem('snake_best', best); } catch (e) {} } }

  function wrapWithInset(v, lo, hi) { const w = hi - lo + 1; return lo + (((v - lo) % w) + w) % w; }

  function tick() {
    if (paused) return;
    prevSnake = snake.map(s => ({ ...s }));
    lastTick = performance.now();
    dir = nextDir;
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
        const w = { a: { x: snake[0].x, y: snake[0].y }, b: { x: nx, y: ny }, prog: 0 };
        warps.push(w);
        gsap.to(w, { prog: 1, duration: 0.4, ease: 'power1.out', onComplete: () => { warps = warps.filter(x => x !== w); } });
        hx = nx; hy = ny;
      } else return gameOver();
    }
    const head = { x: hx, y: hy };
    if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();
    snake.unshift(head);

    const bi = bombTiles.findIndex(t => t.x === head.x && t.y === head.y);
    if (bi !== -1) { bombTiles.splice(bi, 1); return gameOver('bomb'); }

    const fi = foods.findIndex(f => f.x === head.x && f.y === head.y);
    if (fi !== -1) {
      const eaten = foods[fi];
      let ek = eaten.kind;
      const sw = { prog: 0, kind: ek === 'lucky' ? 'lucky' : ek };
      swallows.push(sw);
      gsap.to(sw, { prog: 1, duration: 0.5, ease: 'power2.in', onComplete: () => { swallows = swallows.filter(x => x !== sw); } });
      const pop = { x: eaten.x, y: eaten.y, kind: ek, r: 0.15, a: 1 };
      pops.push(pop);
      gsap.to(pop, { r: 1.4, a: 0, duration: 0.4, ease: 'power2.out', onComplete: () => { pops = pops.filter(x => x !== pop); } });
      foods.splice(fi, 1); foods.push(spawnFood(eaten.slot));
      sounds.playChomp();

      if (ek === 'poison') {
        let removed = 0; const cut = isHard() ? Math.ceil(snake.length / 2) : 3; while (removed < cut && snake.length > 1) { snake.pop(); removed++; }
        score = Math.max(0, score - 2);
        speed = speedFor(score); restartTimer();
        if (snake.length <= 1) return gameOver('poison');
      } else if (ek === 'lucky') {
        score += 1; bumpBest();
        const pool = mode === 'impossible' ? ['fast', 'shrink', 'swarm', 'nerf', 'reverse'] : isHard() ? ['fast', 'slow', 'shrink', 'swarm', 'nerf', 'buff', 'reverse'] : ['fast', 'slow', 'shrink', 'swarm', 'nerf', 'buff'];
        triggerEffect(pool[Math.floor(Math.random() * pool.length)]);
      } else if (ek === 'teleport') {
        score += 1; bumpBest();
        triggerEffect('teleport');
      } else if (ek === 'bomb') {
        score += 1; bumpBest();
        const b2 = bounds(); let placed = 0, tries = 0;
        while (placed < 4 && tries < 80) {
          tries++;
          const p = { x: b2.minX + Math.floor(Math.random() * (b2.maxX - b2.minX + 1)), y: b2.minY + Math.floor(Math.random() * (b2.maxY - b2.minY + 1)) };
          const clash = snake.some(s => s.x === p.x && s.y === p.y) || foods.some(f => f.x === p.x && f.y === p.y) || bombTiles.some(t => t.x === p.x && t.y === p.y);
          if (!clash) { bombTiles.push({ x: p.x, y: p.y, hits: 0, expiresAt: performance.now() + 30000 }); placed++; }
        }
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
        speed = speedFor(score); restartTimer();
      }
    } else { snake.pop(); }
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

  function gameOver(reason) {
    sounds.playDeath(reason);
    shakeCanvas();
    clearInterval(tickTimer); running = false;
    emitFullState();
    emit({ overlay: { phase: 'gameover', mood: reason === 'poison' ? 'sick' : 'shock', title: 'Game Over', sub: 'Skor: ' + score + ' — pilih mode & main lagi', btnText: 'Main Lagi' } });
  }

  function timeUp() {
    clearInterval(tickTimer); running = false;
    emitFullState();
    emit({ overlay: { phase: 'gameover', mood: 'dizzy', title: 'Waktu Habis!', sub: 'Skor akhir: ' + score + ' — pilih mode & main lagi', btnText: 'Main Lagi' } });
  }

  function hitPlayer(p) {
    sounds.playDeath();
    shakeCanvas();
    p.lives--; p.snake = [];
    if (p.lives <= 0) { p.alive = false; checkMultiplayerEnd(); }
    else { p.respawnAt = performance.now() + 1200; }
    emitFullState();
  }

  function respawnPlayer(p) {
    const b = bounds();
    const x0 = p.id === 'P1' ? b.minX + 4 : b.maxX - 4;
    const stepx = p.id === 'P1' ? -1 : 1;
    p.snake = [{ x: x0, y: 7 }, { x: x0 + stepx, y: 7 }, { x: x0 + stepx * 2, y: 7 }];
    p.prevSnake = p.snake.map(s => ({ ...s }));
    p.dir = { x: -stepx, y: 0 }; p.nextDir = p.dir; p.respawnAt = 0;
  }

  function checkMultiplayerEnd() {
    const alive = players.filter(p => p.alive);
    if (alive.length <= 1) endMultiplayer(alive[0]);
  }

  function endMultiplayer(winner) {
    clearInterval(tickTimer); running = false;
    emitFullState();
    const title = winner ? (winner.label + ' Menang!') : 'Seri!';
    emit({ overlay: { phase: 'gameover', mood: winner ? 'win' : 'dizzy', title, sub: 'P1: ' + players[0].score + ' • P2: ' + players[1].score, btnText: 'Main Lagi' } });
  }

  function plantBombs(n) {
    const b2 = bounds(); let placed = 0, tries = 0;
    const occ = (p) => players.some(pl => pl.snake.some(s => s.x === p.x && s.y === p.y)) || foods.some(f => f.x === p.x && f.y === p.y) || bombTiles.some(t => t.x === p.x && t.y === p.y);
    while (placed < n && tries < 80) {
      tries++;
      const p = { x: b2.minX + Math.floor(Math.random() * (b2.maxX - b2.minX + 1)), y: b2.minY + Math.floor(Math.random() * (b2.maxY - b2.minY + 1)) };
      if (!occ(p)) { bombTiles.push({ x: p.x, y: p.y, hits: 0, expiresAt: performance.now() + 30000 }); placed++; }
    }
  }

  function tickMultiplayer() {
    if (paused) return;
    lastTick = performance.now();
    const now = performance.now();
    const acting = [];
    players.forEach(p => {
      if (!p.alive) return;
      if (p.respawnAt) { if (now >= p.respawnAt) respawnPlayer(p); return; }
      p.prevSnake = p.snake.map(s => ({ ...s })); p.dir = p.nextDir; acting.push(p);
    });
    const b = bounds(); const heads = {};
    acting.forEach(p => { heads[p.id] = { x: p.snake[0].x + p.dir.x, y: p.snake[0].y + p.dir.y }; });
    acting.forEach(p => {
      const h = heads[p.id];
      let dead = false;
      if (h.x < b.minX || h.x > b.maxX || h.y < b.minY || h.y > b.maxY) {
        if (canTeleport) { h.x = wrapWithInset(h.x, b.minX, b.maxX); h.y = wrapWithInset(h.y, b.minY, b.maxY); } else dead = true;
      }
      if (!dead) dead = p.snake.some(s => s.x === h.x && s.y === h.y);
      if (!dead) acting.forEach(o => { if (o !== p) { if (o.snake.some(s => s.x === h.x && s.y === h.y)) dead = true; if (heads[o.id].x === h.x && heads[o.id].y === h.y) dead = true; } });
      if (dead) { hitPlayer(p); return; }
      p.snake.unshift(h);
      const bmi = bombTiles.findIndex(t => t.x === h.x && t.y === h.y);
      if (bmi !== -1) { bombTiles.splice(bmi, 1); hitPlayer(p); return; }
      const fi = foods.findIndex(f => f.x === h.x && f.y === h.y);
      if (fi !== -1) {
        const eaten = foods[fi]; foods.splice(fi, 1); foods.push(spawnFood(eaten.slot)); sounds.playChomp();
        if (eaten.kind === 'poison') { let r = 0; while (r < 3 && p.snake.length > 1) { p.snake.pop(); r++; } p.score = Math.max(0, p.score - 2); }
        else if (eaten.kind === 'big') { p.score += 3; }
        else if (eaten.kind === 'bomb') { p.score += 1; plantBombs(4); triggerEffect('bomb'); }
        else if (eaten.kind === 'teleport') { p.score += 1; triggerEffect('teleport'); }
        else if (eaten.kind === 'lucky') {
          p.score += 1;
          const r = ['fast', 'slow', 'buff', 'nerf'][Math.floor(Math.random() * 4)];
          if (r === 'buff') p.score += 5; else if (r === 'nerf') p.score = Math.max(0, p.score - 3); else triggerEffect(r);
        }
        else { p.score += 1; }
        if (p.score >= 50) { emitFullState(); return endMultiplayer(p); }
      } else p.snake.pop();
    });
    emitFullState();
  }

  function restartTimer() { clearInterval(tickTimer); tickTimer = setInterval(isMP() ? tickMultiplayer : tick, Math.max(35, speed * speedMult)); }

  function start() {
    if (running) {
      paused = !paused;
      if (paused) { if (mode === 'timeattack') taTimeLeft = Math.max(0, taEndAt - performance.now()); }
      else { lastTick = performance.now(); if (mode === 'timeattack') taEndAt = performance.now() + taTimeLeft; }
      emitFullState();
      emit({ overlay: paused ? { phase: 'pause', mood: 'idle', title: 'Jeda', sub: 'Tekan Main untuk lanjut', btnText: 'Lanjut' } : { phase: 'none' } });
      return;
    }
    reset(); running = true; paused = false; lastTick = performance.now();
    if (mode === 'timeattack') taEndAt = performance.now() + taTimeLeft;
    emit({ overlay: { phase: 'none' } });
    restartTimer();
    emitFullState();
  }

  function setDir(x, y) {
    if (reversed) { x = -x; y = -y; }
    if (dir.x === -x && dir.y === -y) return;
    if (nextDir.x !== x || nextDir.y !== y) sounds.playMove();
    nextDir = { x, y };
    if (!running) start();
    if (paused) { paused = false; lastTick = performance.now(); restartTimer(); emit({ overlay: { phase: 'none' } }); }
  }

  function setDirMP(which, x, y) {
    const p = players[which];
    if (!p || !p.alive) return;
    if (p.dir.x === -x && p.dir.y === -y) return;
    if (p.nextDir.x !== x || p.nextDir.y !== y) sounds.playMove();
    p.nextDir = { x, y };
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
    if (isHard() && !widening && insetAnim.v > 0 && insetAnim.v < 3 && insetAnim.v % 1 > 0.6) {
      const k = borderInset, n = COLS - 2 * k, m = ROWS - 2 * k;
      ctx.fillStyle = 'rgba(230,60,40,' + (0.25 + 0.2 * Math.sin(performance.now() / 90)) + ')';
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
    const now = performance.now();
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
      const remain = f.expiresAt - performance.now();
      if (remain < 1000 && remain > 0) alpha = 0.35 + 0.65 * Math.abs(Math.sin(performance.now() / 90));
    }
    const img = sprites[(f.disguised && performance.now() > f.revealUntil) ? 'normal' : f.kind];
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
    const prog = running && !paused ? Math.min(1, (performance.now() - lastTick) / speed) : 1;
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
    const tongueOut = (Math.sin(tongueT / 180) > 0.55) && running && !paused;
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

  function applyDarkVeil(hx, hy) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,4,2,1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, cell * 4.3);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.75, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(hx, hy, cell * 4.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawSimpleSnakeBody(pts, colorOuter, colorInner, d) {
    if (!pts.length) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = colorOuter; ctx.lineWidth = cell * 0.82;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.strokeStyle = colorInner; ctx.lineWidth = cell * 0.82 * 0.7;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
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
    const prog = running && !paused ? Math.min(1, (performance.now() - lastTick) / speed) : 1;
    board(); drawBombTiles(); foods.forEach(drawApple); drawPops();
    players.forEach(p => {
      if (!p.alive || p.respawnAt || !p.snake.length) return;
      const pts = getInterpFor(p.snake, p.prevSnake, prog).map(pt => ({ x: pt.x * cell + cell / 2, y: pt.y * cell + cell / 2 }));
      drawSimpleSnakeBody(pts, p.color, p.inner, p.dir);
    });
  }

  function loop() {
    if (destroyed) return;
    checkFoodExpiry(); checkBombExpiry(); revertEffectIfExpired(); syncInset();
    if (mode === 'timeattack' && running && !paused) {
      const remain = Math.max(0, taEndAt - performance.now());
      emit({ timerText: fmtTime(remain) });
      if (remain <= 0) timeUp();
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  reset();
  rafId = requestAnimationFrame(loop);

  return {
    setMode,
    setSpeedPref(v) { speedPref = v; },
    setTaDuration(s) { taDuration = s; },
    start,
    setDir,
    setDirMP,
    isRunning() { return running; },
    destroy() { destroyed = true; clearInterval(tickTimer); if (rafId) cancelAnimationFrame(rafId); },
  };
}
