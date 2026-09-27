'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const BG = {
  classic: '/assets/game/bg-classic.png',
  portal: '/assets/game/bg-portal.png',
  timeattack: '/assets/game/bg-timeattack.png',
  mayhem: '/assets/game/bg-mayhem.png',
  mayhemplus: '/assets/game/bg-mayhemplus.png',
  multiplayer: '/assets/game/bg-multiplayer.png',
};

// Background gambar penuh per mode, di-crossfade (blend) pakai GSAP tiap kali
// mode dipilih beda — bukan ganti instan.
export default function BackgroundLayer({ mode }) {
  const [layers, setLayers] = useState(() => [{ src: BG[mode] || BG.classic, key: mode }]);
  const refs = useRef({});

  useEffect(() => {
    setLayers(prev => {
      if (prev[prev.length - 1].key === mode) return prev;
      return [...prev, { src: BG[mode] || BG.classic, key: mode + '-' + Date.now() }];
    });
  }, [mode]);

  useEffect(() => {
    if (layers.length < 2) return;
    const top = layers[layers.length - 1];
    const el = refs.current[top.key];
    if (!el) return;
    gsap.fromTo(el, { opacity: 0 }, {
      opacity: 1, duration: 0.7, ease: 'power1.out',
      onComplete: () => setLayers(prev => (prev[prev.length - 1].key === top.key ? [top] : prev)),
    });
  }, [layers]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#1e1e1e]">
      {layers.map(l => (
        <div
          key={l.key}
          ref={(el) => { refs.current[l.key] = el; }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${l.src})` }}
        />
      ))}
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}
