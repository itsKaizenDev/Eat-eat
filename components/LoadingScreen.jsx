'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { bgFiles } from '@/lib/sceneTheme';

// Semua background & mascot di-preload di sini duluan, biar pas menu muncul
// gambarnya udah siap semua (nggak ada kedip/pop-in pas geser mode pertama
// kali, dan nggak ada layar putih kosong sekilas di HP koneksi lambat).
const MASCOT_FILES = [
  '/assets/game/mascot-idle.png', '/assets/game/mascot-win.png', '/assets/game/mascot-sick.png',
  '/assets/game/mascot-shock.png', '/assets/game/mascot-dizzy.png',
];

const TITLE = 'Snake Games';

export default function LoadingScreen({ onDone }) {
  const [pct, setPct] = useState(0);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const lettersRef = useRef([]);
  const dotsRef = useRef([]);

  // Reveal: panel muncul dari satu titik di tengah lalu membuka ke seluruh layar,
  // lanjut huruf judul mantul satu-satu, lalu titik "Loading...." mulai ngetik loop.
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(panelRef.current,
      { clipPath: 'circle(0% at 50% 50%)' },
      { clipPath: 'circle(150% at 50% 50%)', duration: 0.7, ease: 'power2.out' }
    );
    tl.fromTo(lettersRef.current,
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'bounce.out', stagger: 0.055 },
      '-=0.25'
    );
    const dotsTl = gsap.timeline({ repeat: -1, delay: 0.3 });
    dotsRef.current.forEach((el) => {
      dotsTl.to(el, { opacity: 1, duration: 0.18 }, '+=0.16');
    });
    dotsTl.to(dotsRef.current, { opacity: 0, duration: 0.22 }, '+=0.5');
    return () => { tl.kill(); dotsTl.kill(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const ASSETS = [...bgFiles(), ...MASCOT_FILES];
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
      const wait = Math.max(0, 700 - elapsed); // minimal tampil sebentar biar animasi judul kelar duluan
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
    <div ref={rootRef} className="fixed inset-0 z-[100]">
      <div ref={panelRef} className="absolute inset-0 flex flex-col items-center justify-center bg-[#141a10] gap-5">
        <h1 className="flex text-[clamp(1.6rem,7vw,2.4rem)] font-bold tracking-wide text-[#e8f0e0]" style={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>
          {TITLE.split('').map((ch, i) => (
            <span
              key={i}
              ref={(el) => { lettersRef.current[i] = el; }}
              className="inline-block"
              style={{ whiteSpace: 'pre' }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <div className="w-[min(58vw,220px)] h-2.5 rounded-full bg-[#2a2a2a] overflow-hidden border border-[#3a3a3a]">
          <div className="h-full bg-[#5f9c22] transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
        </div>

        <p className="text-[12px] text-[#8a988a] tracking-wide flex items-baseline">
          <span>Loading</span>
          {[0, 1, 2, 3].map(i => (
            <span key={i} ref={(el) => { dotsRef.current[i] = el; }} className="opacity-0" style={{ marginLeft: 1 }}>.</span>
          ))}
        </p>
      </div>
    </div>
  );
}
