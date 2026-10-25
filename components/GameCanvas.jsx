'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { kindOf, isTwoPlayer } from '@/lib/modes/registry';
import { useSounds } from '@/hooks/useSounds';
import { createResultWriter, loadRecords, saveRecords } from '@/lib/records';
import { createDirectionInput } from '@/lib/input';

const LOADERS = { arcade: () => import('@/lib/gameEngine').then(m => m.createSnakeGame), puzzle: () => import('@/lib/puzzle/controller').then(m => m.createPuzzleGame), delivery: () => import('@/lib/delivery/controller').then(m => m.createDeliveryGame), roguelite: () => import('@/lib/roguelite/controller').then(m => m.createRogueliteGame), territory: () => import('@/lib/territory/controller').then(m => m.createTerritoryGame), boss: () => import('@/lib/boss/controller').then(m => m.createBossGame) };

const isMPMode = (m) => isTwoPlayer(m);
const typingTarget = (t) => !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable));
const onControl = (t) => !!(t && t.closest && t.closest('button, a, [role="button"]'));
const dialogOpen = () => typeof document !== 'undefined' && !!document.querySelector('[role="dialog"][aria-modal="true"]');

const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, taDuration, audioPrefs }, ref) {
  const pendingRecords = useRef(null);
  if (!pendingRecords.current) pendingRecords.current = createResultWriter({ load: loadRecords, save: saveRecords }, true);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const modeRef = useRef(mode);
  const prefsRef = useRef({ speedPref, taDuration });
  const kindRef = useRef('arcade');
  const inputRef = useRef(null);
  const sounds = useSounds(audioPrefs);
  const updateRef = useRef(onUpdate), sceneRef = useRef({ mode });
  updateRef.current = patch => { sceneRef.current = { ...sceneRef.current, ...patch }; sounds.updateScene(sceneRef.current); onUpdate({ ...patch, recordSave: patch.recordSave || { pending: pendingRecords.current.pending } }); };

  const kind = kindOf(mode); // 'arcade' (engine lama), 'puzzle' (stealth real-time), atau 'delivery' (kurir)
  prefsRef.current = { speedPref, taDuration };
  kindRef.current = kind;
  useEffect(() => { inputRef.current?.clear(); modeRef.current = mode; if (engineRef.current) engineRef.current.setMode(mode); }, [mode]);

  // Satu controller aktif per jenis mode. Berpindah jenis (arkade <-> puzzle) menghancurkan yang lama
  // (timer/RAF/tween ikut dibersihkan) dan membuat yang baru; berpindah antar mode arkade memakai engine yang sama.
  useEffect(() => {
    let cancelled = false, engine = null;
    onUpdate({ engineReady: false, engineError: '' });
    LOADERS[kind]().then(make => {
      if (cancelled) return;
      engine = make({ canvas: canvasRef.current, sounds, onUpdate: patch => updateRef.current(patch) });
      engine.setMode(modeRef.current);
      if (prefsRef.current.speedPref) engine.setSpeedPref(prefsRef.current.speedPref);
      if (prefsRef.current.taDuration) engine.setTaDuration(prefsRef.current.taDuration);
      engineRef.current = engine;
      onUpdate({ engineReady: true, engineError: '' });
    }).catch(() => { if (!cancelled) onUpdate({ engineReady: false, engineError: 'Mode belum dapat dimuat. Pilih mode lain lalu coba lagi.' }); });
    return () => { cancelled = true; inputRef.current?.clear(); engine?.destroy(); if (engineRef.current === engine) engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useImperativeHandle(ref, () => ({
    startRun: () => !!(engineRef.current && engineRef.current.startRun()),
    pauseRun: (r) => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.pauseRun(r)); },
    resumeRun: () => !!(engineRef.current && engineRef.current.resumeRun()),
    releasePause: (r) => engineRef.current && engineRef.current.releasePause(r),
    togglePause: () => { inputRef.current?.clear(); return engineRef.current && engineRef.current.togglePause(); },
    returnToMenu: () => { inputRef.current?.clear(); return engineRef.current && engineRef.current.returnToMenu(); },
    setDir: (x, y) => engineRef.current && engineRef.current.setDir(x, y),
    setDirMP: (which, x, y) => engineRef.current && engineRef.current.setDirMP(which, x, y),
    setHeldDir: (x, y) => kindRef.current === 'puzzle' ? engineRef.current?.setDir(x, y, { source: 'pad' }) : inputRef.current?.press('pad', 0, x, y),
    releaseHeldDir: () => { inputRef.current?.release('pad'); engineRef.current?.cancelHeldInput?.('pad'); },
    action: (type) => engineRef.current?.action?.(type),
    setCamera: (value) => engineRef.current?.setCamera?.(value),
    setGait: (gait) => engineRef.current?.setGait?.(gait),
    setSpeedPref: (v) => engineRef.current && engineRef.current.setSpeedPref(v),
    setTaDuration: (s) => engineRef.current && engineRef.current.setTaDuration(s),
    chooseUpgrade: (id) => !!(engineRef.current && engineRef.current.chooseUpgrade && engineRef.current.chooseUpgrade(id)),
    reviveRun: () => engineRef.current && engineRef.current.reviveRun ? engineRef.current.reviveRun() : false,
    undo: () => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.undo && engineRef.current.undo()); },
    restartRun: () => { inputRef.current?.clear(); const e = engineRef.current; if (!e) return false; if (kindRef.current === 'puzzle') return e.restartLevel(); e.returnToMenu(); return e.startRun(); },
    restartLevel: () => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.restartLevel && engineRef.current.restartLevel()); },
    retrySave: () => { const ok = engineRef.current?.retrySave?.(); const all = pendingRecords.current.retry(); onUpdate({ recordSave: { pending: pendingRecords.current.pending } }); return ok ?? all; },
    setLevel: (i) => !!(engineRef.current && engineRef.current.setLevel && engineRef.current.setLevel(i)),
    isRunning: () => !!(engineRef.current && engineRef.current.isRunning()),
    getState: () => (engineRef.current ? engineRef.current.getState() : 'menu'),
  }));

  useEffect(() => {
    const DIRS = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
    const WASD = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const input = createDirectionInput({
      enabled: () => !!engineRef.current && engineRef.current.getState() === 'playing' && !dialogOpen(),
      stepMode: () => false,
      send: (player, x, y, meta) => { const e = engineRef.current; if (!e) return; if (isMPMode(modeRef.current)) e.setDirMP(player, x, y); else e.setDir(x, y, meta); },
      cancel: (_, source) => engineRef.current?.cancelHeldInput?.(source),
    });
    inputRef.current = input;
    function onKeyDown(e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (dialogOpen() || typingTarget(e.target)) return; // dialog / input memegang keyboard
      const k = e.key.toLowerCase();
      const engine = engineRef.current;
      if (!engine) return;
      if (kindRef.current === 'puzzle') {
        if (k === 'escape') { e.preventDefault(); if (!e.repeat) engine.togglePause(); return; }
        if (engine.getState() !== 'playing') return;
        const direction = DIRS[k] || WASD[k];
        if (direction) { e.preventDefault(); if (!e.repeat) engine.setDir(...direction, { source: 'key:' + k }); return; }
        if (k === 'shift') { e.preventDefault(); engine.setModifier('sneak', true); return; }
        if (k === ' ' && !onControl(e.target)) { e.preventDefault(); engine.setModifier('run', true); return; }
        const actions = { e: 'interact', f: 'hide', q: 'gadget', x: 'cycle' };
        if (actions[k]) { e.preventDefault(); if (!e.repeat) engine.action(actions[k]); return; }
        if (k === 'r') { e.preventDefault(); if (!e.repeat) engine.restartLevel(); }
        return;
      }
      // Spasi/Enter milik kontrol UI yang sedang fokus; jangan dicuri. Spasi di luar kontrol hanya dicegah agar halaman tidak scroll.
      if (k === ' ' || k === 'enter') {
        if (k === ' ' && !onControl(e.target)) { e.preventDefault(); if (!e.repeat && modeRef.current === 'puzzle') engine.setDir(0, 0); }
        return;
      }
      if (k === 'escape') { e.preventDefault(); if (!e.repeat) { input.clear(); engine.togglePause(); } return; }
      if (k === 'z' || k === 'u') { if (engine.undo) { e.preventDefault(); if (!e.repeat) { input.clear(); engine.undo(); } } return; }
      if (k === 'r') { if (engine.restartLevel) { e.preventDefault(); if (!e.repeat) { input.clear(); engine.restartLevel(); } } return; }
      const arrow = DIRS[k];
      if (arrow) e.preventDefault();
      if (isMPMode(modeRef.current)) {
        if (arrow) input.press('key:' + k, 0, arrow[0], arrow[1]);
        else if (WASD[k]) { e.preventDefault(); input.press('key:' + k, 1, WASD[k][0], WASD[k][1]); }
        return;
      }
      const d = arrow || WASD[k];
      if (d) { e.preventDefault(); input.press('key:' + k, 0, d[0], d[1]); }
    }
    const onKeyUp = e => {
      const k = e.key.toLowerCase(); input.release('key:' + k);
      engineRef.current?.cancelHeldInput?.('key:' + k);
      if (k === 'shift') engineRef.current?.setModifier?.('sneak', false);
      if (k === ' ') engineRef.current?.setModifier?.('run', false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); input.clear(); inputRef.current = null; };
  }, []);

  // Tab disembunyikan / jendela kehilangan fokus = jeda. Kembali ke tab TIDAK melanjutkan:
  // pemain harus menekan Lanjut (atau arah) secara eksplisit.
  useEffect(() => {
    const hide = () => { inputRef.current?.clear(); const e = engineRef.current; if (e) e.pauseRun('hidden'); };
    const show = () => { const e = engineRef.current; if (e) e.releasePause('hidden'); };
    const onVis = () => (document.hidden ? hide() : show());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
    };
  }, []);

  // Swipe di mana saja di layar (bukan cuma di kanvas): geser jari > 24px = belok.
  // Origin di-reset tiap kali belok, jadi satu gesekan panjang bisa belok berkali-kali.
  useEffect(() => {
    const TH = 24;
    let sx = 0, sy = 0, tracking = false;
    const ignore = (el) => el && el.closest && el.closest('.no-swipe, button, a, input');
    function onStart(e) {
      if (kindRef.current === 'puzzle' || ignore(e.target) || e.touches.length !== 1 || dialogOpen()) { tracking = false; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }
    function onMove(e) {
      if (!tracking) return;
      if (e.cancelable) e.preventDefault(); // cegah halaman ikut scroll / pull-to-refresh
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) return;
      const engine = engineRef.current; if (!engine) return;
      if (Math.abs(dx) > Math.abs(dy)) engine.setDir(dx > 0 ? 1 : -1, 0); else engine.setDir(0, dy > 0 ? 1 : -1);
      if (kindRef.current === 'puzzle') { tracking = false; return; } // puzzle: satu gesekan = satu langkah
      sx = t.clientX; sy = t.clientY;
    }
    function onEnd() { tracking = false; }
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), width = rect.width;
      if (width < 1) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const w = kind === 'puzzle' ? Math.max(1, Math.round(width * ratio)) : Math.max(17, Math.round(width * ratio / 17) * 17), h = kind === 'puzzle' ? Math.max(1, Math.round(rect.height * ratio)) : w * 15 / 17;
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      engineRef.current?.resize?.();
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    return () => observer.disconnect();
  }, [kind]);

  return <canvas ref={canvasRef} id="c" width="680" height="600" aria-label={kind === 'puzzle' ? 'Dungeon Shadow Heist. WASD bergerak, Shift mengendap, E berinteraksi.' : 'Arena K-Snake'} style={{ background: kind === 'puzzle' ? '#152c33' : '#a2d149', aspectRatio: kind === 'puzzle' ? 'auto' : '680 / 600' }} />;
});

export default GameCanvas;
