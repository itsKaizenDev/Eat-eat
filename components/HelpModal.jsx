'use client';
import { useRef } from 'react';
import { MODE_RULES } from '@/lib/constants';
import { getMode } from '@/lib/modes/registry';
import { ICONS } from '@/lib/icons';
import { useModalFocus } from '@/hooks/useModalFocus';

export default function HelpModal({ open, mode, onClose }) {
  const ref = useRef(null);
  useModalFocus(ref, open, onClose);
  if (!open) return null;
  const rules = MODE_RULES[mode] || MODE_RULES.classic;
  const actions = mode === 'puzzle' ? [['steps', 'Gerak: ketuk untuk berganti jalan, lari, dan mengendap.'], ['dark', 'Sembunyi / keluar (F), aktif di dekat persembunyian.'], ['key', 'Interaksi (E), aktif saat dekat objek.'], ['flask', 'Pakai alat (Q). Pulih 10 detik.'], ['swap', 'Ganti alat (X), terpisah dari cara bergerak.']] : [];
  return <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="help-title" className="sheet-backdrop no-swipe">
    <section className="game-sheet help-sheet"><header><h2 id="help-title">Cara main · {getMode(mode)?.label}</h2><button className="icon-button" data-autofocus aria-label="Tutup bantuan" onClick={onClose}><ICONS.close size={20} /></button></header>
      <div className="sheet-content"><p>{getMode(mode)?.controls}</p><p>Joystick berada di sudut arena. {mode === 'puzzle' ? 'Dorong ke delapan arah. Lepas untuk berhenti.' : 'Dorong ke empat arah atau geser layar untuk berbelok.'} Esc / Jeda menghentikan permainan. Posisi joystick dapat ditukar dari Pengaturan.</p><div className="help-grid">{[...actions.map(([icon, text]) => ({ icon, text })), ...rules].map((r, i) => { const Icon = ICONS[r.icon] || ICONS.help; return <p key={i} className="help-rule"><Icon size={18} className="help-rule-icon" /><span>{r.text}</span></p>; })}</div></div>
      <footer>Permainan tetap dijeda setelah bantuan ditutup.</footer>
    </section>
  </div>;
}
