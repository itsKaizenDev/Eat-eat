'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// Semua background & mascot di-preload di sini duluan, biar pas menu muncul
// gambarnya udah siap semua (nggak ada kedip/pop-in pas geser mode pertama
// kali, dan nggak ada layar putih kosong sekilas di HP koneksi lambat).
const ASSETS = [
  '/assets/game/bg-classic.png', '/assets/game/bg-classicnight.png', '/assets/game/bg-portal.png',
  '/assets/game/bg-timeattack.png', '/assets/game/bg-mayhem.png', '/assets/game/bg-mayhemplus.png',
  '/assets/game/bg-mayhemhard.png', '/assets/game/bg-impossible.png', '/assets/game/bg-multiplayer.png',
  '/assets/game/bg-mayhemduo.png',
  '/assets/game/mascot-idle.png', '/assets/game/mascot-win.png', '/assets/game/mascot-sick.png',
  '/assets/game/mascot-shock.png', '/assets/game/mascot-dizzy.png',
];

export default function LoadingScreen({ onDone }) {
  const [pct, setPct] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const total = ASSETS.length;
    const bump = () => { loaded++; if (!cancelled) setPct(Math.round((loaded / total) * 100)); };
    const start = performance.now();

    const imgLoads = ASSETS.map(src => new Promise((res) => {
      const img = new Image();
      img.onload = () => { bump(); res(); };
      img.onerror = () => { bump(); res(); };
      img.src = src;
    }));
    const fontReady = (typeof document !== 'undefined' && document.fonts) ? document.fonts.ready.catch(() => {}) : Promise.resolve();

    Promise.all([...imgLoads, fontReady]).then(() => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      const wait = Math.max(0, 450 - elapsed); // minimal tampil sebentar, biar nggak kedip kalau asetnya udah ke-cache
      setTimeout(() => {
        if (cancelled) return;
        if (rootRef.current) gsap.to(rootRef.current, { opacity: 0, duration: 0.35, ease: 'power1.out', onComplete: onDone });
        else onDone();
      }, wait);
    });

    const failsafe = setTimeout(() => { if (!cancelled) { cancelled = true; onDone(); } }, 6000);
    return () => { cancelled = true; clearTimeout(failsafe); };
  }, [onDone]);

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#141a10] gap-4">
      <img
        src="/assets/game/mascot-idle.png"
        alt=""
        width={92}
        height={98}
        className="w-[clamp(64px,20vw,110px)] h-auto animate-bounce select-none"
        draggable={false}
      />
      <div className="w-[min(58vw,220px)] h-2.5 rounded-full bg-[#2a2a2a] overflow-hidden border border-[#3a3a3a]">
        <div className="h-full bg-[#5f9c22] transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-[#8a988a] tracking-wide">Memuat... {pct}%</p>
    </div>
  );
}
