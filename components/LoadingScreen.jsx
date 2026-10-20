'use client';
import { useEffect } from 'react';
import { BG, isCoarse } from '@/lib/sceneTheme';

export default function LoadingScreen({ onDone }) {
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => { if (live) onDone(); }, 2500);
    const files = [isCoarse() ? BG.classic.replace('.webp', '-m.webp') : BG.classic, '/assets/game/mascot-idle.png'];
    Promise.all(files.map(src => new Promise(resolve => { const img = new Image(); img.onload = img.onerror = resolve; img.src = src; }))).then(() => { if (live) onDone(); });
    return () => { live = false; clearTimeout(timer); };
  }, [onDone]);
  return <div className="focus-loading" role="status"><img src="/assets/game/mascot-idle.png" alt="" width="110" height="110" /><b>K<span>-</span>Snake</b><p>Menyiapkan kebun…</p><i /></div>;
}
