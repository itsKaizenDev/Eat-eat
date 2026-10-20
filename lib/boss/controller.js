// Controller lifecycle Boss Battle "Penjaga Kebun". API sama dengan controller lain. Aturan di sim.js; di sini: jam simulasi
// (membeku saat pause), penjadwal tick, antrean input, HUD yang hanya dikirim saat berubah, rekor, suara.
import { createSimClock } from '../sim/clock';
import { bossConfig, isBossRound, energyNeed, phaseRules, ARENA_MAP, START, WEAK_TILES, DIRS, parseArena, createState, stepSim, advance, weakTile, isInvuln } from './sim';
import { drawBoss } from './render';
import { bossHud } from './hud';
import { SPEEDS } from '../storage';
import { loadRecords, saveRecords, bossConfigKey, getBossRecord, recordBoss } from '../records';
import { isOpposite } from '../sim/grid';

const BLOCKERS = ['help', 'orientation', 'hidden'];
const MENU_OVERLAY = { phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' };
const INTERVAL = { santai: 180, normal: 140, ngebut: 100, konstan: 140 };
const CAUSE = { wall: 'menabrak tepi/area boss', self: 'menabrak tubuh sendiri', hazard: 'terkena bahaya' };
const ATTACK = { row: 'Baris berbahaya', mines: 'Ranjau kebun', corridor: 'Koridor menyempit' };

export function createBossGame({ canvas, sounds, onUpdate, rng, now: nowFn, raf: rafOpt, caf: cafOpt, io, config, inspect }) {
  const cfg = bossConfig(config);
  const ctx = canvas.getContext('2d');
  const rand = rng || Math.random;
  const realNow = nowFn || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const raf = rafOpt || (typeof requestAnimationFrame === 'function' ? (cb) => requestAnimationFrame(cb) : () => 0);
  const caf = cafOpt || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : () => {});
  const store = io || { load: loadRecords, save: saveRecords };
  const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = createSimClock(realNow);
  const arena = parseArena(ARENA_MAP, START, WEAK_TILES);

  let records = store.load();
  let speedPref = 'normal', runSpeed = 'normal';
  let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'won' | 'lost'
  const pauseReasons = new Set();
  let sim = null, prevSnake = [], queue = [], lastTick = 0, nextTickAt = 0, interval = INTERVAL.normal;
  let message = '', lastHud = '', destroyed = false, rafId = null;

  const isActive = () => state === 'playing' || state === 'paused';
  const emit = (p) => { if (!destroyed) onUpdate(p); };
  const keyFor = (sp) => bossConfigKey(sp, cfg);
  const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));

  function reset() {
    interval = INTERVAL[speedPref] || INTERVAL.normal; runSpeed = speedPref;
    sim = arena.errors.length ? null : createState({ arena, config: cfg, rng: rand, interval, t: clock.now() });
    prevSnake = sim ? sim.snake.map(p => ({ ...p })) : [];
    queue = []; lastTick = clock.now(); nextTickAt = lastTick + interval; message = ''; lastHud = '';
    emitFullState(true);
  }

  const hudData = () => bossHud(sim, message);
  function menuData() {
    const r = getBossRecord(records, keyFor(speedPref));
    return { best: r.best, plays: r.plays, wins: r.wins, bestSecs: r.bestSecs, speed: speedPref, maxHp: cfg.bossHp, lives: cfg.lives, rounds: cfg.minionRounds + 1, bestRound: r.bestRounds };
  }
  function emitFullState(force) {
    const hud = hudData(); const sig = JSON.stringify(hud);
    if (!force && sig === lastHud) return; // HUD hanya dikirim saat tampilannya berubah
    lastHud = sig;
    emit({
      score: 0, best: 0, modeLabel: 'Snake · Penjaga Kebun', mode: 'boss', effects: [], mpHud: null, timerText: null,
      running: isActive(), paused: state === 'paused', puzzle: null, puzzleMenu: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null,
      territory: null, territoryMenu: null, boss: hud, bossMenu: menuData(),
    });
  }

  // ----- lifecycle -----
  function startRun() {
    if (!sim || (state !== 'menu' && state !== 'won' && state !== 'lost')) return false;
    clock.reset(); pauseReasons.clear();
    reset();
    state = 'playing'; clock.start();
    lastTick = clock.now(); nextTickAt = lastTick + interval;
    emit({ overlay: { phase: 'none' } });
    emitFullState(true);
    return true;
  }
  function pauseRun(reason) {
    reason = reason || 'user';
    if (!isActive()) return false;
    pauseReasons.add('user'); if (reason !== 'user') pauseReasons.add(reason);
    if (state === 'playing') {
      state = 'paused'; clock.stop();
      emitFullState(true);
      emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Jeda', sub: 'Tekan Main untuk lanjut', btnText: 'Lanjut' } });
    }
    return true;
  }
  const releasePause = (reason) => { if (reason && reason !== 'user') pauseReasons.delete(reason); };
  function resumeRun() {
    if (state !== 'paused') return false;
    if ([...pauseReasons].some(r => BLOCKERS.includes(r))) return false;
    pauseReasons.clear(); state = 'playing'; clock.start();
    emitFullState(true); emit({ overlay: { phase: 'none' } });
    return true;
  }
  const togglePause = () => (state === 'playing' ? pauseRun('user') : state === 'paused' ? resumeRun() : false);
  function returnToMenu() {
    if (state === 'menu') return;
    state = 'menu'; clock.reset(); pauseReasons.clear();
    reset();
    emit({ overlay: MENU_OVERLAY });
  }

  // ----- input -----
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
    if (sounds.playMove) sounds.playMove();
  }
  const setDirMP = () => {};

  // ----- hasil -----
  function endRun(status) {
    if (!isActive()) return false;
    state = status; clock.stop(); pauseReasons.clear();
    const won = status === 'won', sec = Math.round(clock.now() / 1000);
    const rr = recordBoss(records, keyFor(runSpeed), { damage: sim.damageDealt, won, secs: sec, round: sim.round });
    records = rr.records; store.save(records); // sekali per run
    if (won) { if (sounds.playWin) sounds.playWin(); } else if (sounds.playDeath) sounds.playDeath();
    message = won ? 'Penjaga Kebun kalah!' : 'Nyawa habis.';
    emitFullState(true);
    emit({ overlay: won
      ? { phase: 'gameover', mood: 'win', title: 'Penjaga Kebun Kalah!', sub: `Waktu ${sec} dtk • Nyawa tersisa ${Math.max(0, sim.lives)}` + (rr.newBest ? ' • Rekor baru!' : ''), btnText: 'Main Lagi' }
      : { phase: 'gameover', mood: 'shock', title: 'Kehabisan Nyawa', sub: `Ronde ${sim.round}/${cfg.minionRounds + 1} • ` + (isBossRound(sim) ? `${sim.variant.name}: ${sim.hp}/${cfg.bossHp} HP • Fase ${sim.phase}` : `${sim.minionsLeft} antek tersisa`), btnText: 'Coba Lagi' } });
    return true;
  }

  function handleEvents(ev) {
    ev.forEach(e => {
      if (e.type === 'eat') { if (sounds.playChomp) sounds.playChomp(); message = `Energi ${e.energy}/${energyNeed(sim)}.`; }
      else if (e.type === 'hit') { if (sounds.playChomp) sounds.playChomp(); message = e.hp > 0 ? `Kena! Boss tinggal ${e.hp} HP.` : 'Pukulan terakhir!'; }
      else if (e.type === 'death') { if (sounds.playEits && e.lives > 0) sounds.playEits(); message = `−${e.damage} hati (${CAUSE[e.cause]}). Sisa ${Math.max(0, e.lives)}.`; queue = []; }
      else if (e.type === 'respawn') { queue = []; prevSnake = sim.snake.map(p => ({ ...p })); message += ' Kebal sebentar.'; }
      else if (e.type === 'attack' && e.stage === 'tele') message = `${ATTACK[e.kind]}! ${e.damage === 2 ? 'Serangan berat: −2 hati. ' : ''}Hindari area bergaris.`;
      else if (e.type === 'window' && e.open) message = sim.energy >= energyNeed(sim) ? 'Titik lemah terbuka: serang sekarang!' : `Titik lemah terbuka, butuh ${energyNeed(sim)} energi.`;
      else if (e.type === 'phase') message = `Fase ${e.phase}: ${phaseRules(sim).openings} celah, serangan makin cepat!`;
      else if (e.type === 'minionHit') { if (sounds.playChomp) sounds.playChomp(); message = e.left ? `Antek kalah! ${e.left} lagi.` : 'Ronde tuntas! Ambil hati sebelum lanjut.'; }
      else if (e.type === 'damageOrb') { if (sounds.playChomp) sounds.playChomp(); message = `Orb ×2 ditumpuk ${e.stacks} kali. Damage saat ini ${e.damage}.`; }
      else if (e.type === 'heal') { if (sounds.playChomp) sounds.playChomp(); message = `+${e.amount} hati! Simpanan: ${e.lives}.`; }
      else if (e.type === 'round') message = e.boss ? `${sim.variant.name} muncul! Tiga fase, cari celahnya.` : `Ronde ${e.round}: ${sim.minionsTotal} antek menyerang bergiliran.`;
    });
  }

  function doTick(T) {
    prevSnake = sim.snake.map(p => ({ ...p }));
    const d = queue.length ? queue.shift() : null;
    const ev = stepSim(sim, d, T);
    handleEvents(ev);
    const fin = ev.find(e => e.type === 'win' || e.type === 'lose');
    if (fin) { endRun(fin.type === 'win' ? 'won' : 'lost'); return; }
    nextTickAt = lastTick + interval;
  }

  // Dunia hanya maju saat `playing`. Penjadwal boss maju per frame (peringatan/aktif/jendela tepat waktu); gerak ular per tick.
  function stepWorld() {
    const now = clock.now();
    let steps = 0;
    while (state === 'playing' && nextTickAt <= now && steps < 3) { lastTick = nextTickAt; doTick(lastTick); steps++; }
    if (state !== 'playing') return;
    if (nextTickAt <= now - interval) { lastTick = now; nextTickAt = now + interval; } // buang tunggakan
    const ev = advance(sim, now); handleEvents(ev);
    emitFullState(false);
  }

  function loop() {
    if (destroyed) return;
    if (state === 'playing') stepWorld();
    if (sim) {
      const prog = (state === 'playing' || state === 'paused') ? Math.min(1, (clock.now() - lastTick) / interval) : 1;
      drawBoss(ctx, canvas.width, canvas.height, sim, { prog, from: prevSnake, t: clock.now(), reduce: reduceMotion });
    }
    rafId = raf(loop);
  }

  reset();
  emit({ overlay: MENU_OVERLAY });
  rafId = raf(loop);

  if (inspect) inspect({ get sim() { return sim; }, get state() { return state; }, get simNow() { return clock.now(); }, get interval() { return interval; }, get records() { return records; }, get pauseReasons() { return [...pauseReasons]; } });

  return {
    setMode() {}, setTaDuration() {},
    setSpeedPref(v) { if (SPEEDS.includes(v)) { speedPref = v; if (!isActive()) { interval = INTERVAL[v]; emitFullState(true); } } },
    startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu, setDir, setDirMP,
    isRunning: isActive, getState: () => state,
    destroy() { destroyed = true; if (rafId) caf(rafId); clock.stop(); },
  };
}
