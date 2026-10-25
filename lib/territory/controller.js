import { battleAudioEvent } from '../audio/events';
// Controller lifecycle Snake Territory (2P lokal). API SAMA dengan controller lain (startRun/pauseRun/resumeRun/releasePause/
// togglePause/returnToMenu/setDirMP/setSpeedPref/destroy/getState/isRunning). Aturan ada di sim.js; di sini: jam simulasi
// (membeku saat pause), penjadwal tick bersama, antrean input per pemain, HUD, rekor, suara.
import { createSimClock } from '../sim/clock';
import { DEFAULT_CONFIG, ARENA_MAP, START, parseArena, createState, stepSim, finishMatch, percent, targetCount } from './sim';
import { drawTerritory } from './render';
import { SPEEDS } from '../storage';
import { newResultId, createResultWriter, loadRecords, saveRecords, territoryConfigKey, getTerritoryRecord, recordMatch } from '../records';
import { isOpposite } from '../sim/grid';

const BLOCKERS = ['help', 'orientation', 'hidden'];
const MENU_OVERLAY = { phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' };
const INTERVAL = { santai: 200, normal: 150, ngebut: 110, konstan: 150 };
const CAUSE = { wall: 'menabrak tepi/dinding', self: 'menabrak jejak sendiri', cut: 'jejaknya diputus lawan', headon: 'tabrakan kepala', swap: 'tukar kepala' };
const REASON = { wilayah: 'mencapai target wilayah', nyawa: 'lawan kehabisan nyawa', waktu: 'wilayah terbanyak saat waktu habis' };
const FX_MS = 350;

export function createTerritoryGame({ canvas, sounds, onUpdate, now: nowFn, raf: rafOpt, caf: cafOpt, io, config }) {
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  const ctx = canvas.getContext('2d');
  const realNow = nowFn || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const raf = rafOpt || (typeof requestAnimationFrame === 'function' ? (cb) => requestAnimationFrame(cb) : () => 0);
  const caf = cafOpt || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : () => {});
  const store = io || { load: loadRecords, save: saveRecords };
  const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const writer = createResultWriter(store, !io);
  let resultId = null;
  const clock = createSimClock(realNow);
  const arena = parseArena(ARENA_MAP, START);

  let records = store.load();
  let speedPref = 'normal', runSpeed = 'normal';
  let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'won' (ada pemenang) | 'lost' (seri)
  const pauseReasons = new Set();
  let sim = null, prevHeads = [], queues = [[], []], lastTick = 0, nextTickAt = 0, interval = INTERVAL.normal;
  let message = '', lastSecond = -1, destroyed = false, rafId = null, fx = [];

  const isActive = () => state === 'playing' || state === 'paused';
  const emit = (p) => { if (!destroyed) onUpdate({ ...p, recordSave: { pending: writer.pending } }); };
  const fmtTime = (ms) => { const s = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const keyFor = (sp) => territoryConfigKey(cfg, sp);
  const pName = (i) => 'P' + (i + 1);

  function reset() {
    interval = INTERVAL[speedPref] || INTERVAL.normal;
    runSpeed = speedPref;
    sim = arena.errors.length ? null : createState({ arena, config: cfg, t: clock.now() });
    prevHeads = sim ? sim.players.map(p => ({ ...p.head })) : [];
    queues = [[], []]; fx = [];
    lastTick = clock.now(); nextTickAt = lastTick + interval; message = ''; lastSecond = -1;
    emitFullState();
  }

  function hudData() {
    if (!sim) return null;
    const t = clock.now();
    return {
      timeText: fmtTime(cfg.matchMs - Math.min(t, cfg.matchMs)), targetPct: cfg.targetPct, message,
      players: sim.players.map((p, i) => ({ id: p.id, name: pName(i), keys: i ? 'WASD' : 'Panah', pct: Math.floor(percent(sim, i)), count: sim.counts[i], lives: Math.max(0, p.lives), maxLives: cfg.lives })),
    };
  }
  function menuData() {
    const r = getTerritoryRecord(records, keyFor(speedPref));
    return { best: r.best, plays: r.plays, p1Wins: r.p1Wins, p2Wins: r.p2Wins, draws: r.draws, matchSec: Math.round(cfg.matchMs / 1000), targetPct: cfg.targetPct, speed: speedPref };
  }
  function emitFullState() {
    emit({
      score: 0, best: 0, modeLabel: 'Snake · Rebut Arena', mode: 'territory', effects: [], mpHud: null, timerText: null,
      running: isActive(), paused: state === 'paused', puzzle: null, puzzleMenu: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null,
      territory: hudData(), territoryMenu: menuData(), boss: null, bossMenu: null,
    });
  }

  // ----- lifecycle -----
  function startRun() {
    if (!sim || (state !== 'menu' && state !== 'won' && state !== 'lost')) return false; // hanya berhasil sekali
    records = store.load(); resultId = newResultId(); clock.reset(); pauseReasons.clear();
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
    state = 'menu'; records = store.load(); resultId = newResultId(); clock.reset(); pauseReasons.clear();
    reset();
    emit({ overlay: MENU_OVERLAY });
  }

  // ----- input: antrean 2 langkah per pemain, tidak boleh berbalik arah -----
  function ensurePlaying() {
    if (state === 'menu' || state === 'won' || state === 'lost') return startRun();
    if (state === 'paused') return resumeRun();
    return state === 'playing';
  }
  function setDirMP(which, x, y) {
    if (which !== 0 && which !== 1) return;
    if (!ensurePlaying()) return;
    const q = queues[which];
    const last = q.length ? q[q.length - 1] : sim.players[which].dir;
    if (isOpposite(last, { x, y }) || (last.x === x && last.y === y) || q.length >= 2) return;
    q.push({ x, y });
    if (sounds.playMove) sounds.playMove();
  }
  const setDir = () => {}; // Territory hanya keyboard 2 pemain; swipe/DPad tidak berlaku

  // ----- hasil -----
  function endMatch(res) {
    if (!isActive()) return false;
    state = res.winner ? 'won' : 'lost'; clock.stop(); pauseReasons.clear();
    const bestPct = Math.floor(Math.max(percent(sim, 0), percent(sim, 1)));
    const event = { id: resultId, type: 'territory', key: keyFor(runSpeed), result: { best: bestPct, winner: res.winner } };
    const rr = recordMatch(store.load(), event.key, event.result);
    records = rr.records; writer.write(event, records); // disimpan SEKALI per pertandingan
    const line = `P1 ${Math.floor(percent(sim, 0))}% • P2 ${Math.floor(percent(sim, 1))}%`;
    if (res.winner) { if (res.reason === 'nyawa' && sounds.playDeath) sounds.playDeath(); if (sounds.playWin) sounds.playWin(); }
    else if (sounds.playBump) sounds.playBump();
    message = res.winner ? `${pName(res.winner - 1)} menang: ${REASON[res.reason]}.` : (res.reason === 'nyawa' ? 'Seri: nyawa terakhir habis bersamaan.' : 'Seri: wilayah sama besar.');
    emitFullState();
    emit({ overlay: res.winner
      ? { phase: 'gameover', mood: 'win', title: `${pName(res.winner - 1)} Menang!`, sub: `${line} • ${REASON[res.reason]}` + (rr.newBest ? ' • Rekor baru!' : ''), btnText: 'Main Lagi' }
      : { phase: 'gameover', mood: 'dizzy', title: 'Seri!', sub: `${line} • ${res.reason === 'nyawa' ? 'nyawa terakhir habis bersamaan' : 'wilayah sama besar'}`, btnText: 'Main Lagi' } });
    return true;
  }

  function handleEvents(ev) {
    ev.forEach(e => {
      sounds.playEvent?.(battleAudioEvent(e));
      if (e.type === 'claim') {
        if (sounds.playChomp) sounds.playChomp();
        message = `${pName(e.player)} merebut ${e.cells} petak.`;
        if (!reduceMotion && e.list.length) fx.push({ cells: e.list, until: clock.now() + FX_MS, owner: e.player + 1 });
      } else if (e.type === 'death') {
        if (sounds.playEits && e.lives > 0) sounds.playEits();
        message = `${pName(e.player)} kehilangan 1 nyawa (${CAUSE[e.cause]}). Sisa ${Math.max(0, e.lives)}.`;
        queues[e.player] = [];
      } else if (e.type === 'respawn') {
        queues[e.player] = [];
        prevHeads[e.player] = { ...sim.players[e.player].head }; // tanpa interpolasi lintas papan
      }
    });
  }

  function doTick(T) {
    prevHeads = sim.players.map(p => ({ ...p.head }));
    const dirs = queues.map(q => (q.length ? q.shift() : null));
    const ev = stepSim(sim, dirs, T);
    handleEvents(ev);
    const fin = ev.find(e => e.type === 'end');
    if (fin) { endMatch(fin); return; }
    if (ev.length) emitFullState();
    nextTickAt = lastTick + interval;
  }

  // Dunia hanya maju saat `playing`. Tick yang jatuh tepat di akhir pertandingan diproses SEBELUM hasil waktu dievaluasi.
  function stepWorld() {
    const now = clock.now();
    let steps = 0;
    while (state === 'playing' && nextTickAt <= now && nextTickAt <= cfg.matchMs && steps < 3) {
      lastTick = nextTickAt;
      doTick(lastTick);
      steps++;
    }
    if (state !== 'playing') return;
    if (nextTickAt <= now - interval && nextTickAt <= cfg.matchMs) { lastTick = now; nextTickAt = now + interval; } // buang tunggakan
    if (now >= cfg.matchMs) { const f = finishMatch(sim).find(e => e.type === 'end'); if (f) endMatch(f); return; }
    const sec = Math.floor(now / 1000);
    if (sec !== lastSecond) { lastSecond = sec; emitFullState(); } // HUD hanya diperbarui saat detik berganti atau ada event
  }

  function loop() {
    if (destroyed) return;
    if (state === 'playing') stepWorld();
    if (sim) {
      const tn = clock.now();
      fx = fx.filter(f => f.until > tn);
      const prog = (state === 'playing' || state === 'paused') ? Math.min(1, (clock.now() - lastTick) / interval) : 1;
      drawTerritory(ctx, canvas.width, canvas.height, sim, { prog, from: prevHeads, t: tn, fx, fxMs: FX_MS });
    }
    rafId = raf(loop);
  }

  reset();
  emit({ overlay: MENU_OVERLAY });
  rafId = raf(loop);

  return {
    setMode() {}, setTaDuration() {},
    setSpeedPref(v) { if (SPEEDS.includes(v)) { speedPref = v; if (!isActive()) { interval = INTERVAL[v]; emitFullState(); } } },
    retrySave() { const ok = writer.retry(); emitFullState(); return ok; },
    startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu, setDir, setDirMP,
    isRunning: isActive, getState: () => state,
    destroy() { destroyed = true; if (rafId) caf(rafId); clock.stop(); },
  };
}
