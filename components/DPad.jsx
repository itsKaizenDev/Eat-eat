'use client';
import { useRef, useCallback } from 'react';
import { ICONS } from '@/lib/icons';

// Satu permukaan bulat: arah ditentukan dari sudut jempol ke titik tengah,
// bukan dari tombol terpisah. Zona tengah = mati (nggak ganti arah), knob
// ikut jempol kayak analog, balik ke tengah pas dilepas.
const DEAD = 0.32; // proporsi radius yang jadi zona mati

export default function DPad({ onMove, onRelease }) {
  const padRef = useRef(null);
  const knobRef = useRef(null);
  const st = useRef({ pid: null, dir: null });

  const placeKnob = (dx, dy) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const resolve = useCallback((clientX, clientY) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const max = r.width / 2;
    const clamped = Math.min(dist, max * 0.6);
    const ang = Math.atan2(dy, dx);
    placeKnob(Math.cos(ang) * clamped, Math.sin(ang) * clamped);

    if (dist < max * DEAD) { if (st.current.dir) onRelease?.(); st.current.dir = null; return; }

    let dir;
    if (ang > -Math.PI / 4 && ang <= Math.PI / 4) dir = 'r';
    else if (ang > Math.PI / 4 && ang <= (3 * Math.PI) / 4) dir = 'd';
    else if (ang > (3 * Math.PI) / 4 || ang <= -(3 * Math.PI) / 4) dir = 'l';
    else dir = 'u';

    const axes = { r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 };
    if (st.current.dir) {
      const delta = Math.atan2(Math.sin(ang - axes[st.current.dir]), Math.cos(ang - axes[st.current.dir]));
      if (Math.abs(delta) < Math.PI * .3) dir = st.current.dir;
    }

    if (dir !== st.current.dir) {
      st.current.dir = dir;
      if (dir === 'u') onMove(0, -1);
      else if (dir === 'd') onMove(0, 1);
      else if (dir === 'l') onMove(-1, 0);
      else onMove(1, 0);
    }
  }, [onMove, onRelease]);

  const onDown = (e) => {
    if (st.current.pid !== null || !e.isPrimary) return;
    e.preventDefault();
    st.current.pid = e.pointerId;
    padRef.current && padRef.current.setPointerCapture(e.pointerId);
    if (knobRef.current) knobRef.current.style.transition = 'none';
    resolve(e.clientX, e.clientY);
  };
  const onMovePtr = (e) => {
    if (e.pointerId !== st.current.pid) return;
    e.preventDefault();
    resolve(e.clientX, e.clientY);
  };
  const onUp = (e) => {
    if (e.pointerId !== st.current.pid) return;
    st.current.pid = null;
    st.current.dir = null;
    onRelease?.();
    if (knobRef.current) {
      knobRef.current.style.transition = 'transform 150ms ease';
      placeKnob(0, 0);
    }
  };

  const arrow = "absolute text-[#8a988a]";
  return (
    <div
      id="dpad"
      ref={padRef}
      className="no-swipe relative rounded-full bg-[#232323] border border-[#3a3a3a] shadow-md touch-none select-none mx-auto mt-3.5"
      style={{ width: 'var(--dpad)', height: 'var(--dpad)' }}
      onPointerDown={onDown}
      onPointerMove={onMovePtr}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
    >
      <ICONS.up className={arrow} style={{ top: '9%', left: '50%', transform: 'translateX(-50%)' }} size={24} strokeWidth={2.6} />
      <ICONS.down className={arrow} style={{ bottom: '9%', left: '50%', transform: 'translateX(-50%)' }} size={24} strokeWidth={2.6} />
      <ICONS.left className={arrow} style={{ left: '9%', top: '50%', transform: 'translateY(-50%)' }} size={24} strokeWidth={2.6} />
      <ICONS.right className={arrow} style={{ right: '9%', top: '50%', transform: 'translateY(-50%)' }} size={24} strokeWidth={2.6} />
      <div
        ref={knobRef}
        className="absolute rounded-full bg-[#3f3f3f] border border-[#5a5a5a] shadow-inner pointer-events-none"
        style={{ width: '36%', height: '36%', top: '32%', left: '32%' }}
      />
    </div>
  );
}
