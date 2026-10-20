'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { MODE_RULES } from '@/lib/constants';
import { ICONS } from '@/lib/icons';

export default function HelpModal({ open, mode, onClose }) {
  const cardRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    if (cardRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(cardRef.current, { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
    }
    if (closeRef.current) closeRef.current.focus({ preventScroll: true });
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Tab') { e.preventDefault(); if (closeRef.current) closeRef.current.focus({ preventScroll: true }); } // satu-satunya kontrol: fokus tidak keluar dialog
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && prev.focus && document.contains(prev)) prev.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const rules = MODE_RULES[mode] || MODE_RULES.classic;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="help-title" className="no-swipe fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div ref={cardRef} className="focus-dialog help-dialog w-full max-h-[90dvh] overflow-y-auto text-sm leading-relaxed">
        <h3 id="help-title" className="text-base font-bold mb-2.5">Cara Main</h3>
        <div className="help-controls">
          <p className="flex items-center gap-2"><ICONS.gamepad size={15} className="shrink-0" /> Panah / WASD — gerak ular</p>
          <p className="flex items-center gap-2"><ICONS.right size={15} className="shrink-0" /> Swipe layar — gerak (mobile)</p>
          <p className="flex items-center gap-2"><ICONS.pause size={15} className="shrink-0" /> Esc / tombol Jeda — jeda permainan</p>
        </div>
        <div className="help-grid">
          {rules.map((r, i) => {
            const Icon = ICONS[r.icon] || ICONS.help;
            return (
              <p key={i} className="help-rule">
                <Icon size={16} className="help-rule-icon shrink-0" />
                <span>{r.text}</span>
              </p>
            );
          })}
        </div>
        <button ref={closeRef} onClick={onClose} className="mt-4 bg-[#5f9c22] text-white px-5 py-2 rounded-full font-bold w-full">Oke</button>
      </div>
    </div>
  );
}
