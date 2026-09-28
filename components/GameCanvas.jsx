'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createSnakeGame } from '@/lib/gameEngine';
import { useSounds } from '@/hooks/useSounds';

const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate }, ref) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const modeRef = useRef(mode);
  const sounds = useSounds();

  useEffect(() => { modeRef.current = mode; if (engineRef.current) engineRef.current.setMode(mode); }, [mode]);

  useEffect(() => {
    const engine = createSnakeGame({ canvas: canvasRef.current, sounds, onUpdate });
    engine.setMode(modeRef.current);
    engineRef.current = engine;
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    start: () => engineRef.current && engineRef.current.start(),
    setDir: (x, y) => engineRef.current && engineRef.current.setDir(x, y),
    setDirMP: (which, x, y) => engineRef.current && engineRef.current.setDirMP(which, x, y),
    isRunning: () => !!(engineRef.current && engineRef.current.isRunning()),
  }));

  useEffect(() => {
    function onKeyDown(e) {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      const engine = engineRef.current;
      if (!engine) return;
      if (modeRef.current === 'multiplayer') {
        if (!engine.isRunning()) {
          if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) engine.start();
          return;
        }
        if (k === 'arrowup') engine.setDirMP(0, 0, -1);
        else if (k === 'arrowdown') engine.setDirMP(0, 0, 1);
        else if (k === 'arrowleft') engine.setDirMP(0, -1, 0);
        else if (k === 'arrowright') engine.setDirMP(0, 1, 0);
        else if (k === 'w') engine.setDirMP(1, 0, -1);
        else if (k === 's') engine.setDirMP(1, 0, 1);
        else if (k === 'a') engine.setDirMP(1, -1, 0);
        else if (k === 'd') engine.setDirMP(1, 1, 0);
        else if (k === 'escape') { if (engine.isRunning()) engine.start(); }
        return;
      }
      if (k === 'arrowup' || k === 'w') engine.setDir(0, -1);
      else if (k === 'arrowdown' || k === 's') engine.setDir(0, 1);
      else if (k === 'arrowleft' || k === 'a') engine.setDir(-1, 0);
      else if (k === 'arrowright' || k === 'd') engine.setDir(1, 0);
      else if (k === 'escape') { if (engine.isRunning()) engine.start(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Swipe di mana saja di layar (bukan cuma di kanvas): geser jari > 24px = belok.
  // Origin di-reset tiap kali belok, jadi satu gesekan panjang bisa belok berkali-kali.
  useEffect(() => {
    const TH = 24;
    let sx = 0, sy = 0, tracking = false;
    const ignore = (el) => el && el.closest && el.closest('.no-swipe, button, a, input');
    function onStart(e) {
      if (ignore(e.target) || e.touches.length !== 1) { tracking = false; return; }
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

  return <canvas ref={canvasRef} id="c" width="680" height="600" style={{ background: '#a2d149' }} />;
});

export default GameCanvas;
