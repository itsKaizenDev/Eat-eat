'use client';
import { ICONS } from '@/lib/icons';

export default function DPad({ mode, onMove }) {
  const btn = "w-11 h-11 rounded-lg bg-[#2b2b2b] border border-[#3d3d3d] flex items-center justify-center text-white active:bg-[#3a3a3a]";
  return (
    <div id="dpad" className="grid grid-cols-3 grid-rows-2 gap-1.5 mt-3.5" style={{ width: 150 }}>
      <button className={`col-start-2 row-start-1 ${btn}`} onClick={() => onMove(0, -1)}><ICONS.up size={20} /></button>
      <button className={`col-start-1 row-start-2 ${btn}`} onClick={() => onMove(-1, 0)}><ICONS.left size={20} /></button>
      <button className={`col-start-2 row-start-2 ${btn}`} onClick={() => onMove(0, 1)}><ICONS.down size={20} /></button>
      <button className={`col-start-3 row-start-2 ${btn}`} onClick={() => onMove(1, 0)}><ICONS.right size={20} /></button>
    </div>
  );
}
