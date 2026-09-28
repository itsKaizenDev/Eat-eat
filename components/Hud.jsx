'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ICONS } from '@/lib/icons';

function EffectBadge({ effect }) {
  const ref = useRef(null);
  const Icon = ICONS[effect.type] || ICONS.help;
  useEffect(() => {
    gsap.fromTo(ref.current, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(3)' });
  }, []);
  return (
    <div ref={ref} className="flex items-center gap-1 bg-[#232323] text-white text-[11px] font-semibold px-2 py-1 rounded-full">
      <Icon size={13} strokeWidth={2.5} />
      <span>{effect.label}</span>
      {effect.t && <span className="opacity-60">{effect.t}</span>}
    </div>
  );
}

function Hearts({ count }) {
  const HeartIcon = ICONS.heart;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: Math.max(0, count) }).map((_, i) => (
        <HeartIcon key={i} size={11} className="fill-current" />
      ))}
    </span>
  );
}

export default function Hud({ mode, modeLabel, timerText, effects, score, best, mpHud, onHelp, side, lefty, onSwap }) {
  const HelpIcon = ICONS.help;
  const TimerIcon = ICONS.timeattack;

  // Mode landscape di HP: HUD jadi kartu vertikal di panel samping kanvas.
  if (side) {
    const showTimer = mode === 'timeattack' && timerText;
    return (
      <div className="side-hud bg-white text-[#202124] rounded-xl shadow-lg p-3 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ICONS.gamepad size={18} className="text-[#5f6368] shrink-0" />
            <b className="text-[15px] tracking-wide truncate">{modeLabel}</b>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onSwap}
              aria-label={lefty ? 'Mode kidal aktif, tap untuk balik ke kanan' : 'Pindahkan tombol ke kiri (mode kidal)'}
              aria-pressed={!!lefty}
              className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform ${lefty ? 'bg-[#5f9c22] text-white' : 'bg-[#e8eaed] text-[#3c4043]'}`}
            >
              <ICONS.swap size={17} />
            </button>
            <button onClick={onHelp} aria-label="Bantuan" className="w-9 h-9 rounded-full bg-[#232323] text-white flex items-center justify-center active:scale-95 transition-transform">
              <HelpIcon size={17} />
            </button>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <ICONS.trophy size={24} className="text-[#f5b942]" />
            <span className="text-4xl font-bold leading-none">{score}</span>
          </div>
          <div className="text-xs text-[#5f6368] pb-0.5">Terbaik <b className="text-[#202124] text-sm">{best}</b></div>
        </div>
        {(showTimer || effects.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {showTimer && (
              <span className="flex items-center gap-1 text-[13px] font-bold text-[#c9432f]">
                <TimerIcon size={14} />{timerText}
              </span>
            )}
            {effects.map((e, i) => <EffectBadge key={e.type + i} effect={e} />)}
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      {mode === 'multiplayer' && mpHud && (
        <div className="game-w flex justify-between items-center text-[12px] font-semibold mb-1.5 px-1">
          <span className="flex items-center gap-1.5" style={{ color: '#8fd13f' }}>{mpHud.p1Label} <Hearts count={mpHud.p1Lives} /></span>
          <span className="flex items-center gap-1.5" style={{ color: '#5fc2ea' }}>{mpHud.p2Label} <Hearts count={mpHud.p2Lives} /></span>
        </div>
      )}
      <div className="game-w bg-white text-[#202124] rounded-lg flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 mb-2 sm:mb-2.5 shadow-lg">
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
          <ICONS.gamepad size={18} className="text-[#5f6368]" />
          <b className="text-[15px] sm:text-[17px] tracking-wide">{modeLabel}</b>
          {mode === 'timeattack' && timerText && (
            <span className="flex items-center gap-1 text-[13px] font-bold text-[#c9432f]">
              <TimerIcon size={14} />{timerText}
            </span>
          )}
          <div className="flex items-center gap-1 flex-wrap">
            {effects.map((e, i) => <EffectBadge key={e.type + i} effect={e} />)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onHelp} aria-label="Bantuan" className="w-7 h-7 rounded-full bg-[#232323] text-white flex items-center justify-center">
            <HelpIcon size={15} />
          </button>
          {mode !== 'multiplayer' && (
            <div className="flex items-center gap-1.5 font-bold">
              <ICONS.trophy size={15} className="text-[#f5b942]" />
              <span>{score}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
