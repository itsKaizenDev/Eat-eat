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

export default function Page() {
  const [loading, setLoading] = useState(true);
  const gameRef = useRef(null);
  const [mode, setMode] = useState('classic');
  const primaryTouch = useIsTouch();
  const touch = useMediaQuery('(any-pointer: coarse)');
  const finePointer = useMediaQuery('(any-pointer: fine)');
  const [keyboardUsed, setKeyboardUsed] = useState(false);
  const [lefty, setLefty] = useState(false);
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
    setSpeed(loadSpeed()); setTaSecs(loadDuration());
    setCanFullscreen(!!document.documentElement.requestFullscreen);
    const change = () => setFullscreen(!!document.fullscreenElement);
    const key = () => setKeyboardUsed(true);
    document.addEventListener('fullscreenchange', change);
    window.addEventListener('keydown', key, { once: true });
    return () => { document.removeEventListener('fullscreenchange', change); window.removeEventListener('keydown', key); };
  }, []);
  useEffect(() => { gameRef.current?.setSpeedPref(speed); }, [speed]);
  useEffect(() => { gameRef.current?.setTaDuration(taSecs); }, [taSecs]);
  useEffect(() => {
    if (helpOpen || panel) gameRef.current?.pauseRun('help');
    else gameRef.current?.releasePause('help');
  }, [helpOpen, panel]);
  useEffect(() => {
    if (active) document.body.dataset.playing = 'true'; else delete document.body.dataset.playing;
    return () => { delete document.body.dataset.playing; };
  }, [active]);
  useEffect(() => {
    if (!controls) { setHint(false); return; }
    try { setHint(localStorage.getItem(`snake-controls-hint-${kind}`) !== '1'); } catch { setHint(true); }
  }, [controls, kind]);

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
        {!helpOpen && <GameSheet panel={panel} mode={mode} hud={hud} onClose={closePanel} onPanel={setPanel} lefty={lefty} onSwap={swap} fullscreen={fullscreen} canFullscreen={canFullscreen} onFullscreen={toggleFullscreen} fullscreenMessage={fullscreenMessage} onHelp={openHelp} onRestart={restart} />}
      </>}
    </>
    <main data-mode={mode} inert={externalModal ? '' : undefined} aria-hidden={externalModal || undefined} className={`stage ${menuOpen ? 'focus-stage' : 'playing-stage'} ${active ? 'game-active' : ''}`}>
      <GameViewport active={active} sleeping={menuOpen} mode={mode} touch={touch} lefty={lefty} world={<GameCanvas ref={gameRef} mode={mode} onUpdate={onUpdate} speedPref={speed} taDuration={taSecs} />}>
        {!menuOpen && <Hud mode={mode} hud={hud} onInfo={() => openPanel('info')} canPause={controls} onPause={() => gameRef.current?.pauseRun('user')} onCamera={v => gameRef.current?.setCamera(v)} />}
        {controls && touch && getMode(mode)?.touch && <div className="joystick-anchor"><DPad analog={kind === 'puzzle'} onMove={(x, y) => gameRef.current?.setHeldDir(x, y)} onRelease={() => gameRef.current?.releaseHeldDir()} /></div>}
        {controls && kind === 'puzzle' && <DungeonControls data={hud.puzzle} onAction={type => gameRef.current?.action(type)} onGait={g => gameRef.current?.setGait(g)} />}
        {hint && controls && <div className="controls-hint no-swipe"><p>{kind === 'puzzle' ? 'Joystick: 8 arah. +/−: zoom. Peta: lihat denah; ikon bidik kembali ke ular. Alat pulih 10 detik.' : touch ? 'Geser joystick atau layar untuk berbelok. Info menyimpan aturan dan pengaturan.' : 'Panah / WASD untuk bergerak. Esc menjeda. Info menyimpan aturan dan pengaturan.'}</p><button aria-label="Tutup petunjuk" onClick={dismissHint}><ICONS.close size={16} /></button></div>}
        <Overlay {...overlay} visible={overlay.visible && !externalModal} mode={mode} keyboardAvailable={keyboardAvailable} onModeChange={setMode} speed={speed} onSpeedChange={v => { if (saveSpeed(v)) setSpeed(v); }} taSecs={taSecs} onTaChange={v => { if (saveDuration(v)) setTaSecs(v); }} onPlay={handlePlay} onHelp={openHelp} onInfo={() => openPanel('info')} onSettings={() => openPanel('settings')} onRestart={() => openPanel('restart')} onRevive={() => gameRef.current?.reviveRun()} onRetrySave={() => gameRef.current?.retrySave()} onMenu={returnToMenu} puzzleMenu={hud.puzzleMenu} deliveryMenu={hud.deliveryMenu} rogueMenu={hud.rogueMenu} territoryMenu={hud.territoryMenu} bossMenu={hud.bossMenu} onSelectLevel={i => gameRef.current?.setLevel(i)} />
      </GameViewport>
    </main>
  </>;
}
