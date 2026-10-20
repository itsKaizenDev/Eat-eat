// Controller Ekspedisi: 5 ronde pengumpulan/upgrade, lalu 9 gelombang antek dan boss tiga fase. Setelah target ronde tercapai simulasi DIBEKUKAN dan pemain memilih 1 dari 3 upgrade.
// API sama dengan engine lain + chooseUpgrade(id). State: menu | playing | paused | choosingUpgrade | won | lost.
//  - Ronde baru: reset arena/posisi/panjang dasar (dipengaruhi upgrade), efek sementara dibuang; upgrade dan total skor run DIBAWA.
//  - Mati mengakhiri run; upgrade TIDAK terbawa ke run baru. Run berjalan tidak disimpan (hanya rekor saat run selesai).
//  - Ronde menunggu arah pertama sebelum bergerak (tidak ada timer yang menyerang pemain saat menu upgrade baru ditutup).
//  - Seed + pilihan upgrade + input yang sama = jalannya run yang sama (satu aliran RNG per run).
import { createSimClock } from '../sim/clock';
import { createRng } from '../sim/rng';
import { isOpposite } from '../sim/grid';
import { SPEEDS } from '../storage';
import { loadRecords, saveRecords, rogueConfigKey, getRecord, recordRun } from '../records';
import { DEFAULT_CFG, createRound, stepRound, reviveRound, expireEffects, isReversed, DIRS } from './sim';
import { UPGRADES, getUpgrade, emptyCounts, deriveStats, intervalFor, offerUpgrades, EFFECTS, normalValue } from './upgrades';
import { drawRound } from './render';
import { createState as createBattle, stepSim as stepBattle, advance as advanceBattle, reviveBattle, parseArena, ARENA_MAP, START, WEAK_TILES, bossConfig } from '../boss/sim';
import { bossHud } from '../boss/hud';
import { drawBoss } from '../boss/render';
import { expeditionSupplies } from './upgrades';
import { loadRevives, consumeRevive } from './revives';

