// Controller lifecycle Snake Delivery. API SAMA dengan engine arkade/puzzle (startRun/pauseRun/resumeRun/releasePause/
// togglePause/returnToMenu/setDir/setSpeedPref/destroy/getState/isRunning) sehingga GameCanvas/page tidak perlu tahu mode apa yang berjalan.
// Aturan permainan ada di sim.js; di sini hanya: jam simulasi (membeku saat pause), penjadwal langkah dari RAF, input, HUD, rekor, suara.
import { createSimClock } from '../sim/clock';
import { DEFAULT_CONFIG, ARENA_MAP, START, DIRS, TYPES, parseArena, createState, stepSim, advanceTime, finishShift, lifeLeft } from './sim';
import { drawDelivery } from './render';
import { SPEEDS } from '../storage';
import { loadRecords, saveRecords, deliveryConfigKey, getRecord, recordResult } from '../records';
import { isOpposite } from '../sim/grid';

const BLOCKERS = ['help', 'orientation', 'hidden'];
const KEY_OF = { '0,-1': 'U', '0,1': 'D', '-1,0': 'L', '1,0': 'R' };
const MENU_OVERLAY = { phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' };
// Interval langkah TETAP per preferensi (tidak naik seiring skor): deadline paket dihitung dari interval ini, jadi adil di semua kecepatan.
const INTERVAL = { santai: 180, normal: 140, ngebut: 100, konstan: 140 };

export function createDeliveryGame({ canvas, sounds, onUpdate, rng, now: nowFn, raf: rafOpt, caf: cafOpt, io, config, inspect }) {
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  const ctx = canvas.getContext('2d');
  const rand = rng || (() => Math.random());
  const realNow = nowFn || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const raf = rafOpt || (typeof requestAnimationFrame === 'function' ? (cb) => requestAnimationFrame(cb) : () => 0);
  const caf = cafOpt || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : () => {});
  const store = io || { load: loadRecords, save: saveRecords };
  const clock = createSimClock(realNow);
  const arena = parseArena(ARENA_MAP, START);

  let records = store.load();
  let speedPref = 'normal', runSpeed = 'normal';
  let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'won' | 'lost'
  const pauseReasons = new Set();
  let sim = null, prevSnake = [], queue = [], lastTick = 0, nextTickAt = 0, interval = INTERVAL.normal;
  let message = '', lastSecond = -1, destroyed = false, rafId = null, resultKey = '';

  const isActive = () => state === 'playing' || state === 'paused';
  const emit = (p) => { if (!destroyed) onUpdate(p); };
  const fmtTime = (ms) => { const s = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const keyFor = () => deliveryConfigKey(cfg, isActive() || state === 'won' || state === 'lost' ? runSpeed : speedPref);

  function reset() {
    interval = INTERVAL[speedPref] || INTERVAL.normal;
    runSpeed = speedPref;
    sim = arena.errors.length ? null : createState({ arena, config: cfg, rng: rand, interval, t: clock.now() });
    prevSnake = sim ? sim.snake.map(p => ({ ...p })) : [];
    queue = []; lastTick = clock.now(); nextTickAt = lastTick + interval; message = ''; lastSecond = -1;
    emitFullState();
  }

  function deliveryHud() {
    if (!sim) return null;
    const t = clock.now();
    const slots = [];
    for (let i = 0; i < cfg.capacity; i++) {
      const c = sim.cargo[i];
      slots.push(c ? { type: c.type, label: TYPES[c.type].label, secs: Math.ceil(lifeLeft(c, t) / 1000), pct: Math.round((lifeLeft(c, t) / c.lifeMs) * 100) } : null);
    }
    return {
      timeText: fmtTime(cfg.shiftMs - Math.min(t, cfg.shiftMs)), delivered: sim.delivered, target: cfg.target, score: sim.score, stale: sim.stale,
      cargo: slots, capacity: cfg.capacity, message,
      orders: sim.orders.map(o => ({ id: o.id, type: o.type, label: TYPES[o.type].label, picked: o.picked })),
      sites: Object.fromEntries(Object.keys(TYPES).map(k => [k, TYPES[k].label])),
    };
  }
  function menuData() {
    const r = getRecord(records, deliveryConfigKey(cfg, speedPref));
    return { best: r.best, bestDeliveries: r.bestDeliveries, plays: r.plays, wins: r.wins, shiftSec: Math.round(cfg.shiftMs / 1000), target: cfg.target, speed: speedPref };
  }
  function emitFullState() {
    const rec = getRecord(records, keyFor());
    emit({
      score: sim ? sim.score : 0, best: rec.best, modeLabel: 'Snake · Kurir Apel', mode: 'delivery', effects: [], mpHud: null, timerText: null,
      running: isActive(), paused: state === 'paused', puzzle: null, puzzleMenu: null, delivery: deliveryHud(), deliveryMenu: menuData(), roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
    });
  }

  // ----- lifecycle -----
  function startRun() {
    if (!sim || (state !== 'menu' && state !== 'won' && state !== 'lost')) return false; // hanya berhasil sekali
    clock.reset(); pauseReasons.clear();
    reset();
    state = 'playing'; clock.start();
    lastTick = clock.now(); nextTickAt = lastTick + interval;
    emit({ overlay: { phase: 'none' } });
    emitFullState();
    return true;
  }
  function pauseRun(reason) {
    reason = reason || 'user';
    if (!isActive()) return false;
    pauseReasons.add('user');
    if (reason !== 'user') pauseReasons.add(reason);
    if (state === 'playing') {
      state = 'paused'; clock.stop();
      emitFullState();
      emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Jeda', sub: 'Tekan Main untuk lanjut', btnText: 'Lanjut' } });
    }
    return true;
  }
  const releasePause = (reason) => { if (reason && reason !== 'user') pauseReasons.delete(reason); };
  function resumeRun() {
    if (state !== 'paused') return false;
    if ([...pauseReasons].some(r => BLOCKERS.includes(r))) return false;
    pauseReasons.clear(); state = 'playing'; clock.start();
    emitFullState();
    emit({ overlay: { phase: 'none' } });
    return true;
  }
  const togglePause = () => (state === 'playing' ? pauseRun('user') : state === 'paused' ? resumeRun() : false);
  function returnToMenu() {
    if (state === 'menu') return;
    state = 'menu'; clock.reset(); pauseReasons.clear();
    reset();
    emit({ overlay: MENU_OVERLAY });
  }

  // ----- input (antrean 2 langkah, tidak boleh berbalik arah) -----
  function ensurePlaying() {
    if (state === 'menu' || state === 'won' || state === 'lost') return startRun();
    if (state === 'paused') return resumeRun();
    return state === 'playing';
  }
  function setDir(x, y) {
    if (!ensurePlaying()) return;
    const last = queue.length ? queue[queue.length - 1] : sim.dir;
    if (isOpposite(last, { x, y }) || (last.x === x && last.y === y) || queue.length >= 2) return;
    queue.push({ x, y });
    sounds.playMove();
  }

  // ----- hasil -----
  function endRun(finalState, overlay, opts) {
    if (!isActive()) return false;
    const o = opts || {};
    state = finalState; clock.stop(); pauseReasons.clear();
    const res = recordResult(records, deliveryConfigKey(cfg, runSpeed), { score: sim.score, delivered: sim.delivered, won: finalState === 'won' });
    records = res.records; store.save(records); // disimpan SEKALI per shift
    if (o.death) sounds.playDeath();
    else if (finalState === 'won' && sounds.playWin) sounds.playWin();
    emitFullState();
    emit({ overlay: { ...overlay, sub: overlay.sub + (res.newBest && sim.score > 0 ? ' • Rekor baru!' : '') } });
    return true;
  }
  const crash = () => endRun('lost', { phase: 'gameover', mood: 'shock', title: 'Tabrakan!', sub: `Shift gagal • Terkirim ${sim.delivered}/${cfg.target} • Skor ${sim.score}`, btnText: 'Main Lagi' }, { death: true });
  function timeUp() {
    const st = finishShift(sim);
    if (st === 'won') return endRun('won', { phase: 'gameover', mood: 'win', title: 'Shift Selesai!', sub: `Terkirim ${sim.delivered}/${cfg.target} • Skor ${sim.score}`, btnText: 'Main Lagi' });
    return endRun('lost', { phase: 'gameover', mood: 'dizzy', title: 'Target Tidak Tercapai', sub: `Terkirim ${sim.delivered}/${cfg.target} • Skor ${sim.score}`, btnText: 'Main Lagi' });
  }

  function handleEvents(ev) {
    ev.forEach(e => {
      if (e.type === 'pickup') { sounds.playChomp(); message = `Paket ${e.cargo.type} (${TYPES[e.cargo.type].label}) diambil — antar ke rumah ${e.cargo.type}.`; }
      else if (e.type === 'pickupBlocked') { if (sounds.playBump) sounds.playBump(); message = 'Kargo penuh! Antar dulu sebelum mengambil paket lain.'; }

      else if (e.type === 'stale') { sounds.playEits(); message = `Paket ${e.cargo.type} basi! Kargo dibuang, skor -${cfg.stalePenalty}.`; }
      else if (e.type === 'orderSpawn') { message = message || `Pesanan baru: paket ${e.order.type} (${TYPES[e.order.type].label}).`; }
    });
    const sent = ev.filter(e => e.type === 'deliver');
    if (sent.length) {
      if (sounds.playDeliver) sounds.playDeliver();
      message = `${sent.length} paket ${sent[0].site} terkirim sekaligus! +${sent.reduce((n, e) => n + e.points, 0)} poin.`;
    }
  }

  function doTick(T) {
    prevSnake = sim.snake.map(p => ({ ...p }));
    if (queue.length) { const d = queue.shift(); sim.dir = d; }
    const ev = stepSim(sim, KEY_OF[sim.dir.x + ',' + sim.dir.y], T);
    handleEvents(ev);
    if (sim.status === 'lost') { crash(); return; }
    nextTickAt = lastTick + interval;
    emitFullState();
  }

  // Dunia hanya maju saat `playing`. Langkah yang jatuh tepat di akhir shift diproses SEBELUM hasil dievaluasi.
  function stepWorld() {
    const now = clock.now();
    let steps = 0;
    while (state === 'playing' && nextTickAt <= now && nextTickAt <= cfg.shiftMs && steps < 3) {
      lastTick = nextTickAt;
      doTick(lastTick);
      steps++;
    }
    if (state !== 'playing') return;
    if (nextTickAt <= now - interval && nextTickAt <= cfg.shiftMs) { lastTick = now; nextTickAt = now + interval; } // buang tunggakan
    const t = Math.min(now, cfg.shiftMs);
    const ev = [];
    advanceTime(sim, t, ev);
    if (ev.length) { handleEvents(ev); emitFullState(); }
    if (now >= cfg.shiftMs) { timeUp(); return; }
    const sec = Math.floor(now / 1000);
    if (sec !== lastSecond) { lastSecond = sec; emitFullState(); }
  }

  function loop() {
    if (destroyed) return;
    if (state === 'playing') stepWorld();
    if (sim) {
      const prog = (state === 'playing' || state === 'paused') ? Math.min(1, (clock.now() - lastTick) / interval) : 1;
      drawDelivery(ctx, canvas.width, canvas.height, sim, { prog, from: prevSnake, t: clock.now() });
    }
    rafId = raf(loop);
  }

  reset();
  emit({ overlay: MENU_OVERLAY });
  rafId = raf(loop);

  if (inspect) {
    inspect({
      get sim() { return sim; }, get state() { return state; }, get simNow() { return clock.now(); }, get interval() { return interval; },
      get nextTickAt() { return nextTickAt; }, get pauseReasons() { return [...pauseReasons]; }, get records() { return records; },
      setSnake(cells, dirKey) { sim.snake = cells.map(([x, y]) => ({ x, y })); sim.dir = { ...DIRS[dirKey] }; queue = []; prevSnake = sim.snake.map(p => ({ ...p })); },
      stepWorld, doTick,
    });
  }

  return {
    setMode() {}, setTaDuration() {}, setDirMP() {},
    setSpeedPref(v) { if (SPEEDS.includes(v)) { speedPref = v; if (!isActive()) { interval = INTERVAL[v]; emitFullState(); } } },
    startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu, setDir,
    isRunning: isActive, getState: () => state,
    destroy() { destroyed = true; if (rafId) caf(rafId); clock.stop(); },
  };
}
