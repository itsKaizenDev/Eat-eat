import { bossHint } from './boss';
import { BOSS_LEVEL, CAMPAIGN_LEVELS, CAMPAIGN_VARIANTS, INFERNO_START } from './campaign';
import { chooseRound } from './rounds';
import { ARENA_TRANSITION_MS, ARRIVAL_MS, CINEMATICS, cinematicFrame } from './cinematics';
import { createState, step, action, nearby, gadgetWait, FIXED_DT } from './sim';
import { DUNGEON_TOOLS } from './powers';
import { living } from './navigation';
import { createPuzzleRenderer } from './render';
import { loadProgress, saveProgress, recordHeistResult, isUnlocked, appleCoins, mergeProgress, parseProgress } from '../progress';

const BLOCKERS = ['help', 'orientation', 'hidden'];
const MENU = { phase: 'start', mood: 'idle', title: 'K-Snake', sub: 'Pilih misi dan mulai menyusup.', btnText: 'Mulai misi' };
export const formatTime = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
export function createPuzzleGame({ canvas, sounds = {}, onUpdate = () => {}, levels = CAMPAIGN_LEVELS, io, raf, caf, now, inspect, rng = Math.random, onExpedition }) {
  const store = io || { load: loadProgress, save: saveProgress };
  const clock = now || (() => performance.now());
  const request = raf || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
  const cancel = caf || (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : () => {});
  const renderer = createPuzzleRenderer(canvas, { domHud: true });
  let progress = parseProgress(JSON.stringify(store.load())), state = 'menu', destroyed = false, savePending = false, resultOverlay = null;
  let selected = Math.max(0, levels.findIndex((l, i) => isUnlocked(progress, levels, i) && !progress.puzzle.levels[l.id]));
  let world = levels.length ? createState(levels[selected]) : null;
  const reasons = new Set(), held = new Map(), sprintSources = new Set();
  let previousRound = null, story = null, arrival = null;
  let gait = 'walk', shift = false, rafId = null, lastAt = 0, accumulator = 0, lastHud = -1, footDistance = 0;
  const active = () => state === 'playing' || state === 'paused';
  const emit = patch => { if (!destroyed) onUpdate(patch); };
  function clearInput() { held.clear(); sprintSources.clear(); shift = false; }
  function input() {
    let x = 0, y = 0;
    // Touch owns direction while held, keyboard resumes immediately when touch ends.
    const pad = held.get('pad');
    if (pad) { x = pad.x; y = pad.y; } else for (const d of held.values()) { x += d.x; y += d.y; }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), sneak: shift, run: sprintSources.size > 0, gait };
  }
  function menuInfo() {
    return { selected, savePending, coins: appleCoins(progress), levels: levels.map((l, i) => {
      const r = progress.puzzle.levels[l.id], h = r?.heist?.revision === l.revision ? r.heist : null;
      return { id: l.id, name: l.name, chapter: l.chapter, boss: !!l.boss, goal: l.goal, par: l.par, best: h ? formatTime(h.bestTimeMs / 1000) : '', stars: h?.stars || 0, legacyBest: r?.best || 0, cleared: !!r, unlocked: isUnlocked(progress, levels, i), tier: l.tier, tutorial: l.tutorial, intro: l.boss ? l.tip + ' Bintang: 5 nyawa = 3; 3–4 nyawa = 2; 1–2 nyawa = 1.' : l.tip };
    }) };
  }
  function hud() {
    const s = world, l = s.level, watching = [...s.guards, ...s.dogs].filter(living).some(g => g.state === 'CHASE');
    const suspicion = Math.max(0, ...[...s.guards, ...s.dogs].filter(living).map(g => g.stunnedUntil > s.time ? 0 : g.suspicion), ...s.crystals.map(c => c.suspicion));
    const status = s.boss ? bossHint(s) : s.beasts.some(b => b.kind === 'echo' && b.mark && ['TELEGRAPH', 'STRIKE'].includes(b.state) && Math.hypot(b.mark.x - s.player.x, b.mark.y - s.player.y) < 4) ? 'Pemakan Gema mengunci lingkaran ungu!' : s.guards.some(g=>g.charge?.stage==='brace' && Math.hypot(g.x-s.player.x,g.y-s.player.y)<6) ? 'Warden bersiap! Keluar ke samping jalur.' : s.beasts.some(b=>b.kind==='spider'&&(b.state==='TELEGRAPH'||b.state==='STRIKE')) ? 'Laba-laba turun ke tanda di lantai!' : s.beasts.some(b=>b.kind==='mimic'&&(b.state==='WINDUP'||b.state==='BITE')) ? 'Peniru terbuka, mundur!' : s.beasts.some(b=>(!b.kind||b.kind==='shadow')&&(b.state==='WINDUP'||b.state==='RUSH')) ? 'Awas terjangan bayangan!' : s.dogs.some(d=>living(d)&&d.barkUntil>s.time) ? 'Anjing menggonggong!' : s.cameraAlarm ? 'Terdeteksi CCTV!' : watching ? 'Dikejar' : s.guards.some(g=>living(g)&&g.cameraReport) ? 'Dicari semua penjaga' : s.player.hidden ? 'Bersembunyi' : suspicion > .1 ? 'Dicurigai' : s.player.stealth ? 'Stealth aktif' : 'Belum terlihat';
    return { chapter: state === 'story' && story.kind !== 'opening' ? 'inferno' : l.chapter, cinematic: story?.kind, cinematicFrame: story?.frame, boss: s.boss ? { hp: s.boss.hp, maxHp: s.boss.maxHp, phase: s.boss.phase, lives: s.boss.lives, stage: s.boss.state } : null, environment: l.shape || l.plan?.shape || 'ruins', camera: renderer.view(), levelNo: levels.findIndex(level=>level.id===l.id) + 1, levelCount: levels.length, name: l.name, shape: l.shapeLabel, variantId: l.variantId, cameraAlarm: s.cameraAlarm, goal: l.goal, time: formatTime(s.time), par: formatTime(l.par), best: progress.puzzle.levels[l.id]?.heist?.revision === l.revision ? formatTime(progress.puzzle.levels[l.id].heist.bestTimeMs / 1000) : '',
      artifacts: s.artifacts, artifactsTotal: l.artifacts.length, loot: s.loot, lootTotal: l.loot.length, coins: s.coins, coinTotal: l.artifacts.reduce((n,a)=>n+(a.value||0),0)+l.loot.reduce((sum,o)=>sum+(o.value||1),0), keys: [...s.keys], alerts: s.alerts, suspicion: Math.round(suspicion * 100), statusText: status,
      gadget: s.gadget, gadgetWait: Math.ceil(Math.max(0,gadgetWait(s)-1e-7)), sprinting: sprintSources.size > 0, gadgetCooldown: DUNGEON_TOOLS[s.gadget].cooldown, interaction: nearby(s)?.label || '',
      threatLevel: watching ? 1 : suspicion, status: state === 'playing' ? s.status : state, message: s.time < s.messageUntil ? s.message : '',
    };
  }
  function refresh(full = false) {
    emit({ recordSave: null, mode: 'puzzle', modeLabel: world?.level.chapter === 'inferno' ? 'Dungeon · Neraka' : 'Dungeon · Shadow Heist', running: active(), paused: state === 'paused', score: 0, best: 0, effects: [], mpHud: null, timerText: null,
      puzzle: world ? hud() : null, ...(full ? { puzzleMenu: menuInfo() } : {}), delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null });
  }
  function stopLoop() { if (rafId !== null) cancel(rafId); rafId = null; accumulator = 0; }
  function playEvents() {
    const events = world.events.splice(0);
    for (const ev of events) {
      if (ev === 'pickup' && !events.includes('artifact')) sounds.playChomp?.();
      if (ev === 'alarm' && !events.includes('bark')) sounds.playEits?.();
      if (ev === 'bark') sounds.playEvent?.('hunterClaw');
      else sounds.playEvent?.(ev);
    }
  }
  const playingStory = () => state === 'story' && story.frame < CINEMATICS[story.kind].frames.length;
  function schedule() {
    if (!destroyed && (state === 'playing' || state === 'arrival' || playingStory()) && request && rafId === null) rafId = request(frame);
  }
  function drawWorld() {
    if (!world) return;
    if (arrival) {
      renderer.draw(world, { kind: 'arrival', progress: Math.min(1, arrival.elapsed / ARRIVAL_MS) });
    } else if (story?.fromArena) {
      renderer.draw(world, { kind: story.kind, progress: Math.min(1, story.elapsed / ARENA_TRANSITION_MS) });
    } else renderer.draw(world);
  }
  function frame(at) {
    rafId = null;
    if (destroyed) return;
    if (playingStory()) {
      advanceCinematic(at);
      schedule();
      return;
    }
    if (arrival) {
      arrival.elapsed += Math.max(0, Math.min(80, at - lastAt));
      lastAt = at;
      drawWorld();
      if (arrival.elapsed >= ARRIVAL_MS) {
        arrival = null;
        state = 'playing';
        refresh();
        emit({ overlay: { phase: 'none' } });
      }
      schedule();
      return;
    }
    if (state !== 'playing') return;
    accumulator += Math.max(0, Math.min((at - lastAt) / 1000, .1)); lastAt = at;
    while (accumulator + 1e-9 >= FIXED_DT && state === 'playing') {
      const before = { x: world.player.x, y: world.player.y };
      step(world, input(), FIXED_DT); accumulator -= FIXED_DT;
      playEvents();
      if (world.player.gait === 'run' || (world.player.gait !== 'sneak' && !world.player.hidden && !world.player.stealth)) footDistance += Math.hypot(world.player.x-before.x,world.player.y-before.y);
      if (footDistance >= .85) { sounds.playEvent?.('footstep'); footDistance = 0; }
      if (world.status !== 'playing') finish();
    }
    drawWorld();
    if (at - lastHud >= 100) { refresh(); lastHud = at; }
    schedule();
  }
  function persist() { try { savePending = store.save(progress) === false; } catch { savePending = true; } return !savePending; }
  function emitResult() {
    if (story) {
      emit({ overlay: {
        phase: 'cutscene', mood: 'idle', cinematic: story.kind,
        cinematicFrame: story.frame, fromArena: story.fromArena,
      } });
    } else if (resultOverlay) {
      const notice = savePending ? '\nProgres belum tersimpan. Gunakan tombol Coba simpan lagi.' : '';
      emit({ overlay: { ...resultOverlay, sub: resultOverlay.sub + notice } });
    }
  }
  function showCinematic(kind, fromArena) {
    state = 'story';
    story = { kind, fromArena, elapsed: 0, lastAt: clock(), frame: -1 };
    refresh(true);
    emitResult();
    if (fromArena) sounds.playEvent?.(CINEMATICS[kind].openingCue);
    schedule();
    return true;
  }
  function advanceCinematic(at) {
    const movie = CINEMATICS[story.kind];
    // RAF can stop in a background tab. A long frame must not skip illustrated shots.
    story.elapsed += Math.max(0, Math.min(80, at - story.lastAt));
    story.lastAt = at;
    if (story.frame < 0) drawWorld();
    const shot = cinematicFrame(movie, story.elapsed);
    if (shot === story.frame) return;
    story.frame = shot;
    if (shot === movie.frames.length && !movie.button) {
      if (story.kind === 'ascentStory') {
        progress = mergeProgress(progress, store.load());
        progress = { ...progress, puzzle: { ...progress.puzzle, storyExpeditionSeen: true } };
        persist();
        onExpedition();
      } else startRun();
      return;
    }
    refresh();
    emitResult();
    const cue = movie.frames[shot]?.cue;
    if (cue) sounds.playEvent?.(cue);
  }
  function finish() {
    if (state !== 'playing') return;
    state = world.status; clearInput(); stopLoop();
    if (state === 'won') {
      const r = recordHeistResult(mergeProgress(progress, store.load()), world.level.id, world.result, world.level.revision);
      progress = r.progress; persist();
      const stars = world.result.stars, hasNext = selected + 1 < levels.length;
      const descends = world.level.id === BOSS_LEVEL.id && levels[selected + 1]?.number === INFERNO_START;
      if (descends) {
        selected++;
        showCinematic('descent', true);
        return;
      }
      if (world.level.boss?.profile === 'inferno') {
        showCinematic(onExpedition ? 'ascentStory' : 'ascent', true);
        return;
      }
      sounds.playWin?.();
      resultOverlay = { phase: 'gameover', mood: 'win', title: hasNext ? 'Misi berhasil!' : world.level.chapter === 'inferno' ? 'Ular lolos dari Neraka!' : 'Semua relik kembali!', btnText: hasNext ? 'Misi berikutnya' : 'Main lagi',
        sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${formatTime(world.time)}\nRelik ${world.artifacts}/${world.level.artifacts.length} · Apple Coin ${world.coins} · Alarm ${world.alerts}\n${world.boss ? (stars === 3 ? 'Sempurna: nyawa utuh.' : stars === 2 ? 'Boss tumbang. Pertahankan lima nyawa untuk tiga bintang.' : 'Boss tumbang. Sisakan minimal tiga nyawa untuk dua bintang.') : stars === 3 ? 'Sempurna: tanpa alarm, semua bonus, dan waktu acuan tercapai.' : stars === 2 ? `Tanpa alarm. Bintang ketiga: semua bonus dalam ${formatTime(world.level.par)}.` : 'Misi tuntas. Hindari alarm untuk bintang kedua.'}\n+${r.earned} koin · saldo ${appleCoins(progress)}` };
      if (hasNext) selected++;
    } else { sounds.playDeath?.(); resultOverlay = { phase: 'gameover', mood: 'shock', title: 'Misi gagal!', sub: `${formatTime(world.time)} · ${world.level.name}\n${world.lossReason || 'Misi gagal. Amati rute musuh dan gunakan alat untuk lolos.'}`, btnText: 'Coba lagi' }; }
    refresh(true); emitResult();
  }
  function startRun() {
    if (!levels.length || destroyed || active() || arrival) return false;
    if (playingStory()) return false;
    if (story?.kind === 'ascent') {
      returnToMenu();
      return true;
    }
    const base = levels[selected];
    if (onExpedition && base.number === 1 && !progress.puzzle.storyOpeningSeen) {
      if (!story) return showCinematic('opening', false);
      progress = mergeProgress(progress, store.load());
      progress = { ...progress, puzzle: { ...progress.puzzle, storyOpeningSeen: true } };
      persist();
    }
    if (base.chapter === 'inferno' && base.number === INFERNO_START && !progress.puzzle.infernoIntroSeen) {
      if (!story) return showCinematic('descent', false);
      progress = mergeProgress(progress, store.load());
      progress = { ...progress, puzzle: { ...progress.puzzle, infernoIntroSeen: true } };
      persist();
    }
    const arriving = story?.kind === 'descent' || story?.kind === 'opening';
    story = null;
    const variants = base.special || base.chapter === 'inferno' ? null : CAMPAIGN_VARIANTS[base.number - 1];
    const level=chooseRound(base,CAMPAIGN_LEVELS.includes(base)&&variants?.[0]?.id===base.id?variants:null,rng,previousRound);
    previousRound=level;
    world = createState(level); state = arriving ? 'arrival' : 'playing'; arrival = arriving ? { elapsed: 0 } : null; reasons.clear(); clearInput(); gait = 'walk'; resultOverlay = null; lastAt = clock(); accumulator = 0; footDistance = 0;
    emit({ overlay: { phase: arriving ? 'arrival' : 'none' } });
    drawWorld();
    if (arriving) sounds.playEvent?.('riftLand');
    refresh(true);
    if (level.boss?.profile === 'inferno') sounds.playEvent?.('infernoRoar');
    schedule();
    return true;
  }
  function pauseRun(reason = 'user') {
    if (!active()) return false;
    reasons.add(reason); clearInput(); stopLoop(); state = 'paused'; refresh();
    emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Misi dijeda', sub: 'Waktu dan skeleton berhenti. Lanjutkan saat siap.', btnText: 'Lanjutkan' } }); return true;
  }
  function resumeRun() {
    if (state !== 'paused' || [...reasons].some(r => BLOCKERS.includes(r))) return false;
    reasons.clear(); clearInput(); state = 'playing'; lastAt = clock(); accumulator = 0;
    emit({ overlay: { phase: 'none' } }); refresh(); schedule(); return true;
  }
  function returnToMenu() { if (destroyed) return; stopLoop(); clearInput(); reasons.clear(); state = 'menu'; story = null; arrival = null; resultOverlay = null; world = levels.length ? createState(levels[selected]) : null; refresh(true); if (world) renderer.draw(world); emit({ overlay: MENU }); }
  function restartLevel() {
    if (!active() && state !== 'lost' && state !== 'won') return false;
    if ([...reasons].some(r => BLOCKERS.includes(r))) return false;
    if (world) selected = levels.findIndex(level=>level.id===world.level.id);
    stopLoop(); state = 'menu'; return startRun();
  }
  const api = {
    setMode() {}, setSpeedPref() {}, setTaDuration() {}, setDirMP() {},
    startRun, pauseRun, resumeRun, releasePause: r => reasons.delete(r), togglePause: () => state === 'playing' ? pauseRun() : resumeRun(), returnToMenu, restartLevel,
    resumeExpedition() {
      if (state !== 'menu' || !onExpedition) return false;
      return showCinematic('ascentStory', false);
    },
    setLevel(i) { if (state !== 'menu' || !isUnlocked(progress, levels, i)) return false; selected = i; world = createState(levels[i]); refresh(true); renderer.draw(world); return true; },
    setDir(x, y, meta = {}) { if (state !== 'playing' || !Number.isFinite(x) || !Number.isFinite(y)) return; held.set(meta.source || 'pad', { x, y }); },
    cancelHeldInput(source) { held.delete(source || 'pad'); }, clearInput,
    setModifier(type, value, source = 'default') {
      if (type === 'sneak') shift = state === 'playing' && value;
      if (type !== 'run') return;
      const wasSprinting = sprintSources.size > 0;
      if (state === 'playing' && value) sprintSources.add(source);
      else sprintSources.delete(source);
      if (wasSprinting !== (sprintSources.size > 0)) refresh();
    },
    setGait(value) { if (['sneak', 'walk', 'run'].includes(value)) { gait = value; refresh(); } },
    action(type) { if (state !== 'playing') return false; const changed = action(world, type); playEvents(); refresh(); renderer.draw(world); return changed; },
    retrySave() { if (!savePending || active()) return false; progress = mergeProgress(progress, store.load()); const ok = persist(); refresh(true); if (state === 'won' || state === 'story') emitResult(); return ok; },
    setCamera(value) { renderer.setView(value); drawWorld(); refresh(); },
    resize() { renderer.invalidate(); drawWorld(); },
    isRunning: active, getState: () => state,
    destroy() { destroyed = true; stopLoop(); clearInput(); renderer.destroy(); },
  };
  inspect?.({ get world() { return world; }, get input() { return input(); } });
  refresh(true); if (world) renderer.draw(world); emit({ overlay: MENU }); return api;
}