const BLOCKERS = ['help', 'orientation', 'hidden'];
const KEY_OF = { '0,-1': 'U', '0,1': 'D', '-1,0': 'L', '1,0': 'R' };
const MENU_OVERLAY = { phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' };
const BASE_INTERVAL = { santai: 180, normal: 140, ngebut: 100, konstan: 140 };

export function createRogueliteGame({ canvas, sounds, onUpdate, seed, now: nowFn, raf: rafOpt, caf: cafOpt, io, reviveIO, wallNow, config, inspect }) {
  const cfg = { ...DEFAULT_CFG, ...(config || {}) };
  const ctx = canvas.getContext('2d');
  const realNow = nowFn || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const raf = rafOpt || (typeof requestAnimationFrame === 'function' ? (cb) => requestAnimationFrame(cb) : () => 0);
  const caf = cafOpt || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : () => {});
  const store = io || { load: loadRecords, save: saveRecords };
  const clock = createSimClock(realNow);
  const calendarNow = wallNow || (() => Date.now());
  const reviveStore = reviveIO || { load: loadRevives, consume: consumeRevive };
  let quota = reviveStore.load(calendarNow()), revivePending = false, reviveError = '', quotaCheckedAt = 0;

  let records = store.load();
  let speedPref = 'normal', runSpeed = 'normal';
  let state = 'menu';
  const pauseReasons = new Set();
  let run = null;            // { seed, rng, round, upgrades, stats, doneScore, offer }
  let battle = null;
  let sim = null, prevSnake = [], queue = [], awaiting = false;
  let lastTick = 0, nextTickAt = 0, interval = BASE_INTERVAL.normal, message = '', lastFull = '', destroyed = false, rafId = 0;

  const isActive = () => state === 'playing' || state === 'paused';
  const emit = (p) => { if (!destroyed) onUpdate(p); };
  const baseInterval = () => BASE_INTERVAL[runSpeed] || BASE_INTERVAL.normal;
  const totalScore = () => (run ? run.doneScore + (sim ? sim.roundScore : 0) + (battle ? battle.damageDealt * 10 + battle.minionsDefeated * 5 : 0) : 0);
  const activeSim = () => battle || sim;
  const retime = () => { interval = intervalFor(baseInterval(), run.stats, sim.effects); nextTickAt = lastTick + interval; };

  function rogueHud() {
    if (!run || !sim) return null;
    const t = clock.now();
    return {
      round: run.round, rounds: cfg.rounds, roundScore: sim.roundScore, target: sim.target, total: totalScore(),
      shield: sim.shield, neutral: sim.neutral, awaiting, message, normalValue: normalValue(run.stats),
      reviveSecs: Math.max(0, Math.ceil(((sim.reviveUntil || 0) - t) / 1000)),
      upgrades: UPGRADES.filter(u => run.upgrades[u.id] > 0).map(u => ({ id: u.id, name: u.name, icon: u.icon, stacks: run.upgrades[u.id], max: u.max })),
      effects: sim.effects.map(e => ({ type: e.type, label: EFFECTS[e.type].label, good: EFFECTS[e.type].good, secs: Math.max(0, Math.ceil((e.endsAt - t) / 1000)) })),
      offer: state === 'choosingUpgrade' && run.offer ? run.offer.map(id => { const u = getUpgrade(id); return { id, name: u.name, icon: u.icon, benefit: u.benefit, cost: u.cost, stacks: run.upgrades[id], max: u.max }; }) : null,
      cleared: state === 'choosingUpgrade' ? { round: run.round, roundScore: sim.roundScore, total: totalScore() } : null,
    };
  }
  function menuData() {
    const r = getRecord(records, rogueConfigKey(cfg, speedPref));
    return { best: r.best, bestRounds: r.bestRounds, plays: r.plays, wins: r.wins, rounds: cfg.rounds, speed: speedPref, targets: cfg.targets, combined: true,
      revive: { left: quota.left, resetAt: quota.resetAt, eligible: state === 'lost', busy: revivePending, error: reviveError } };
  }
  function emitFullState() {
    const rec = getRecord(records, rogueConfigKey(cfg, run ? runSpeed : speedPref));
    const h = rogueHud();
    const payload = {
      score: totalScore(), best: rec.best, modeLabel: 'Snake · Ekspedisi Mayhem', mode: 'roguelite',
      effects: h ? h.effects.map(e => ({ type: e.type, label: `${e.label} (${e.good ? 'untung' : 'rugi'})`, t: e.secs + 's' })) : [], mpHud: null, timerText: null,
      running: isActive(), paused: state === 'paused',
      puzzle: null, puzzleMenu: null, delivery: null, deliveryMenu: null, roguelite: battle ? null : h, rogueMenu: menuData(), territory: null, territoryMenu: null, boss: bossHud(battle, message), bossMenu: null,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastFull) return;
    lastFull = signature; emit(payload);
  }

  function newRun() {
    const sd = seed !== undefined ? seed : ((Math.random() * 4294967296) >>> 0);
    const upgrades = emptyCounts();
    return { seed: sd, rng: createRng(sd), round: 1, upgrades, stats: deriveStats(upgrades), doneScore: 0, offer: null, beforeRecords: records, recordScore: 0 };
  }
  function startRound() {
    battle = null;
    sim = createRound({ cfg, stats: run.stats, round: run.round, rng: run.rng }); // efek lama otomatis hilang (state ronde baru)
    prevSnake = sim.snake.map(p => ({ ...p }));
    queue = []; awaiting = true; message = `Ronde ${run.round}/${cfg.rounds}: kumpulkan ${sim.target} poin. Tekan arah untuk mulai.`;
    clock.reset(); lastTick = 0; interval = intervalFor(baseInterval(), run.stats, []); nextTickAt = 0;
  }

  function startBattle() {
    clock.reset(); sim.effects = [];
    const supplies = expeditionSupplies(run.upgrades);
    const bc = bossConfig({ ...supplies.config, ...(cfg.boss || {}) });
    const start = { ...START, snake: Array.from({ length: run.stats.startLen }, (_, i) => [6 - i, 12]) };
    interval = intervalFor(baseInterval(), run.stats, []);
    battle = createBattle({ arena: parseArena(ARENA_MAP, start, WEAK_TILES), config: bc, rng: run.rng, interval, t: 0 });
    battle.energy = Math.min(bc.energyMax, supplies.energy);
    prevSnake = battle.snake.map(p => ({ ...p })); queue = []; awaiting = true;
    lastTick = 0; nextTickAt = interval;
    message = `Bekal kebun: ♥ × ${battle.lives}, energi ${battle.energy}. Tekan arah untuk menghadapi antek.`;
  }

  // ----- lifecycle -----
  function startRun() {
    if (revivePending) return false;
    if (state !== 'menu' && state !== 'won' && state !== 'lost') return false; // hanya berhasil sekali
    pauseReasons.clear(); runSpeed = speedPref; reviveError = ''; quota = reviveStore.load(calendarNow());
    run = newRun(); startRound();
    state = 'playing';
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
    pauseReasons.clear(); state = 'playing';
    if (!awaiting) clock.start();
    emitFullState();
    emit({ overlay: { phase: 'none' } });
    return true;
  }
  const togglePause = () => (state === 'playing' ? pauseRun('user') : state === 'paused' ? resumeRun() : false);
  function returnToMenu() {
    if (revivePending) return false;
    if (state === 'menu') return;
    state = 'menu'; clock.reset(); pauseReasons.clear(); run = null; sim = null; battle = null; queue = []; awaiting = false; message = '';
    emitFullState();
    emit({ overlay: MENU_OVERLAY });
  }

  async function reviveRun() {
    if (state !== 'lost' || revivePending || destroyed) return false;
    revivePending = true; reviveError = ''; emitFullState();
    try {
      // Siapkan posisi aman sebelum memotong jatah. Data ronde asli tidak diubah dulu.
      const candidate = battle ? { ...battle, hazard: battle.hazard.slice(), warn: battle.warn.slice(),
        apples: battle.apples.map(p => ({ ...p })), heals: battle.heals.map(p => ({ ...p })), damageOrbs: battle.damageOrbs.map(p => ({ ...p })) } : { ...sim };
      if (!(battle ? reviveBattle(candidate, clock.now()) : reviveRound(candidate, clock.now()))) {
        reviveError = 'Belum ada tempat aman untuk hidup lagi.'; return false;
      }
      const result = await reviveStore.consume(calendarNow());
      quota = result.quota;
      if (!result.ok) { reviveError = result.reason === 'storage' ? 'Jatah gagal disimpan. Izinkan penyimpanan browser lalu coba lagi.' : 'Jatah revive habis. Tunggu reset berikutnya.'; return false; }
      if (destroyed) return false;
      if (battle) battle = candidate; else sim = candidate;
      state = 'playing'; pauseReasons.clear(); queue = []; awaiting = true;
      prevSnake = activeSim().snake.map(p => ({ ...p })); lastTick = clock.now();
      if (!battle) interval = intervalFor(baseInterval(), run.stats, []);
      nextTickAt = lastTick + interval;
      message = `Hidup lagi${battle ? ' dengan 3 hati' : ''}! Tekan arah untuk lanjut. Perlindungan 3 detik.`;
      emit({ overlay: { phase: 'none' } });
      return true;
    } catch (e) { reviveError = 'Revive belum berhasil. Coba lagi.'; return false; }
    finally { revivePending = false; emitFullState(); }
  }

  // ----- input: hanya saat `playing` (menu upgrade, jeda, hasil: input gameplay DIABAIKAN) -----
  function setDir(x, y) {
    if (state !== 'playing' || !sim) return;
    const current = activeSim();
    if (!battle && isReversed(sim)) { x = -x; y = -y; }
    if (awaiting) {
      // Menunggu arah pertama: menekan arah yang SAMA dengan hadap awal (kanan) juga memulai ronde; berbalik arah ditolak.
      if (isOpposite(current.dir, { x, y })) return;
      if (!(current.dir.x === x && current.dir.y === y)) queue.push({ x, y });
      awaiting = false; message = ''; clock.start(); lastTick = clock.now(); nextTickAt = lastTick + interval;
      emitFullState(); sounds.playMove();
      return;
    }
    const last = queue.length ? queue[queue.length - 1] : current.dir;
    if (isOpposite(last, { x, y }) || (last.x === x && last.y === y) || queue.length >= 2) return;
    queue.push({ x, y });
    sounds.playMove();
  }

  // ----- upgrade -----
  function chooseUpgrade(id) {
    if (state !== 'choosingUpgrade' || !run || !run.offer || !run.offer.includes(id)) return false; // dua klik cepat: hanya yang pertama diterima
    run.upgrades[id] += 1;
    run.stats = deriveStats(run.upgrades);
    run.offer = null;
    if (run.round >= cfg.rounds) startBattle();
    else { run.doneScore += sim.roundScore; run.round += 1; startRound(); }
    state = 'playing';
    message = `${getUpgrade(id).name} diambil. ` + message;
    emitFullState();
    return true;
  }

  // ----- hasil -----
  function endRun(finalState, overlay, opts) {
    if (!isActive() && state !== 'choosingUpgrade') return false;
    const o = opts || {};
    const rounds = finalState === 'won' ? cfg.rounds : run.round;
    state = finalState; clock.stop(); pauseReasons.clear();
    const total = totalScore();
    const previousBest = getRecord(records, rogueConfigKey(cfg, runSpeed)).best;
    run.recordScore = Math.max(run.recordScore, total);
    const res = recordRun(run.beforeRecords, rogueConfigKey(cfg, runSpeed), { score: run.recordScore, rounds, won: finalState === 'won' });
    records = res.records; store.save(records); // disimpan SEKALI per run
    if (o.death) sounds.playDeath(); else if (sounds.playWin) sounds.playWin();
    emitFullState();
    emit({ overlay: { ...overlay, sub: overlay.sub + (total > previousBest ? ' • Rekor baru!' : '') } });
    return true;
  }
  const lose = () => endRun('lost', { phase: 'gameover', mood: 'shock', title: 'Ekspedisi Gagal', sub: `${battle ? `Kebun gelombang ${battle.round}/${battle.cfg.minionRounds + 1}` : `Rute ${run.round}/${cfg.rounds}`} • Skor ${totalScore()}`, btnText: 'Main Lagi' }, { death: true });
  const winRun = () => endRun('won', { phase: 'gameover', mood: 'win', title: 'Ekspedisi Selesai!', sub: `Ekspedisi dan Penjaga Kebun tuntas • Skor ${totalScore()}`, btnText: 'Main Lagi' });

  function roundCleared() {
    clock.stop();
    run.offer = offerUpgrades(run.upgrades, run.rng, 3);
    if (!run.offer.length && run.round >= cfg.rounds) { startBattle(); emitFullState(); return; }
    if (!run.offer.length) { run.doneScore += sim.roundScore; run.round += 1; run.offer = null; startRound(); message = 'Tidak ada upgrade tersedia. ' + message; emitFullState(); return; }
    state = 'choosingUpgrade';
    emitFullState();
  }

  function handleEvents(ev) {
    ev.forEach(e => {
      if (e.type === 'eat') { sounds.playChomp(); message = `+${e.points}`; }
      else if (e.type === 'poison') { sounds.playEits(); message = `Racun! −6 poin${e.cut ? `, ekor −${e.cut}` : ''}.`; }
      else if (e.type === 'neutralized') { message = 'Racun dinetralkan oleh Racikan penawar.'; }
      else if (e.type === 'effect') { message = `${EFFECTS[e.effect].label} (${e.good ? 'menguntungkan' : 'merugikan'})`; }
      else if (e.type === 'shield') { if (sounds.playBump) sounds.playBump(); message = e.action === 'destroyed' ? 'Kulit tebal menahan ledakan ranjau.' : e.action === 'turn' ? 'Kulit tebal menahan tabrakan: ular berbelok.' : 'Kulit tebal menahan tabrakan: ular dipindah ke tempat aman.'; }
    });
  }

  function handleBattleEvents(events) {
    for (const e of events) {
      if (e.type === 'eat' || e.type === 'hit' || e.type === 'minionHit' || e.type === 'heal' || e.type === 'damageOrb') sounds.playChomp();
      if (e.type === 'death') { queue = []; sounds.playEits(); message = `−${e.damage} hati. Sisa ${Math.max(0, e.lives)}.`; }
      else if (e.type === 'respawn') { queue = []; prevSnake = battle.snake.map(p => ({ ...p })); }
      else if (e.type === 'damageOrb') message = `Orb ×2 ditumpuk ${e.stacks} kali. Damage saat ini ${e.damage}.`;
      else if (e.type === 'heal') message = `+${e.amount} hati! Simpanan ♥ × ${e.lives}.`;
      else if (e.type === 'phase') message = `Fase ${e.phase}: serangan lebih cepat, celah bertambah!`;
      else if (e.type === 'round') message = e.boss ? `${battle.variant.name} muncul! Cari titik lemah.` : `Gelombang ${e.round}: kalahkan anteknya.`;
      else if (e.type === 'minionHit') message = e.left ? `${e.left} antek tersisa.` : 'Gelombang tuntas! Ambil heal.';
      else if (e.type === 'window' && e.open) message = 'Bintang terbuka! Isi energi lalu serang.';
      else if (e.type === 'hit') message = `Kena! Boss tersisa ${e.hp} HP.`;
    }
    if (battle.status === 'won') winRun();
    else if (battle.status === 'lost') lose();
  }

  function doTick(T) {
    if (battle) {
      prevSnake = battle.snake.map(p => ({ ...p }));
      handleBattleEvents(stepBattle(battle, queue.length ? queue.shift() : null, T));
      nextTickAt = lastTick + interval;
      return;
    }
    prevSnake = sim.snake.map(p => ({ ...p }));
    const d = queue.length ? queue.shift() : sim.dir;
    const ev = stepRound(sim, KEY_OF[d.x + ',' + d.y], T);
    handleEvents(ev);
    if (sim.status === 'dead') { lose(); return; }
    if (sim.status === 'cleared') { roundCleared(); return; }
    retime();
    emitFullState();
  }

  function stepWorld() {
    const now = clock.now();
    let steps = 0;
    while (state === 'playing' && !awaiting && nextTickAt <= now && steps < 3) { lastTick = nextTickAt; doTick(lastTick); steps++; }
    if (state !== 'playing' || awaiting) return;
    if (nextTickAt <= now - interval) { lastTick = now; nextTickAt = now + interval; }
    if (battle) {
      handleBattleEvents(advanceBattle(battle, now));
      emitFullState(); return;
    }
    if (expireEffects(sim, now)) { retime(); emitFullState(); }
  }

  function loop() {
    if (destroyed) return;
    if (calendarNow() - quotaCheckedAt >= 1000) { quotaCheckedAt = calendarNow(); quota = reviveStore.load(quotaCheckedAt); emitFullState(); }
    if (state === 'playing') stepWorld();
    if (sim) {
      const prog = (state === 'playing' || state === 'paused') && !awaiting ? Math.min(1, (clock.now() - lastTick) / interval) : 1;
      const view = { prog, from: prevSnake, t: clock.now(), reduce: typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches };
      if (battle) drawBoss(ctx, canvas.width, canvas.height, battle, view);
      else drawRound(ctx, canvas.width, canvas.height, sim, view);
    }
    rafId = raf(loop);
  }

  emitFullState();
  emit({ overlay: MENU_OVERLAY });
  rafId = raf(loop);

  if (inspect) {
    inspect({
      get sim() { return sim; }, get battle() { return battle; }, get run() { return run; }, get state() { return state; }, get awaiting() { return awaiting; }, get simNow() { return clock.now(); },
      get interval() { return interval; }, get records() { return records; }, get pauseReasons() { return [...pauseReasons]; },
      setSnake(cells, dirKey) { const current = activeSim(); current.snake = cells.map(([x, y]) => ({ x, y })); current.dir = { ...DIRS[dirKey] }; queue = []; prevSnake = current.snake.map(p => ({ ...p })); },
      stepWorld, doTick,
    });
  }

  return {
    setMode() {}, setTaDuration() {}, setDirMP() {},
    setSpeedPref(v) { if (SPEEDS.includes(v)) { speedPref = v; if (!isActive() && state !== 'choosingUpgrade') emitFullState(); } },
    startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu, setDir, chooseUpgrade, reviveRun,
    isRunning: isActive, getState: () => state,
    destroy() { destroyed = true; if (rafId) caf(rafId); clock.stop(); },
  };
}
