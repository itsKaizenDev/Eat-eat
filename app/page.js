'use client';
import { useCallback, useRef, useState } from 'react';
import GameCanvas from '@/components/GameCanvas';
import Hud from '@/components/Hud';
import Overlay from '@/components/Overlay';
import HelpModal from '@/components/HelpModal';
import DPad from '@/components/DPad';
import BackgroundLayer from '@/components/BackgroundLayer';

export default function Page() {
  const gameRef = useRef(null);
  const [mode, setMode] = useState('classic');
  const [helpOpen, setHelpOpen] = useState(false);
  const [hud, setHud] = useState({
    score: 0, best: 0, modeLabel: 'Snake · Classic', effects: [], mpHud: null, timerText: null,
    running: false, paused: false,
  });
  const [overlay, setOverlay] = useState({ visible: true, phase: 'start', mood: 'idle', title: 'Snake', sub: 'Pilih mode, lalu tekan Main', btnText: 'PLAY' });

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
    gameRef.current && gameRef.current.start();
  }

  function handleDpad(x, y) {
    if (mode === 'multiplayer') {
      if (!hud.running) gameRef.current && gameRef.current.start();
      else gameRef.current && gameRef.current.setDirMP(0, x, y);
    } else {
      gameRef.current && gameRef.current.setDir(x, y);
    }
  }

  return (
    <>
      <BackgroundLayer mode={mode} />
      <Hud
        mode={mode}
        modeLabel={hud.modeLabel}
        timerText={hud.timerText}
        effects={hud.effects}
        score={hud.score}
        mpHud={hud.mpHud}
        onHelp={() => setHelpOpen(true)}
      />
      <HelpModal open={helpOpen} mode={mode} onClose={() => setHelpOpen(false)} />

      <div id="wrap" className="game-w relative border-[7px] rounded-md shadow-2xl" style={{ borderColor: '#4a752c' }}>
        <GameCanvas ref={gameRef} mode={mode} onUpdate={onUpdate} />
        <Overlay
          visible={overlay.visible}
          phase={overlay.phase}
          mood={overlay.mood}
          title={overlay.title}
          sub={overlay.sub}
          btnText={overlay.btnText}
          mode={mode}
          onModeChange={handleModeChange}
          onPlay={handlePlay}
        />
      </div>

      <DPad mode={mode} onMove={handleDpad} />
      <div className="text-[11px] sm:text-xs text-[#8a988a] mt-2.5 text-center">Panah / WASD gerak • Esc jeda • Terbaik: <b>{hud.best}</b></div>
    </>
  );
}
