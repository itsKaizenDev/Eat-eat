// Controller lifecycle Puzzle: menyambungkan simulasi murni (sim.js) ke UI, penyimpanan progres, dan render.
// API sengaja SAMA dengan engine arcade (startRun/pauseRun/resumeRun/releasePause/togglePause/returnToMenu/
// setDir/destroy/getState/isRunning) sehingga GameCanvas/page tidak perlu tahu mode apa yang berjalan.
// Tidak ada jam, RAF, atau GSAP: puzzle berbasis langkah, jadi layar hanya digambar saat state berubah.
import { CAMPAIGN_LEVELS } from './campaign';
import { newSession, move, undo as undoSim, restart as restartSim, exitStatus } from './sim';
import { drawPuzzle } from './render';
import { loadProgress, saveProgress, recordPuzzleResult, isUnlocked, appleCoins, mergeProgress } from '../progress';

const BLOCKERS = ['help', 'orientation', 'hidden'];
const KEY_OF = { '0,-1': 'U', '0,1': 'D', '-1,0': 'L', '1,0': 'R', '0,0': 'W' };
const MENU_OVERLAY = { phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' };

const STEP_MS = 120; // lama luncuran satu langkah (visual saja; simulasi tetap berbasis langkah)
const FX_MS = 360;

export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: rafOpt, caf: cafOpt, now: nowOpt }) {
  const L = levels || CAMPAIGN_LEVELS;
  const ctx = canvas.getContext('2d');
  const store = io || { load: loadProgress, save: saveProgress };
  let progress = store.load();
  let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'won' | 'lost'
  const pauseReasons = new Set();
  let destroyed = false, completed = false, message = '', savePending = false, lastResult = null;
  const firstOpen = () => { const i = L.findIndex((l, k) => isUnlocked(progress, L, k) && !progress.puzzle.levels[l.id]); return i === -1 ? 0 : i; };
  let selected = firstOpen();
  let session = L.length ? newSession(L[selected]) : null;

  const isActive = () => state === 'playing' || state === 'paused';
  const emit = (p) => { if (!destroyed) onUpdate(p); };

  // ----- animasi visual (tidak memengaruhi simulasi) -----
  const raf = rafOpt || (typeof requestAnimationFrame === 'function' ? (cb) => requestAnimationFrame(cb) : null);
  const caf = cafOpt || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : () => {});
  const clockNow = nowOpt || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let anim = null, fx = [], rafId = 0, pendingInput = null, pauseAt = null;
  const currentView = () => {
    const t = pauseAt === null ? clockNow() : pauseAt, v = {};
    if (anim) { const p = (t - anim.t0) / anim.dur; if (p < 1) v.anim = { from: anim.from, guards: anim.guards, p: Math.max(0, p) }; }
    v.fx = fx.map(f => ({ kind: f.kind, x: f.x, y: f.y, p: (t - f.t0) / f.dur })).filter(f => f.p < 1);
    return v;
  };
  function pump() {
    rafId = 0;
    if (destroyed || state === 'paused') return;
    const t = clockNow();
    if (anim && t - anim.t0 >= anim.dur) anim = null;
    fx = fx.filter(f => t - f.t0 < f.dur);
    drawNow();
    if (!anim && pendingInput && state === 'playing') { const d = pendingInput; pendingInput = null; setDir(d.x, d.y, d); }
    if ((anim || fx.length) && raf && !rafId) rafId = raf(pump);
  }
  function drawNow() { if (session && !destroyed) drawPuzzle(ctx, canvas.width, canvas.height, session, currentView()); }
  // Loop RAF hanya hidup selama ada animasi; saat diam tidak ada pekerjaan per-frame.
  const draw = () => { drawNow(); if (state !== 'paused' && (anim || fx.length) && raf && !rafId) rafId = raf(pump); };
  function beginAnim(fromSnake, effects, guards) {
    if (!raf || reducedMotion()) { anim = null; fx = []; return; }
    const t = clockNow();
    anim = { from: fromSnake.map(s => ({ x: s.x, y: s.y })), guards: guards || [], t0: t, dur: STEP_MS };
    fx = (effects || []).map(e => ({ ...e, t0: t, dur: FX_MS }));
  }

  const currentBest = (level, rec) => rec && (rec.revision || 1) === (level.revision || 1) ? rec.best : 0;
  function levelInfo(i) {
    const l = L[i], rec = progress.puzzle.levels[l.id];
    return { id: l.id, name: l.name, goal: l.goal, par: l.par, best: currentBest(l, rec), legacyBest: rec && !currentBest(l, rec) ? rec.best : 0, cleared: !!rec, unlocked: isUnlocked(progress, L, i), tutorial: !!l.tutorial, tier: l.tier || '', intro: l.intro || null };
  }
  // Ringkasan penjaga untuk HUD: null bila level tanpa penjaga; 'chase' > 'return' > 'stunned' > 'idle'.
  function guardStatus() {
    const gs = (session.state.guards || []).filter(g => g.hp !== 0);
    if (!gs.length) return null;
    if (gs.some(g => g.cd === 0 && g.mode === 'windup')) return 'windup';
    if (gs.some(g => g.cd === 0 && g.mode === 'recover')) return 'recover';
    if (gs.some(g => g.cd === 0 && g.mode === 'alert')) return 'alert';
    if (gs.some(g => g.cd === 0 && g.mode === 'chase')) return 'chase';
    if (gs.some(g => g.cd === 0 && g.mode === 'return')) return 'return';
    if (gs.every(g => g.cd > 0)) return 'stunned';
    return 'idle';
  }
  function puzzleHud() {
    const lv = session.level, st = exitStatus(lv, session.state), rec = progress.puzzle.levels[lv.id];
    return {
      levelNo: L.indexOf(lv) + 1, levelCount: L.length, name: lv.name, goal: lv.goal,
      steps: session.state.steps, par: lv.par, best: currentBest(lv, rec),
      keys: { have: st.keysHave, need: st.keysNeed }, plates: { active: st.platesActive, need: st.platesNeed },
      hammer: session.state.hammer || 0, shield: session.state.shield || 0, guard: guardStatus(), tier: lv.tier || '',
      hearts: session.state.hearts, enemies: { left: session.state.guards.filter(g => g.hp !== 0).length, total: lv.guards.length },
      levers: { active: lv.gates.filter(g => g.open === 'lever' && session.state.cleared.includes(g.x + ',' + g.y)).length, total: lv.gates.filter(g => g.open === 'lever').length },
      apples: session.state.apples || 0, applesTotal: lv.foods.length, coins: appleCoins(progress),
      legend: [lv.cracks.length && { icon: 'hammer', text: 'Batu krem retak → pakai palu' }, lv.gates.length && { icon: 'lock', text: 'Injak tuas untuk membuka jeruji' }, lv.guards.length && { icon: 'eye', text: 'Arah ke musuh = serang · petak ! = hindari' }].filter(Boolean),
      message, canUndo: state === 'playing' && session.history.length > 0, status: session.state.status,
    };
  }
  function emitFullState() {
    if (!session) { emit({ running: false, paused: false, puzzle: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null, puzzleMenu: { levels: [], selected: 0 }, mode: 'puzzle', modeLabel: 'Snake · Dungeon', effects: [], mpHud: null, timerText: null, score: 0, best: 0 }); return; }
    const rec = progress.puzzle.levels[session.level.id];
    emit({
      score: session.state.steps, best: currentBest(session.level, rec), modeLabel: 'Snake · Dungeon', mode: 'puzzle',
      effects: [], mpHud: null, timerText: null, running: isActive(), paused: state === 'paused',
      puzzle: puzzleHud(), puzzleMenu: { levels: L.map((_, i) => levelInfo(i)), selected, coins: appleCoins(progress), savePending }, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
    });
  }
  function refresh() { emitFullState(); draw(); }

  // ----- lifecycle -----
  function startRun() {
    if (!L.length || (state !== 'menu' && state !== 'won' && state !== 'lost')) return false; // hanya berhasil sekali
    session = newSession(L[selected]); completed = false; message = ''; pauseReasons.clear();
    pendingInput = null; anim = null; fx = []; pauseAt = null; lastResult = null;
    state = 'playing';
    emit({ overlay: { phase: 'none' } });
    refresh();
    return true;
  }
  function pauseRun(reason) {
    reason = reason || 'user';
    if (!isActive()) return false;
    pauseReasons.add('user');
    if (reason !== 'user') pauseReasons.add(reason);
    if (state === 'playing') {
      state = 'paused'; pauseAt = clockNow(); pendingInput = null;
      if (rafId) caf(rafId); rafId = 0;
      refresh();
      emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Jeda', sub: 'Tekan Main untuk lanjut', btnText: 'Lanjut' } });
    }
    return true;
  }
  function releasePause(reason) { if (reason && reason !== 'user') pauseReasons.delete(reason); }
  function resumeRun() {
    if (state !== 'paused') return false;
    if ([...pauseReasons].some(r => BLOCKERS.includes(r))) return false;
    const elapsed = pauseAt === null ? 0 : clockNow() - pauseAt;
    if (anim) anim.t0 += elapsed;
    fx.forEach(f => { f.t0 += elapsed; }); pauseAt = null;
    pauseReasons.clear(); state = 'playing';
    refresh();
    emit({ overlay: { phase: 'none' } });
    return true;
  }
  const togglePause = () => (state === 'playing' ? pauseRun('user') : state === 'paused' ? resumeRun() : false);
  function returnToMenu() {
    if (state === 'menu') return;
    state = 'menu'; pauseReasons.clear(); message = ''; pendingInput = null; anim = null; fx = []; pauseAt = null;
    if (L.length) session = newSession(L[selected]);
    refresh();
    emit({ overlay: MENU_OVERLAY });
  }
  function setLevel(i) {
    if (state !== 'menu' || !Number.isInteger(i) || i < 0 || i >= L.length || !isUnlocked(progress, L, i)) return false;
    selected = i; session = newSession(L[i]); message = '';
    refresh();
    return true;
  }

  // ----- input: satu input valid = satu langkah. Hanya saat `playing`; tidak memulai/melanjutkan dari arah. -----
  function setDir(x, y, meta) {
    if (state !== 'playing') return;
    const k = KEY_OF[x + ',' + y];
    if (!k) return;
    if (anim && clockNow() - anim.t0 < anim.dur && raf && !reducedMotion()) {
      pendingInput = { x, y, ...(meta || {}) };
      return;
    }
    pendingInput = null;
    const r = move(session, k);
    if (!r.moved) {
      if (r.reason === 'selesai') return;
      message = r.reason === 'tembok' ? 'Terhalang tembok.' : r.reason === 'tubuh' ? 'Terhalang tubuhmu sendiri.' : r.reason === 'berbalik' ? 'Tidak bisa berbalik arah.'
        : r.reason === 'duri' ? 'Duri! Butuh Perisai (S).' : r.reason === 'retak' ? 'Tembok retak! Butuh Palu (P).' : r.reason === 'gerbang' ? 'Gerbang tertutup. Cari tuas yang terhubung.'
        : r.detail && r.detail.keysMissing ? `Pintu terkunci: butuh ${r.detail.keysMissing} kunci lagi.`
        : `Pintu terkunci: sakelar ${(r.detail ? r.detail.missingPlates : []).map(s => s.toUpperCase()).join(', ')} belum diaktifkan.`;
      // Gerakan tertahan tidak memakai giliran; bunyi tumbukan dibedakan dari peringatan musuh.
      if (r.reason === 'pintu') { if (sounds.playLocked) sounds.playLocked(); } else if (r.reason !== 'berbalik') { if (sounds.playBump) sounds.playBump(); }
      refresh();
      return;
    }
    const prevSnake = session.state.snake, prevGuards = session.state.guards;
    session = r.session;
    const head = session.state.snake[0];
    beginAnim(prevSnake, [r.events.ate && { kind: 'pop', x: head.x, y: head.y }, r.events.key && { kind: 'key', x: head.x, y: head.y }, r.events.warped && { kind: 'warp', x: head.x, y: head.y }, r.events.attackAt && { kind: 'hit', ...r.events.attackAt }, r.events.hurt && { kind: 'hurt', x: head.x, y: head.y }].filter(Boolean), prevGuards);
    const ev = r.events;
    message = ev.won ? '' : ev.stung ? '' : ev.hurt ? `Kena serangan! Hati ${session.state.hearts}/3. Hindari petak bertanda !.` : ev.shielded ? 'Perisai menahan serangan! Penjaga pingsan sebentar.' : ev.defeated ? 'Musuh tumbang! Jalannya sekarang bebas.' : ev.hit ? 'Kena! Arahkan lagi ke musuh untuk menyerang.' : ev.alerted ? 'Terlihat! Satu giliran untuk kabur atau sembunyi.'
      : session.state.guards.some(g => g.hp !== 0 && g.mode === 'windup') ? 'Serangan disiapkan! Keluar dari petak bertanda !.'
      : ev.leverOn ? 'Tuas aktif. Jeruji terbuka permanen.' : ev.pickup === 'heal' ? `Hati dipulihkan: ${session.state.hearts}/3.` : ev.pickup === 'shield' ? 'Perisai didapat!' : ev.pickup === 'hammer' ? 'Palu didapat! Cari batu krem yang retak.' : ev.key ? 'Kunci didapat!' : ev.ate ? '+1 koin apel. Bawa keluar untuk menyimpannya.' : ev.switchOn ? 'Sakelar aktif, tidak perlu ditahan.' : ev.warped ? 'Lewat portal.' : k === 'W' ? 'Menunggu satu giliran.' : '';
    if (ev.ate || ev.key || ev.pickup) sounds.playChomp(); else sounds.playMove();
    if (ev.alerted && !ev.stung && !ev.won && sounds.playEits) sounds.playEits();
    if (ev.won) win(); else if (ev.stung) lose(); else refresh();
  }

  function undo() {
    if (state !== 'playing') return false;
    pendingInput = null;
    const r = undoSim(session);
    if (!r.undone) { message = 'Belum ada langkah untuk dibatalkan.'; refresh(); return false; }
    const before = session.state.snake, beforeGuards = session.state.guards;
    session = r.session; message = 'Langkah dibatalkan.';
    beginAnim(before, [], beforeGuards);
    refresh();
    return true;
  }
  function restartLevel() {
    if (state !== 'playing') return false;
    pendingInput = null;
    session = restartSim(session); completed = false; message = 'Ruang diulang.'; anim = null; fx = [];
    refresh();
    return true;
  }

  // Selesai level: dicatat SEKALI per percobaan (`completed`), progres disimpan sekali, level berikutnya terbuka.
  function win() {
    if (completed || state !== 'playing') return;
    completed = true; state = 'won'; pendingInput = null;
    const lv = session.level, steps = session.state.steps;
    const r = recordPuzzleResult(mergeProgress(progress, store.load()), lv.id, steps, lv.revision || 1, session.state.apples);
    progress = r.progress;
    persistProgress();
    const hasNext = selected + 1 < L.length;
    const isLast = !hasNext;
    if (hasNext) selected += 1;
    if (sounds.playWin) sounds.playWin();
    const notes = [r.newBest && !r.firstClear ? 'Rekor baru!' : null, steps <= lv.par ? 'Par tercapai!' : null].filter(Boolean);
    lastResult = { title: isLast ? 'Semua Ruang Tamat!' : 'Ruang Selesai!', sub: `Langkah: ${steps} • Acuan: ${lv.par}${notes.length ? ' • ' + notes.join(' ') : ''}`, earned: r.earned || 0, btnText: hasNext ? 'Ruang Berikutnya' : 'Main Lagi' };
    refresh();
    emitWin();
  }

  function persistProgress() {
    try { savePending = store.save(progress) === false; } catch (e) { savePending = true; }
    return !savePending;
  }
  function emitWin() {
    if (!lastResult) return;
    emit({ overlay: { phase: 'gameover', mood: 'win', title: lastResult.title, btnText: lastResult.btnText,
      sub: lastResult.sub + (savePending ? ' • Progres belum tersimpan; coba simpan lagi.' : ` • +${lastResult.earned} koin apel · saldo ${appleCoins(progress)}`) } });
  }
  function retrySave() {
    if (!savePending || isActive()) return false;
    progress = mergeProgress(progress, store.load());
    const saved = persistProgress(); refresh();
    if (state === 'won') emitWin();
    return saved;
  }

  // Tiga hati habis = game over: sekali per percobaan, tanpa menyimpan progres. "Coba Lagi" memulai level yang sama.
  function lose() {
    if (completed || state !== 'playing') return;
    completed = true; state = 'lost'; pendingInput = null;
    const steps = session.state.steps;
    if (sounds.playDeath) sounds.playDeath();
    refresh();
    emit({ overlay: { phase: 'gameover', mood: 'shock', title: 'Hati Habis!', sub: `Kalah di langkah ${steps}. Ruang ${L.indexOf(session.level) + 1}. Hindari sasaran ! atau serang penjaga lebih dulu.`, btnText: 'Coba Lagi' } });
  }

  draw();
  emitFullState();
  emit({ overlay: MENU_OVERLAY });

  return {
    setMode() {}, setSpeedPref() {}, setTaDuration() {}, setDirMP() {},
    setLevel, startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu,
    setDir, undo, restartLevel, retrySave,
    cancelHeldInput(source) { if (pendingInput?.repeat && pendingInput.source === source) pendingInput = null; },
    isRunning: isActive, getState: () => state,
    destroy() { destroyed = true; if (rafId) caf(rafId); rafId = 0; },
  };
}
