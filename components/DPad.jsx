'use client';
import { useRef, useCallback, useEffect, useState } from 'react';
import { ICONS } from '@/lib/icons';

// Satu permukaan bulat: arah ditentukan dari sudut jempol ke titik tengah,
// bukan dari tombol terpisah. Zona tengah = mati (nggak ganti arah), knob
// ikut jempol kayak analog, balik ke tengah pas dilepas.
const DEAD = 0.32; // proporsi radius yang jadi zona mati

export default function DPad({ onMove, onRelease, analog = false, smooth = false, dead = DEAD, floating = false }) {
  const padRef = useRef(null);
  const knobRef = useRef(null);
  const st = useRef({ pid: null, dir: null, origin: null });
  const zoneRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const placeKnob = (dx, dy) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const resolve = useCallback((clientX, clientY) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect(), o = st.current.origin;
    const dx = clientX - (o ? o.x : r.left + r.width / 2);
    const dy = clientY - (o ? o.y : r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const max = r.width / 2;
    const clamped = Math.min(dist, max * 0.6);
    const ang = Math.atan2(dy, dx);
    placeKnob(Math.cos(ang) * clamped, Math.sin(ang) * clamped);

    if (dist < max * dead) { if (st.current.dir) onRelease?.(); st.current.dir = null; return; }

    if (smooth) {
      // Free analog vector: any angle, speed grows with thumb travel, with a floor so a light push still moves.
      const reach = max * .6, edge = max * dead, m = Math.min(1, Math.max(.4, (dist - edge) / Math.max(1, reach - edge)));
      const x = Math.cos(ang) * m, y = Math.sin(ang) * m, id = `${x.toFixed(2)},${y.toFixed(2)}`;
      if (id !== st.current.dir) { st.current.dir = id; onMove(x, y); }
      return;
    }

    if (analog) {
      const sector = Math.round(ang / (Math.PI / 4));
      const x = Math.round(Math.cos(sector * Math.PI / 4)), y = Math.round(Math.sin(sector * Math.PI / 4));
      const dir = `${x},${y}`;
      if (dir !== st.current.dir) { st.current.dir = dir; onMove(x, y); }
      return;
    }
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
  }, [onMove, onRelease, analog, smooth, dead]);

  const onDown = (e) => {
    if (st.current.pid !== null) return;
    e.preventDefault();
    padRef.current.dataset.held = 'true';
    st.current.pid = e.pointerId;
    if (floating) {
      // The pad appears under the thumb: the first touch becomes the stick's centre.
      const z = zoneRef.current.getBoundingClientRect();
      st.current.origin = { x: e.clientX, y: e.clientY }; setAnchor({ x: e.clientX - z.left, y: e.clientY - z.top });
    }
    e.currentTarget.setPointerCapture(e.pointerId);
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
    padRef.current.dataset.held = 'false';
    st.current.pid = null;
    st.current.dir = null;
    st.current.origin = null; setAnchor(null);
    onRelease?.();
    if (knobRef.current) {
      knobRef.current.style.transition = 'transform 150ms ease';
      placeKnob(0, 0);
    }
  };

  const releaseRef = useRef(onRelease); releaseRef.current = onRelease;
  useEffect(() => {
    const el = padRef.current;
    const reset = () => { const pid = st.current.pid; st.current = { pid: null, dir: null, origin: null }; setAnchor(null); if (pid !== null && el?.hasPointerCapture(pid)) el.releasePointerCapture(pid); if (el) el.dataset.held = 'false'; placeKnob(0, 0); releaseRef.current?.(); };
    const hidden = () => { if (document.hidden) reset(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset);
    window.addEventListener('orientationchange', reset);
    return () => { window.removeEventListener('blur', reset); window.removeEventListener('resize', reset); window.removeEventListener('orientationchange', reset); document.removeEventListener('visibilitychange', hidden); reset(); };
  }, []);

  const arrow = "absolute text-[#8a988a]";
  const handlers = { onPointerDown: onDown, onPointerMove: onMovePtr, onPointerUp: onUp, onPointerCancel: onUp, onLostPointerCapture: onUp };
  const size = 'calc(var(--dpad) * var(--pad-scale, 1))';
  const pad = (
    <div
      id="dpad"
      ref={padRef}
      className="no-swipe floating-pad relative rounded-full touch-none select-none"
      role="group" aria-label={smooth ? 'Joystick analog' : analog ? 'Joystick, delapan arah' : 'Joystick, empat arah'} tabIndex={0}
      style={floating ? { width: size, height: size, position: 'absolute', pointerEvents: 'none', opacity: anchor ? 1 : .55, ...(anchor ? { left: `calc(${anchor.x}px - ${size} / 2)`, top: `calc(${anchor.y}px - ${size} / 2)` } : { left: 0, bottom: 0 }) } : { width: size, height: size }}
      {...(floating ? {} : handlers)}
    >
      <ICONS.up className={arrow} style={{ top: '9%', left: '50%', transform: 'translateX(-50%)' }} size={20} strokeWidth={2.6} />
      <ICONS.down className={arrow} style={{ bottom: '9%', left: '50%', transform: 'translateX(-50%)' }} size={20} strokeWidth={2.6} />
      <ICONS.left className={arrow} style={{ left: '9%', top: '50%', transform: 'translateY(-50%)' }} size={20} strokeWidth={2.6} />
      <ICONS.right className={arrow} style={{ right: '9%', top: '50%', transform: 'translateY(-50%)' }} size={20} strokeWidth={2.6} />
      <div
        ref={knobRef}
        className="absolute rounded-full bg-[#3f3f3f] border border-[#5a5a5a] shadow-inner pointer-events-none"
        style={{ width: '52%', height: '52%', top: '24%', left: '24%' }}
      />
    </div>
  );
  return floating ? <div ref={zoneRef} className="float-zone no-swipe touch-none" {...handlers}>{pad}</div> : pad;
}
