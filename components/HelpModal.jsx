'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { MODE_RULES } from '@/lib/constants';
import { ICONS } from '@/lib/icons';

export default function HelpModal({ open, mode, onClose }) {
  const cardRef = useRef(null);
  useEffect(() => {
    if (open && cardRef.current) {
      gsap.fromTo(cardRef.current, { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
    }
  }, [open]);

  if (!open) return null;
  const rules = MODE_RULES[mode] || MODE_RULES.classic;

  return (
    <div className="no-swipe fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div ref={cardRef} className="bg-[#232323] rounded-xl p-5 max-w-[360px] w-full max-h-[90dvh] overflow-y-auto text-sm leading-relaxed">
        <h3 className="text-base font-bold mb-2.5">Cara Main</h3>
        <div className="space-y-1.5 mb-3 text-[#c9d6bd]">
          <p className="flex items-center gap-2"><ICONS.gamepad size={15} className="shrink-0" /> Panah / WASD — gerak ular</p>
          <p className="flex items-center gap-2"><ICONS.right size={15} className="shrink-0" /> Swipe layar — gerak (mobile)</p>
        </div>
        <div className="border-t border-[#3a3a3a] pt-3 space-y-2">
          {rules.map((r, i) => {
            const Icon = ICONS[r.icon] || ICONS.help;
            return (
              <p key={i} className="flex items-start gap-2 text-[#c9d6bd]">
                <Icon size={16} className="shrink-0 mt-0.5 text-[#8fd13f]" />
                <span>{r.text}</span>
              </p>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-4 bg-[#5f9c22] text-white px-5 py-2 rounded-full font-bold w-full">Oke</button>
      </div>
    </div>
  );
}
