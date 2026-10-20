'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsTouch } from '@/hooks/useIsTouch';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import RotatePrompt from '@/components/RotatePrompt';
import GameCanvas from '@/components/GameCanvas';
import Hud from '@/components/Hud';
import Overlay from '@/components/Overlay';
import HelpModal from '@/components/HelpModal';
import DPad from '@/components/DPad';
import LoadingScreen from '@/components/LoadingScreen';
import UpgradeDialog from '@/components/UpgradeDialog';
import { isTwoPlayer, needsKeyboard } from '@/lib/modes/registry';
import { loadSpeed, saveSpeed, loadDuration, saveDuration } from '@/lib/storage';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const gameRef = useRef(null);
  const [mode, setMode] = useState('classic');
  const isTouch = useIsTouch();
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const side = isTouch && isLandscape;               // HP landscape: 2 kolom (game | info + tombol)
  const [pendingPlay, setPendingPlay] = useState(false);
  const [lefty, setLefty] = useState(false);  // mode kidal: panel & tombol pindah ke kiri
  useEffect(() => { try { setLefty(localStorage.getItem('snake-lefty') === '1'); } catch (e) {} }, []);
  function toggleLefty() {
    setLefty(v => { const n = !v; try { localStorage.setItem('snake-lefty', n ? '1' : '0'); } catch (e) {} return n; });
  }
  // Kalau ternyata perangkat sentuh tapi mode-nya multiplayer, balik ke Classic.
  useEffect(() => { if (isTouch && needsKeyboard(mode)) setMode('classic'); }, [isTouch, mode]);
  const [speed, setSpeed] = useState('normal');
  const [taSecs, setTaSecs] = useState(90);
  // Preferensi dibaca lewat storage tervalidasi (allowlist), dan hanya ditulis saat pemain mengubahnya.
  useEffect(() => { setSpeed(loadSpeed()); setTaSecs(loadDuration()); }, []);
  useEffect(() => { gameRef.current && gameRef.current.setSpeedPref(speed); }, [speed]);
  useEffect(() => { gameRef.current && gameRef.current.setTaDuration(taSecs); }, [taSecs]);
  function changeSpeed(v) { if (saveSpeed(v)) setSpeed(v); }
  function changeDuration(v) { if (saveDuration(v)) setTaSecs(v); }
  const [helpOpen, setHelpOpen] = useState(false);
  // Penghalang pause: membuka bantuan / layar RotatePrompt menjeda ronde, dan menutupnya TIDAK melanjutkan otomatis.
  useEffect(() => {
    const g = gameRef.current; if (!g) return;
    if (helpOpen) g.pauseRun('help'); else g.releasePause('help');
  }, [helpOpen]);
  const [sideEl, setSideEl] = useState(null); // kolom samping (HP landscape): tempat kontrol menu
  const [hud, setHud] = useState({
    score: 0, best: 0, modeLabel: 'Snake · Classic', effects: [], mpHud: null, timerText: null,
    running: false, paused: false, puzzle: null, puzzleMenu: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
  });
  const [overlay, setOverlay] = useState({ visible: true, phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' });

  const menuOpen = overlay.visible && overlay.phase === 'start';
  const askRotate = isTouch && !isLandscape && (pendingPlay || (!menuOpen && hud.running));
  useEffect(() => {
    const g = gameRef.current; if (!g) return;
    if (askRotate) g.pauseRun('orientation'); else g.releasePause('orientation');
  }, [askRotate]);
  useEffect(() => {
    if (pendingPlay && isLandscape) {
      setPendingPlay(false);
      if (gameRef.current) gameRef.current.startRun();
    }
  }, [pendingPlay, isLandscape]);
  const finishLoading = useCallback(() => setLoading(false), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  function returnToMenu() {
    setPendingPlay(false);
    if (gameRef.current) gameRef.current.returnToMenu();
  }

  const onUpdate = useCallback((patch) => {
    if ('overlay' in patch) {
      const o = patch.overlay;
      if (o.phase === 'none') setOverlay(prev => ({ ...prev, visible: false }));
      else setOverlay({ visible: true, ...o });
      const { overlay: _drop, ...rest } = patch;
      if (Object.keys(rest).length) setHud(prev => ({ ...prev, ...rest }));
      return;
    }
    setHud(prev => ({ ...prev, ...patch }));
  }, []);

  function handleModeChange(m) {
    setMode(m);
  }

  function handlePlay() {
    const g = gameRef.current; if (!g) return;
    if (isTouch && !isLandscape) { setPendingPlay(true); return; }
    if (overlay.phase === 'pause') g.resumeRun(); else g.startRun();
  }

  function handleDpad(x, y) {
    const g = gameRef.current; if (!g) return;
    if (isTwoPlayer(mode)) g.setDirMP(0, x, y);
    else g.setHeldDir(x, y);
  }

  return (
    <>
      {loading && <LoadingScreen onDone={finishLoading} />}
      {askRotate && <RotatePrompt onMenu={returnToMenu} />}
      <UpgradeDialog data={hud.roguelite} onChoose={(id) => gameRef.current && gameRef.current.chooseUpgrade(id)} />
      <HelpModal open={helpOpen} mode={mode} onClose={closeHelp} />
      <main data-mode={mode} inert={helpOpen || askRotate || hud.roguelite?.offer?.length ? '' : undefined} aria-hidden={helpOpen || askRotate || !!hud.roguelite?.offer?.length || undefined} className={`stage ${menuOpen ? 'focus-stage' : 'playing-stage'} ${side ? 'stage-side' : ''} ${side && lefty ? 'stage-lefty' : ''} ${side && overlay.visible ? 'menu-open' : ''}`}>
      {!menuOpen && <Hud
        side={side}
        lefty={lefty}
        onSwap={toggleLefty}
        best={hud.best}
        mode={mode}
        modeLabel={hud.modeLabel}
        timerText={hud.timerText}
        effects={hud.effects}
        score={hud.score}
        mpHud={hud.mpHud}
        onHelp={() => setHelpOpen(true)}
        canPause={hud.running && !hud.paused && !overlay.visible}
        onPause={() => gameRef.current && gameRef.current.pauseRun('user')}
        puzzle={hud.puzzle}
        delivery={hud.delivery}
        roguelite={hud.roguelite}
        territory={hud.territory}
        boss={hud.boss}
        hideStats={overlay.visible && overlay.phase === 'start'}
        onUndo={() => gameRef.current && gameRef.current.undo()}
        onRestart={() => gameRef.current && gameRef.current.restartLevel()}
        onWait={() => gameRef.current && gameRef.current.setDir(0, 0)}
      />}

      <div id="wrap" className="game-w relative overflow-hidden border-[7px] rounded-md shadow-2xl" style={{ borderColor: mode === 'classicnight' ? '#2b4763' : '#4a752c' }}>
        <div className={menuOpen ? 'canvas-sleep' : 'canvas-frame'}><GameCanvas ref={gameRef} mode={mode} onUpdate={onUpdate} speedPref={speed} taDuration={taSecs} /></div>
        <Overlay
          onHelp={() => setHelpOpen(true)}
          side={side}
          host={side ? sideEl : null}
          visible={overlay.visible}
          phase={overlay.phase}
          mood={overlay.mood}
          title={overlay.title}
          sub={overlay.sub}
          btnText={overlay.btnText}
          mode={mode}
          onModeChange={handleModeChange}
          speed={speed}
          onSpeedChange={changeSpeed}
          taSecs={taSecs}
          onTaChange={changeDuration}
          onPlay={handlePlay}
          onRevive={() => gameRef.current && gameRef.current.reviveRun()}
          onRetrySave={() => gameRef.current?.retrySave()}
          onMenu={returnToMenu}
          puzzleMenu={hud.puzzleMenu}
          deliveryMenu={hud.deliveryMenu}
          rogueMenu={hud.rogueMenu}
          territoryMenu={hud.territoryMenu}
          bossMenu={hud.bossMenu}
          onSelectLevel={(i) => gameRef.current && gameRef.current.setLevel(i)}
        />
      </div>

      {side && <div ref={setSideEl} className="side-menu" />}
      {!overlay.visible && <DPad onMove={handleDpad} onRelease={() => gameRef.current?.releaseHeldDir()} />}
      {!menuOpen && !side && (mode === 'puzzle'
        ? <div className="text-[11px] sm:text-xs text-[#8a988a] mt-2.5 text-center">Panah / WASD melangkah • Spasi tunggu • Z undo • R ulang • Esc jeda</div>
        : mode === 'boss'
        ? <div className="text-[11px] sm:text-xs text-[#8a988a] mt-2.5 text-center">Panah / WASD gerak • geser layar • Esc jeda</div>
        : mode === 'territory'
        ? <div className="text-[11px] sm:text-xs text-[#8a988a] mt-2.5 text-center">P1 Panah • P2 WASD • Esc jeda</div>
        : <div className="text-[11px] sm:text-xs text-[#8a988a] mt-2.5 text-center">Panah / WASD gerak • Esc jeda • Terbaik: <b>{hud.best}</b></div>)}
      </main>
    </>
  );
}
