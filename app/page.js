'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsTouch } from '@/hooks/useIsTouch';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import GameCanvas from '@/components/GameCanvas';
import GameViewport from '@/components/GameViewport';
import GameSheet from '@/components/GameSheet';
import Hud from '@/components/Hud';
import Overlay from '@/components/Overlay';
import HelpModal from '@/components/HelpModal';
import DPad from '@/components/DPad';
import DungeonControls from '@/components/DungeonControls';
import LoadingScreen from '@/components/LoadingScreen';
import UpgradeDialog from '@/components/UpgradeDialog';
import { ICONS } from '@/lib/icons';
import { getMode, kindOf, needsKeyboard } from '@/lib/modes/registry';
import { loadSpeed, saveSpeed, loadDuration, saveDuration } from '@/lib/storage';
import { DEFAULT_AUDIO, loadAudio, saveAudio } from '@/lib/audio/preferences';
import { DEFAULT_CONTROLS, loadControls, saveControls, controlVars } from '@/lib/controlPrefs';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const gameRef = useRef(null);
  const [mode, setMode] = useState('classic');
  const primaryTouch = useIsTouch();
  const touch = useMediaQuery('(any-pointer: coarse)');
  const finePointer = useMediaQuery('(any-pointer: fine)');
  const [keyboardUsed, setKeyboardUsed] = useState(false);
  const [lefty, setLefty] = useState(false);
  const [audioPrefs, setAudioPrefs] = useState(DEFAULT_AUDIO);
  const [ctl, setCtl] = useState(DEFAULT_CONTROLS);
  const [layoutEdit, setLayoutEdit] = useState(false);
  const dragRef = useRef(null);
  const [hint, setHint] = useState(false);
  const [speed, setSpeed] = useState('normal');
  const [taSecs, setTaSecs] = useState(90);
  const [helpOpen, setHelpOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState('');
  const [hud, setHud] = useState({ score: 0, best: 0, effects: [], running: false, paused: false });
  const [overlay, setOverlay] = useState({ visible: true, phase: 'start', mood: 'idle', title: 'K-Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' });
  const menuOpen = overlay.visible && overlay.phase === 'start';
  const upgrade = !!hud.roguelite?.offer?.length;
  const active = !menuOpen && (hud.running || hud.paused || upgrade);
  const externalModal = helpOpen || !!panel || upgrade;
  const controls = active && !overlay.visible && !externalModal;
  const keyboardAvailable = finePointer || keyboardUsed;
  const kind = kindOf(mode);

  useEffect(() => {
    try { setLefty(localStorage.getItem('snake-lefty') === '1'); } catch {}
    setCtl(loadControls()); setAudioPrefs(loadAudio());
    setSpeed(loadSpeed()); setTaSecs(loadDuration());
    setCanFullscreen(!!document.documentElement.requestFullscreen);
    const change = () => setFullscreen(!!document.fullscreenElement);
    const key = () => setKeyboardUsed(true);
    document.addEventListener('fullscreenchange', change);
    window.addEventListener('keydown', key, { once: true });
    return () => { document.removeEventListener('fullscreenchange', change); window.removeEventListener('keydown', key); };
  }, []);
  useEffect(() => {
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(controlVars(ctl))) root.setProperty(k, String(v));
  }, [ctl]);
  const updateCtl = patch => setCtl(prev => { const next = { ...prev, ...patch }; saveControls(next); return next; });
  // Layout editor: drag the joystick or the action cluster; offsets stay inside the screen.
  const dragStart = which => e => {
    if (!layoutEdit) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect(), key = which + 'Off', m = 6;
    dragRef.current = { key, sx: e.clientX, sy: e.clientY, base: { ...ctl[key] }, lo: { x: m - r.left, y: m - r.top }, hi: { x: innerWidth - m - r.right, y: innerHeight - m - r.bottom } };
  };
  const dragMove = e => {
    const d = dragRef.current; if (!d) return;
    const dx = Math.min(d.hi.x, Math.max(d.lo.x, e.clientX - d.sx)), dy = Math.min(d.hi.y, Math.max(d.lo.y, e.clientY - d.sy));
    setCtl(prev => ({ ...prev, [d.key]: { x: Math.round(d.base.x + dx), y: Math.round(d.base.y + dy) } }));
  };
  const dragEnd = () => { if (dragRef.current) { dragRef.current = null; setCtl(prev => { saveControls(prev); return prev; }); } };
  const dragProps = which => layoutEdit ? { onPointerDown: dragStart(which), onPointerMove: dragMove, onPointerUp: dragEnd, onPointerCancel: dragEnd } : {};
  useEffect(() => { gameRef.current?.setSpeedPref(speed); }, [speed]);
  useEffect(() => { gameRef.current?.setTaDuration(taSecs); }, [taSecs]);
  useEffect(() => {
    if (helpOpen || panel || layoutEdit) gameRef.current?.pauseRun('help');
    else gameRef.current?.releasePause('help');
  }, [helpOpen, panel, layoutEdit]);
  useEffect(() => {
    if (active) document.body.dataset.playing = 'true'; else delete document.body.dataset.playing;
    return () => { delete document.body.dataset.playing; };
  }, [active]);
  useEffect(() => {
    if (!controls) { setHint(false); return; }
    try { setHint(localStorage.getItem(`snake-controls-hint-${kind}`) !== '1'); } catch { setHint(true); }
  }, [controls, kind]);

  useEffect(() => {
    if (!touch || (!controls && !layoutEdit)) return;
    const clamp = () => {
      const corrections = {};
      for (const [key, selector] of [['padOff', '.joystick-anchor'], ['btnOff', '.dungeon-controls']]) {
        const r = document.querySelector(selector)?.getBoundingClientRect(); if (!r?.width || !r?.height) continue;
        const x = r.left < 6 ? 6 - r.left : r.right > innerWidth - 6 ? innerWidth - 6 - r.right : 0;
        const y = r.top < 6 ? 6 - r.top : r.bottom > innerHeight - 6 ? innerHeight - 6 - r.bottom : 0;
        if (Math.abs(x) > 1 || Math.abs(y) > 1) corrections[key] = { x, y };
      }
      if (Object.keys(corrections).length) setCtl(prev => {
        const next = { ...prev }; for (const [key, d] of Object.entries(corrections)) next[key] = { x: prev[key].x + Math.round(d.x), y: prev[key].y + Math.round(d.y) }; saveControls(next); return next;
      });
    };
    const id = requestAnimationFrame(clamp); window.addEventListener('resize', clamp);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', clamp); };
  }, [touch, controls, layoutEdit, ctl.pad, ctl.btn]);

  const finishLoading = useCallback(() => setLoading(false), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const onUpdate = useCallback(patch => {
    const { overlay: o, ...rest } = patch;
    if (o) setOverlay(prev => o.phase === 'none' ? { ...prev, visible: false } : { visible: true, ...o });
    if (Object.keys(rest).length) setHud(prev => ({ ...prev, ...rest }));
  }, []);
  function swap() {
    setLefty(v => { const n = !v; try { localStorage.setItem('snake-lefty', n ? '1' : '0'); } catch {} return n; });
  }
  function dismissHint() { setHint(false); try { localStorage.setItem(`snake-controls-hint-${kind}`, '1'); } catch {} }
  function openPanel(value) { gameRef.current?.pauseRun('help'); setPanel(value); }
  function openHelp() { gameRef.current?.pauseRun('help'); setPanel(null); setHelpOpen(true); }
  function returnToMenu() { setPanel(null); setHelpOpen(false); gameRef.current?.returnToMenu(); }
  function handlePlay() {
    const g = gameRef.current; if (!g) return;
    if (primaryTouch && needsKeyboard(mode) && !keyboardAvailable) { openPanel('keyboard'); return; }
    if (overlay.phase === 'pause') g.resumeRun(); else g.startRun();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function restart() {
    gameRef.current?.releasePause('help'); setPanel(null); gameRef.current?.restartRun();
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenMessage('');
    } catch { setFullscreenMessage('Browser belum mengizinkan layar penuh. Kamu tetap bisa bermain.'); }
  }

  return <>
    {loading && <LoadingScreen onDone={finishLoading} />}
    <>
      {upgrade ? <UpgradeDialog data={hud.roguelite} onChoose={id => gameRef.current?.chooseUpgrade(id)} /> : <>
        <HelpModal open={helpOpen} mode={mode} onClose={closeHelp} />
        {!helpOpen && <GameSheet panel={panel} mode={mode} hud={hud} onClose={closePanel} onPanel={setPanel} lefty={lefty} onSwap={swap} fullscreen={fullscreen} canFullscreen={canFullscreen} onFullscreen={toggleFullscreen} fullscreenMessage={fullscreenMessage} onHelp={openHelp} onRestart={restart} audioPrefs={audioPrefs} onAudio={patch => setAudioPrefs(prev => { const next = { ...prev, ...patch }; saveAudio(next); return next; })} touch={touch} ctl={ctl} onCtl={updateCtl} onEditLayout={() => { setPanel(null); setLayoutEdit(true); }} onResetCtl={() => updateCtl({ ...DEFAULT_CONTROLS })} />}
      </>}
    </>
    <main data-mode={mode} inert={externalModal ? '' : undefined} aria-hidden={externalModal || undefined} className={`stage ${menuOpen ? 'focus-stage' : 'playing-stage'} ${active ? 'game-active' : ''}`}>
      <GameViewport active={active} sleeping={menuOpen} mode={mode} touch={touch} lefty={lefty} world={<GameCanvas ref={gameRef} mode={mode} onUpdate={onUpdate} speedPref={speed} taDuration={taSecs} audioPrefs={audioPrefs} />}>
        {!menuOpen && <Hud mode={mode} hud={hud} onInfo={() => openPanel('info')} canPause={controls} onPause={() => gameRef.current?.pauseRun('user')} onCamera={v => gameRef.current?.setCamera(v)} />}
        {(controls || layoutEdit) && touch && getMode(mode)?.touch && <div className={`joystick-anchor ${layoutEdit ? 'editing' : ''}`} {...dragProps('pad')}><DPad key={`${ctl.floating}-${ctl.smooth}`} analog={kind === 'puzzle'} smooth={kind === 'puzzle' && ctl.smooth} dead={ctl.dead} floating={ctl.floating && !layoutEdit} onMove={(x, y) => gameRef.current?.setHeldDir(x, y)} onRelease={() => gameRef.current?.releaseHeldDir()} /></div>}
        {(controls || layoutEdit) && kind === 'puzzle' && <DungeonControls editing={layoutEdit} dragProps={dragProps('btn')} data={hud.puzzle} onAction={type => gameRef.current?.action(type)} onGait={g => gameRef.current?.setGait(g)} />}
        {layoutEdit && <div className="layout-editor no-swipe" role="dialog" aria-label="Atur posisi kontrol"><p>Geser joystick dan tombol ke posisi yang nyaman.</p><div><button className="secondary-button" onClick={() => updateCtl({ padOff: { x: 0, y: 0 }, btnOff: { x: 0, y: 0 } })}>Atur ulang</button><button className="start-play" onClick={() => setLayoutEdit(false)}>Selesai</button></div></div>}
        {hint && controls && <div className="controls-hint no-swipe"><p>{kind === 'puzzle' ? 'Joystick analog: dorong lebih jauh untuk lebih cepat. +/−: zoom. Peta: lihat denah; ikon bidik kembali ke ular. Alat pulih 10 detik.' : touch ? 'Geser joystick atau layar untuk berbelok. Info menyimpan aturan dan pengaturan.' : 'Panah / WASD untuk bergerak. Esc menjeda. Info menyimpan aturan dan pengaturan.'}</p><button aria-label="Tutup petunjuk" onClick={dismissHint}><ICONS.close size={16} /></button></div>}
        <Overlay {...overlay} visible={overlay.visible && !externalModal && !layoutEdit} engineReady={hud.engineReady} engineError={hud.engineError} recordSave={hud.recordSave} mode={mode} keyboardAvailable={keyboardAvailable} onModeChange={setMode} speed={speed} onSpeedChange={v => { if (saveSpeed(v)) setSpeed(v); }} taSecs={taSecs} onTaChange={v => { if (saveDuration(v)) setTaSecs(v); }} onPlay={handlePlay} onHelp={openHelp} onInfo={() => openPanel('info')} onSettings={() => openPanel('settings')} onRestart={() => openPanel('restart')} onRevive={() => gameRef.current?.reviveRun()} onRetrySave={() => gameRef.current?.retrySave()} onMenu={returnToMenu} puzzleMenu={hud.puzzleMenu} deliveryMenu={hud.deliveryMenu} rogueMenu={hud.rogueMenu} territoryMenu={hud.territoryMenu} bossMenu={hud.bossMenu} onSelectLevel={i => gameRef.current?.setLevel(i)} />
      </GameViewport>
    </main>
  </>;
}
