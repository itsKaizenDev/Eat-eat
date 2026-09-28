'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ICONS } from '@/lib/icons';
import { useIsTouch } from '@/hooks/useIsTouch';

const GROUPS = [
  { key: 'classic', icon: 'classic', label: 'Classic' },
  { key: 'mayhem', icon: 'mayhem', label: 'Mayhem' },
  { key: 'mp', icon: 'multiplayer', label: '2P Lokal', mode: 'multiplayer' },
];

const SUBS = {
  classic: [
    { mode: 'classic', label: 'Classic' },
    { mode: 'portal', label: 'Portal' },
    { mode: 'timeattack', label: 'Time' },
  ],
  mayhem: [
    { mode: 'mayhem', label: 'Mayhem' },
    { mode: 'mayhemplus', label: 'Mayhem+' },
  ],
};

const MASCOTS = {
  idle: '/assets/game/mascot-idle.png',
  win: '/assets/game/mascot-win.png',
  sick: '/assets/game/mascot-sick.png',
  shock: '/assets/game/mascot-shock.png',
  dizzy: '/assets/game/mascot-dizzy.png',
};

// Tint overlay per mood, biar layar "Menang" kerasa beda sama "Game Over"/"Waktu
// Habis" — bukan cuma teks & mascot yang beda, warna suasananya juga ikut ganti.
const MOOD_BG = {
  idle:  'radial-gradient(circle at 50% 30%, rgba(45,65,20,.92), rgba(10,16,6,.94))',
  win:   'radial-gradient(circle at 50% 30%, rgba(120,92,10,.90), rgba(48,30,4,.95))',
  sick:  'radial-gradient(circle at 50% 30%, rgba(80,28,96,.90), rgba(22,8,28,.95))',
  shock: 'radial-gradient(circle at 50% 30%, rgba(110,26,22,.90), rgba(28,6,6,.95))',
  dizzy: 'radial-gradient(circle at 50% 30%, rgba(34,42,92,.90), rgba(10,10,26,.95))',
};

// Confetti kecil buat layar menang doang — titik-titik warna-warni yang
// disusun pakai beberapa radial-gradient, tanpa perlu file gambar baru.
const CONFETTI_BG = [
  'radial-gradient(circle, #ffd23f 3px, transparent 4px)',
  'radial-gradient(circle, #ff6a5c 3px, transparent 4px)',
  'radial-gradient(circle, #5fc2ea 3px, transparent 4px)',
  'radial-gradient(circle, #8fd13f 3px, transparent 4px)',
].join(',');
const CONFETTI_SIZE = '64px 84px, 78px 96px, 90px 70px, 70px 110px';
const CONFETTI_POS = '6px 10px, 34px 46px, 54px 8px, 20px 70px';

export default function Overlay({ visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay }) {
  const [group, setGroup] = useState('classic');
  const isTouch = useIsTouch();
  const groups = isTouch ? GROUPS.filter(g => g.key !== 'mp') : GROUPS; // 2P Lokal disembunyikan di HP
  const showPicker = phase !== 'pause';
  const rootRef = useRef(null);
  const mascotRef = useRef(null);

  useEffect(() => {
    if (visible && rootRef.current) {
      gsap.fromTo(rootRef.current, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.32, ease: 'power2.out' });
    }
  }, [visible, phase]);

  useEffect(() => {
    if (mascotRef.current) {
      gsap.fromTo(mascotRef.current, { scale: 0.6, rotate: -8, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' });
    }
  }, [mood]);

  function selectGroup(g) {
    setGroup(g.key);
    if (g.key === 'mp') { onModeChange('multiplayer'); return; }
    onModeChange(SUBS[g.key][0].mode);
  }

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      className="overlay-root no-swipe absolute inset-0 flex flex-col text-center p-3 sm:p-5 rounded overflow-y-auto"
      style={{ background: MOOD_BG[mood] || MOOD_BG.idle }}
    >
      {mood === 'win' && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded opacity-60"
          style={{ backgroundImage: CONFETTI_BG, backgroundSize: CONFETTI_SIZE, backgroundPosition: CONFETTI_POS }}
        />
      )}
      <div className="overlay-inner relative m-auto flex flex-col items-center w-full">
      <div className="ov-head flex flex-col items-center">
      <img
        ref={mascotRef}
        src={MASCOTS[mood] || MASCOTS.idle}
        alt=""
        width={92}
        height={98}
        className="ov-mascot relative mb-1 select-none w-[clamp(56px,min(26vw,14vh),116px)] h-auto"
        draggable={false}
      />
      <h2 className="relative text-[clamp(1.5rem,7vw,2rem)] mb-1 font-bold tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>{title}</h2>
      <p className="relative text-[clamp(.75rem,3.2vw,.875rem)] text-[#d8e6c8] mb-3 sm:mb-4">{sub}</p>
      </div>

      <div className="ov-body flex flex-col items-center w-full">
      {showPicker && (
        <>
          <div className="relative flex gap-2 justify-center mb-3">
            {groups.map(g => {
              const Icon = ICONS[g.icon];
              return (
                <button
                  key={g.key}
                  onClick={() => selectGroup(g)}
                  className={`mode-group flex flex-col items-center gap-1 w-[clamp(64px,22vw,80px)] py-2 rounded-xl border-2 border-transparent bg-[#232323] shadow-md transition-colors hover:bg-[#2c2c2c] ${group === g.key ? 'active' : ''}`}
                >
                  <Icon size={22} strokeWidth={2.2} />
                  <span className="text-[10px] font-semibold">{g.label}</span>
                </button>
              );
            })}
          </div>
          {group !== 'mp' && (
            <div className="relative grid grid-cols-3 gap-2 justify-center mb-4 sm:mb-5 w-full max-w-[300px]">
              {SUBS[group].map(s => {
                const Icon = ICONS[s.mode];
                return (
                  <button
                    key={s.mode}
                    onClick={() => onModeChange(s.mode)}
                    className={`mode-btn flex flex-col items-center gap-1 py-2 rounded-xl border-2 border-transparent bg-[#1c1c1c] shadow-md transition-colors hover:bg-[#262626] ${mode === s.mode ? 'active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                    <span className="text-[9px] font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <button
        onClick={onPlay}
        className="relative bg-[#5f9c22] text-white px-12 py-3.5 text-lg rounded-full active:scale-95 transition-transform font-bold tracking-wide shadow-lg"
        style={{ boxShadow: '0 4px 14px rgba(95,156,34,.5)' }}
      >
        {btnText}
      </button>
      </div>
      </div>
    </div>
  );
}
