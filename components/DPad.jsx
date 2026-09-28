'use client';
import { ICONS } from '@/lib/icons';

// Ukuran tombol pakai CSS var --dp (diatur di globals.css, responsif per layar).
export default function DPad({ mode, onMove }) {
  const btn = "w-[var(--dp)] h-[var(--dp)] rounded-xl bg-[#2b2b2b] border border-[#3d3d3d] flex items-center justify-center text-white shadow-md active:bg-[#3a3a3a] active:scale-95 transition-transform touch-manipulation select-none";
  const press = (x, y) => (e) => { e.preventDefault(); onMove(x, y); };
  return (
    <div id="dpad" className="grid grid-cols-3 grid-rows-2 gap-2 mt-3.5" style={{ width: 'calc(var(--dp) * 3 + 1rem)' }}>
      <button aria-label="Atas" className={`col-start-2 row-start-1 ${btn}`} onPointerDown={press(0, -1)}><ICONS.up size={28} strokeWidth={2.6} /></button>
      <button aria-label="Kiri" className={`col-start-1 row-start-2 ${btn}`} onPointerDown={press(-1, 0)}><ICONS.left size={28} strokeWidth={2.6} /></button>
      <button aria-label="Bawah" className={`col-start-2 row-start-2 ${btn}`} onPointerDown={press(0, 1)}><ICONS.down size={28} strokeWidth={2.6} /></button>
      <button aria-label="Kanan" className={`col-start-3 row-start-2 ${btn}`} onPointerDown={press(1, 0)}><ICONS.right size={28} strokeWidth={2.6} /></button>
    </div>
  );
}
