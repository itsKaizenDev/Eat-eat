'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ICONS } from '@/lib/icons';

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

export default function Overlay({ visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay }) {
  const [group, setGroup] = useState('classic');
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
      className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 rounded"
      style={{ background: 'radial-gradient(circle at 50% 30%,rgba(45,65,20,.92),rgba(10,16,6,.94))' }}
    >
      <img
        ref={mascotRef}
        src={MASCOTS[mood] || MASCOTS.idle}
        alt=""
        width={92}
        height={98}
        className="mb-1 select-none"
        draggable={false}
      />
      <h2 className="text-3xl mb-1 font-bold tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>{title}</h2>
      <p className="text-sm text-[#d8e6c8] mb-4">{sub}</p>

      {showPicker && (
        <>
          <div className="flex gap-2 justify-center mb-3">
            {GROUPS.map(g => {
              const Icon = ICONS[g.icon];
              return (
                <button
                  key={g.key}
                  onClick={() => selectGroup(g)}
                  className={`mode-group flex flex-col items-center gap-1 w-20 py-2.5 rounded-xl border-2 border-transparent bg-[#232323] shadow-md transition-colors hover:bg-[#2c2c2c] ${group === g.key ? 'active' : ''}`}
                >
                  <Icon size={22} strokeWidth={2.2} />
                  <span className="text-[10px] font-semibold">{g.label}</span>
                </button>
              );
            })}
          </div>
          {group !== 'mp' && (
            <div className="grid grid-cols-3 gap-2 justify-center mb-5 max-w-[300px]">
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
        className="bg-[#5f9c22] text-white px-10 py-3 rounded-full font-bold tracking-wide shadow-lg"
        style={{ boxShadow: '0 4px 14px rgba(95,156,34,.5)' }}
      >
        {btnText}
      </button>
    </div>
  );
}
