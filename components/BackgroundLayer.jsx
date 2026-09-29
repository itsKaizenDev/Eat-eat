'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const BG = {
  classic: '/assets/game/bg-classic.png',
  classicnight: '/assets/game/bg-classicnight.png',
  portal: '/assets/game/bg-portal.png',
  timeattack: '/assets/game/bg-timeattack.png',
  mayhem: '/assets/game/bg-mayhem.png',
  mayhemplus: '/assets/game/bg-mayhemplus.png',
  mayhemhard: '/assets/game/bg-mayhemhard.png',
  impossible: '/assets/game/bg-impossible.png',
  multiplayer: '/assets/game/bg-multiplayer.png',
  mayhemduo: '/assets/game/bg-mayhemduo.png',
};

// Urutan "kanonik" dipakai buat nentuin arah geser: pindah ke mode yang lebih
// jauh ke kanan di daftar ini = gambar baru masuk dari kanan (dan sebaliknya),
// jadi pas gonta-ganti mode di menu, latarnya geser kayak milih karakter di
// game fighting, bukan cuma pudar.
const ORDER = ['classic', 'classicnight', 'portal', 'timeattack', 'mayhem', 'mayhemplus', 'mayhemhard', 'impossible', 'multiplayer', 'mayhemduo'];

export default function BackgroundLayer({ mode }) {
  const [layers, setLayers] = useState(() => [{ src: BG[mode] || BG.classic, key: mode, dir: 1 }]);
  const refs = useRef({});
  const prevMode = useRef(mode);

  useEffect(() => {
    setLayers(prev => {
      if (prev[prev.length - 1].key.split('::')[0] === mode) return prev;
      const a = ORDER.indexOf(prevMode.current);
      const b = ORDER.indexOf(mode);
      const dir = b >= a ? 1 : -1;
      prevMode.current = mode;
      return [...prev, { src: BG[mode] || BG.classic, key: mode + '::' + Date.now(), dir }];
    });
  }, [mode]);

  useEffect(() => {
    if (layers.length < 2) return;
    const top = layers[layers.length - 1];
    const el = refs.current[top.key];
    const under = layers[layers.length - 2];
    const elUnder = under && refs.current[under.key];
    if (!el) return;
    const tl = gsap.timeline({
      onComplete: () => setLayers(prev => (prev[prev.length - 1].key === top.key ? [top] : prev)),
    });
    tl.fromTo(el, { xPercent: 100 * top.dir, opacity: 0.55 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0);
    if (elUnder) tl.to(elUnder, { xPercent: -35 * top.dir, opacity: 0.35, duration: 0.5, ease: 'power3.out' }, 0);
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
      <div className={`absolute inset-0 transition-colors duration-700 ${mode === 'classicnight' ? 'bg-[#050b14]/70' : 'bg-black/32'}`} />
    </div>
  );
}
