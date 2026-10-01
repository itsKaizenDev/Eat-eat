'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ICONS } from '@/lib/icons';
import { useIsTouch } from '@/hooks/useIsTouch';
import { ACCENT } from '@/lib/sceneTheme';
import { MODE_NAMES } from '@/lib/constants';

const GROUPS = [
  { key: 'classic', icon: 'classic', label: 'Classic' },
  { key: 'mayhem', icon: 'mayhem', label: 'Mayhem' },
  { key: 'mp', icon: 'multiplayer', label: '2P Lokal', mode: 'multiplayer' },
];

const SUBS = {
  classic: [
    { mode: 'classic', label: 'Classic' },
    { mode: 'classicnight', label: 'Malam' },
    { mode: 'portal', label: 'Portal' },
    { mode: 'timeattack', label: 'Time' },
  ],
  mayhem: [
    { mode: 'mayhem', label: 'Mayhem' },
    { mode: 'mayhemplus', label: 'Mayhem+' },
    { mode: 'mayhemhard', label: 'Hard' },
    { mode: 'impossible', label: 'Impossible' },
  ],
  mp: [
    { mode: 'multiplayer', label: '2P Lokal' },
    { mode: 'mayhemduo', label: 'Mayhem Duo' },
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
  idle:  'linear-gradient(180deg, rgba(8,14,4,.50) 0%, rgba(8,14,4,0) 24%, rgba(8,14,4,0) 58%, rgba(8,14,4,.38) 100%)',
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

const SPEEDS = [{ k: 'santai', l: 'Santai' }, { k: 'normal', l: 'Normal' }, { k: 'ngebut', l: 'Ngebut' }, { k: 'konstan', l: 'Konstan' }];
function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${on ? 'bg-[#5f9c22] border-[#8fd13f] text-white' : 'bg-[#1c1c1c] border-[#3a3a3a] text-[#c9d6bd] hover:bg-[#262626]'}`}>{children}</button>
  );
}

export default function Overlay({ side, host, visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay, speed, onSpeedChange, taSecs, onTaChange }) {
  const [group, setGroup] = useState('classic');
  const isTouch = useIsTouch();
  const groups = isTouch ? GROUPS.filter(g => g.key !== 'mp') : GROUPS; // 2P Lokal disembunyikan di HP
  const showPicker = phase !== 'pause';
  const rootRef = useRef(null);
  const mascotRef = useRef(null);
  const slamRef = useRef(null);
  const prevMode = useRef(mode);
  const playTimer = useRef(null);
  const idle = mood === 'idle';

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

  // Ganti mode = nama mode "menghantam" layar dari kiri (ala layar pilih karakter game fighting).
  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    const el = slamRef.current;
    if (!el || !idle) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.killTweensOf(el);
    gsap.timeline()
      .fromTo(el, { x: -150, opacity: 0, skewX: -20, scale: 1.2 }, { x: 0, opacity: 1, skewX: -8, scale: 1, duration: 0.38, ease: 'back.out(2.2)' })
      .to(el, { x: 40, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.8');
  }, [mode, idle]);

  useEffect(() => () => { if (playTimer.current) clearTimeout(playTimer.current); }, []);

  // PLAY dari menu awal: scene zoom-in + flash sebentar, baru game mulai.
  function handlePlay() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !idle || phase !== 'start') { onPlay(); return; }
    if (playTimer.current) return;
    window.dispatchEvent(new Event('snake:play-punch'));
    playTimer.current = setTimeout(() => { playTimer.current = null; onPlay(); }, 320);
  }

  function selectGroup(g) {
    setGroup(g.key);
    onModeChange(SUBS[g.key][0].mode);
  }

  if (!visible) return null;

  const body = (
      <div className={`ov-body flex flex-col items-center w-full ${host ? 'side-card' : idle ? 'rounded-2xl p-3 bg-black/55 border border-white/10 max-w-[340px]' : ''}`}>
      {showPicker && (
        <>
          <div className="relative flex gap-2 justify-center mb-2 w-full">
            {groups.map(g => {
              const Icon = ICONS[g.icon];
              return (
                <button
                  key={g.key}
                  onClick={() => selectGroup(g)}
                  className={`mode-group flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border-2 border-transparent bg-[#232323]/90 shadow-md transition-colors hover:bg-[#2c2c2c] ${group === g.key ? 'active' : ''}`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                  <span className="text-[11px] font-semibold">{g.label}</span>
                </button>
              );
            })}
          </div>
          {(
            <div className="relative grid gap-2 justify-center mb-2 w-full" style={{ gridTemplateColumns: `repeat(${SUBS[group].length}, minmax(0, 1fr))` }}>
              {SUBS[group].map(s => {
                const Icon = ICONS[s.mode];
                return (
                  <button
                    key={s.mode}
                    onClick={() => onModeChange(s.mode)}
                    className={`mode-btn flex flex-col items-center gap-0.5 py-1.5 rounded-xl border-2 border-transparent bg-[#1c1c1c]/90 shadow-md transition-colors hover:bg-[#262626] ${mode === s.mode ? 'active' : ''}`}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                    <span className="text-[9px] font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {mode === 'impossible'
            ? <p className="relative text-[11px] text-[#e8a09a] mb-2">Kecepatan dikunci: Ngebut</p>
            : <div className="relative flex flex-wrap gap-1.5 justify-center mb-2">
                {SPEEDS.map(s => <Chip key={s.k} on={speed === s.k} onClick={() => onSpeedChange(s.k)}>{s.l}</Chip>)}
              </div>}
          {mode === 'timeattack' && (
            <div className="relative flex flex-wrap gap-1.5 justify-center mb-2">
              {[30, 60, 90, 120].map(t => <Chip key={t} on={taSecs === t} onClick={() => onTaChange(t)}>{t}s</Chip>)}
            </div>
          )}
          <div className="mb-2" />
        </>
      )}

      <button
        onClick={handlePlay}
        className={`relative bg-[#5f9c22] text-white ${host ? 'w-full py-2 text-base' : 'px-12 py-2.5 text-lg'} rounded-full active:scale-95 transition-transform font-bold tracking-wide shadow-lg`}
        style={{ boxShadow: '0 4px 14px rgba(95,156,34,.5)' }}
      >
        {btnText}
      </button>
      </div>
  );

  return (
    <div
      ref={rootRef}
      className="overlay-root no-swipe absolute inset-0 flex flex-col text-center p-3 sm:p-5 rounded overflow-y-auto"
      style={{ background: MOOD_BG[mood] || MOOD_BG.idle, '--accent': ACCENT[mode] || '#5f9c22' }}
    >
      {mood === 'win' && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded opacity-60"
          style={{ backgroundImage: CONFETTI_BG, backgroundSize: CONFETTI_SIZE, backgroundPosition: CONFETTI_POS }}
        />
      )}
      <div
        ref={slamRef}
        aria-hidden
        className="pointer-events-none absolute left-[5%] top-[24%] z-20 opacity-0 select-none font-bold italic leading-none whitespace-nowrap"
        style={{ willChange: 'transform, opacity', fontSize: 'clamp(2rem, 9vw, 3.6rem)', color: '#fff', WebkitTextStroke: '1.5px rgba(0,0,0,.55)', paintOrder: 'stroke fill', textShadow: '0 4px 0 var(--accent), 0 10px 22px rgba(0,0,0,.55)' }}
      >
        {MODE_NAMES[mode]}
      </div>
      <div className={`overlay-inner relative flex flex-col items-center w-full ${host ? 'ov-split ' : ''}${idle ? 'flex-1 justify-between' : 'm-auto'}`}>
      <div className="ov-head flex flex-col items-center">
      {!idle && <img
        ref={mascotRef}
        src={MASCOTS[mood] || MASCOTS.idle}
        alt=""
        width={92}
        height={98}
        className="ov-mascot relative mb-1 select-none w-[clamp(56px,min(26vw,14vh),116px)] h-auto"
        draggable={false}
      />}
      <h2 className="relative text-[clamp(1.5rem,7vw,2rem)] mb-1 font-bold tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>{title}</h2>
      <p className="relative text-[clamp(.75rem,3.2vw,.875rem)] text-[#d8e6c8] mb-3 sm:mb-4">{sub}</p>
      </div>

      {side && !host ? null : (host ? createPortal(body, host) : body)}
      </div>
    </div>
  );
}
