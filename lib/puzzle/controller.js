import { CAMPAIGN_LEVELS, CAMPAIGN_VARIANTS } from './campaign';
import { chooseRound } from './rounds';
import { createState, step, action, nearby, hidingSpot, isShadow, gadgetWait, FIXED_DT } from './sim';
import { living } from './navigation';
import { createPuzzleRenderer } from './render';
import { loadProgress, saveProgress, recordHeistResult, isUnlocked, appleCoins, mergeProgress, parseProgress } from '../progress';

const BLOCKERS = ['help', 'orientation', 'hidden'];
const MENU = { phase: 'start', mood: 'idle', title: 'K-Snake', sub: 'Pilih misi dan mulai menyusup.', btnText: 'Mulai misi' };
export const formatTime = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
export function createPuzzleGame({ canvas, sounds = {}, onUpdate = () => {}, levels = CAMPAIGN_LEVELS, io, raf, caf, now, inspect, rng = Math.random }) {
  const store = io || { load: loadProgress, save: saveProgress };
  const clock = now || (() => performance.now());
  const request = raf || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
  const cancel = caf || (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : () => {});
  const renderer = createPuzzleRenderer(canvas);
  let progress = parseProgress(JSON.stringify(store.load())), state = 'menu', destroyed = false, savePending = false, resultOverlay = null;
  let selected = Math.max(0, levels.findIndex((l, i) => isUnlocked(progress, levels, i) && !progress.puzzle.levels[l.id]));
  let world = levels.length ? createState(levels[selected]) : null;
  const reasons = new Set(), held = new Map();
  let previousRound = null;
  let gait = 'walk', shift = false, run = false, rafId = null, lastAt = 0, accumulator = 0, lastHud = -1;
  const active = () => state === 'playing' || state === 'paused';
  const emit = patch => { if (!destroyed) onUpdate(patch); };
  function clearInput() { held.clear(); shift = false; run = false; }
  function input() {
    let x = 0, y = 0;
    // Touch owns direction while held, keyboard resumes immediately when touch ends.
    const pad = held.get('pad');
    if (pad) { x = pad.x; y = pad.y; } else for (const d of held.values()) { x += d.x; y += d.y; }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), sneak: shift, run, gait };
  }
  function menuInfo() {
    return { selected, savePending, coins: appleCoins(progress), levels: levels.map((l, i) => {
      const r = progress.puzzle.levels[l.id], h = r?.heist;
      return { id: l.id, name: l.name, goal: l.goal, par: l.par, best: h ? formatTime(h.bestTimeMs / 1000) : '', stars: h?.stars || 0, legacyBest: r?.best || 0, cleared: !!r, unlocked: isUnlocked(progress, levels, i), tier: l.tier, tutorial: l.tutorial, intro: l.tip };
    }) };
  }
  function hud() {
    const s = world, l = s.level, watching = [...s.guards, ...s.dogs].filter(living).some(g => g.state === 'CHASE');
    const suspicion = Math.max(0, ...[...s.guards, ...s.dogs].filter(living).map(g => g.stunnedUntil > s.time ? 0 : g.suspicion), ...s.crystals.map(c => c.suspicion));
    const status = s.beasts.some(b=>b.state==='WINDUP'||b.state==='RUSH') ? 'Awas terjangan bayangan!' : s.dogs.some(d=>living(d)&&d.barkUntil>s.time) ? 'Anjing menggonggong!' : s.cameraAlarm ? 'Terdeteksi CCTV!' : watching ? 'Dikejar' : s.guards.some(g=>living(g)&&g.cameraReport) ? 'Dicari semua penjaga' : s.player.hidden ? 'Bersembunyi' : suspicion > .1 ? 'Dicurigai' : isShadow(s, s.player) ? 'Dalam bayangan' : 'Belum terlihat';
    return { levelNo: levels.findIndex(level=>level.id===l.id) + 1, levelCount: levels.length, name: l.name, shape: l.shapeLabel, variantId: l.variantId, cameraAlarm: s.cameraAlarm, goal: l.goal, time: formatTime(s.time), par: formatTime(l.par), best: progress.puzzle.levels[l.id]?.heist ? formatTime(progress.puzzle.levels[l.id].heist.bestTimeMs / 1000) : '',
      artifacts: s.artifacts, artifactsTotal: l.artifacts.length, loot: s.loot, lootTotal: l.loot.length, coins: s.coins, coinTotal: l.loot.reduce((sum,o)=>sum+(o.value||1),0), keys: [...s.keys], alerts: s.alerts, suspicion: Math.round(suspicion * 100), statusText: status,
      gadget: s.gadget, gadgetWait: Math.ceil(Math.max(0,gadgetWait(s)-1e-7)), hidden: s.player.hidden, canHide: !!hidingSpot(s), interaction: nearby(s)?.label || '',
      gait, status: state === 'playing' ? s.status : state, message: s.time < s.messageUntil ? s.message : '',
    };
  }
  function refresh(full = false) {
    emit({ mode: 'puzzle', modeLabel: 'Dungeon · Shadow Heist', running: active(), paused: state === 'paused', score: 0, best: 0, effects: [], mpHud: null, timerText: null,
      puzzle: world ? hud() : null, ...(full ? { puzzleMenu: menuInfo() } : {}), delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null });
  }
  function stopLoop() { if (rafId !== null) cancel(rafId); rafId = null; accumulator = 0; }
  function schedule() { if (!destroyed && state === 'playing' && request && rafId === null) rafId = request(frame); }
  function frame(at) {
    rafId = null;
    if (destroyed || state !== 'playing') return;
    accumulator += Math.max(0, Math.min((at - lastAt) / 1000, .1)); lastAt = at;
    while (accumulator + 1e-9 >= FIXED_DT && state === 'playing') {
      step(world, input(), FIXED_DT); accumulator -= FIXED_DT;
      for (const ev of world.events) {
        if (ev === 'pickup') sounds.playChomp?.();
        if (ev === 'alarm' && !world.events.includes('bark')) sounds.playEits?.();
        if (ev === 'bark') sounds.playBark?.();
      }
      if (world.status !== 'playing') finish();
    }
    renderer.draw(world);
    if (at - lastHud >= 100) { refresh(); lastHud = at; }
    schedule();
  }
  function persist() { try { savePending = store.save(progress) === false; } catch { savePending = true; } return !savePending; }
  function emitResult() { if (resultOverlay) emit({ overlay: { ...resultOverlay, sub: resultOverlay.sub + (savePending ? '\nProgres belum tersimpan. Gunakan tombol Coba simpan lagi.' : '') } }); }
  function finish() {
    if (state !== 'playing') return;
    state = world.status; clearInput(); stopLoop();
    if (state === 'won') {
      const r = recordHeistResult(mergeProgress(progress, store.load()), world.level.id, world.result, world.level.revision);
      progress = r.progress; persist(); sounds.playWin?.();
      const stars = world.result.stars, hasNext = selected + 1 < levels.length;
      resultOverlay = { phase: 'gameover', mood: 'win', title: hasNext ? 'Misi berhasil!' : 'Semua relik kembali!', btnText: hasNext ? 'Misi berikutnya' : 'Main lagi',
        sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${formatTime(world.time)}\nRelik ${world.artifacts}/${world.level.artifacts.length} · Apple Coin ${world.coins} · Alarm ${world.alerts}\n${stars === 3 ? 'Sempurna: tanpa alarm, semua bonus, dan waktu acuan tercapai.' : stars === 2 ? `Tanpa alarm. Bintang ketiga: semua bonus dalam ${formatTime(world.level.par)}.` : 'Misi tuntas. Hindari alarm untuk bintang kedua.'}\n+${r.earned} koin · saldo ${appleCoins(progress)}` };
      if (hasNext) selected++;
    } else { sounds.playDeath?.(); resultOverlay = { phase: 'gameover', mood: 'shock', title: 'Misi gagal!', sub: `${formatTime(world.time)} · ${world.level.name}\n${world.lossReason || 'Misi gagal. Amati rute musuh dan gunakan alat untuk lolos.'}`, btnText: 'Coba lagi' }; }
    refresh(true); emitResult();
  }
  function startRun() {
    if (!levels.length || destroyed || active()) return false;
    const base=levels[selected], variants=CAMPAIGN_VARIANTS[base.number-1];
    const level=chooseRound(base,CAMPAIGN_LEVELS.includes(base)&&variants?.[0]?.id===base.id?variants:null,rng,previousRound);
    previousRound=level;
    world = createState(level); state = 'playing'; reasons.clear(); clearInput(); gait = 'walk'; resultOverlay = null; lastAt = clock(); accumulator = 0;
    emit({ overlay: { phase: 'none' } }); refresh(true); renderer.draw(world); schedule(); return true;
  }
  function pauseRun(reason = 'user') {
    if (!active()) return false;
    reasons.add(reason); clearInput(); stopLoop(); state = 'paused'; refresh();
    emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Misi dijeda', sub: 'Waktu dan penjaga berhenti. Lanjutkan saat siap.', btnText: 'Lanjutkan' } }); return true;
  }
  function resumeRun() {
    if (state !== 'paused' || [...reasons].some(r => BLOCKERS.includes(r))) return false;
    reasons.clear(); clearInput(); state = 'playing'; lastAt = clock(); accumulator = 0;
    emit({ overlay: { phase: 'none' } }); refresh(); schedule(); return true;
  }
  function returnToMenu() { if (destroyed) return; stopLoop(); clearInput(); reasons.clear(); state = 'menu'; resultOverlay = null; world = levels.length ? createState(levels[selected]) : null; refresh(true); if (world) renderer.draw(world); emit({ overlay: MENU }); }
  function restartLevel() {
    if (!active() && state !== 'lost' && state !== 'won') return false;
    if ([...reasons].some(r => BLOCKERS.includes(r))) return false;
    if (world) selected = levels.findIndex(level=>level.id===world.level.id);
    stopLoop(); state = 'menu'; return startRun();
  }
  const api = {
    setMode() {}, setSpeedPref() {}, setTaDuration() {}, setDirMP() {},
    startRun, pauseRun, resumeRun, releasePause: r => reasons.delete(r), togglePause: () => state === 'playing' ? pauseRun() : resumeRun(), returnToMenu, restartLevel,
    setLevel(i) { if (state !== 'menu' || !isUnlocked(progress, levels, i)) return false; selected = i; world = createState(levels[i]); refresh(true); renderer.draw(world); return true; },
    setDir(x, y, meta = {}) { if (state !== 'playing' || !Number.isFinite(x) || !Number.isFinite(y)) return; held.set(meta.source || 'pad', { x, y }); },
    cancelHeldInput(source) { held.delete(source || 'pad'); }, clearInput,
    setModifier(type, value) { if (type === 'sneak') shift = state === 'playing' && value; if (type === 'run') run = state === 'playing' && value; },
    setGait(value) { if (['sneak', 'walk', 'run'].includes(value)) { gait = value; refresh(); } },
    action(type) { if (state !== 'playing') return false; const changed = action(world, type); refresh(); renderer.draw(world); return changed; },
    retrySave() { if (!savePending || active()) return false; progress = mergeProgress(progress, store.load()); const ok = persist(); refresh(true); if (state === 'won') emitResult(); return ok; },
    resize() { renderer.invalidate(); if (world) renderer.draw(world); },
    isRunning: active, getState: () => state,
    destroy() { destroyed = true; stopLoop(); clearInput(); renderer.destroy(); },
  };
  inspect?.({ get world() { return world; }, get input() { return input(); } });
  refresh(true); if (world) renderer.draw(world); emit({ overlay: MENU }); return api;
}
