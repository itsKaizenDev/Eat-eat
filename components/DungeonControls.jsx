'use client';
import { useRef } from 'react';
import DPad from './DPad';
import { ICONS } from '@/lib/icons';

function ActionButton({ onActivate, children, ...props }) {
  const handledTouch = useRef(false);
  return <button {...props}
    onPointerDown={event => {
      handledTouch.current = event.pointerType !== 'mouse';
      if (handledTouch.current && !props.disabled) {
        // Secondary fingers do not reliably produce click while the pad is held.
        event.preventDefault();
        onActivate();
      }
    }}
    onClick={event => {
      if (event.detail === 0 || !handledTouch.current) onActivate();
      handledTouch.current = false;
    }}
  >{children}</button>;
}

export default function DungeonControls({ data: p, onMove, onRelease, onAction, onGait, onRestart }) {
  if (!p) return null;
  const label = { stone: 'Batu', smoke: 'Asap', trap: 'Trap' }[p.gadget];
  const GadgetIcon = p.gadget === 'trap' ? ICONS.plate : ICONS.flask;
  return <div className="dungeon-controls no-swipe">
    <DPad analog onMove={onMove} onRelease={onRelease} />
    <div className="heist-buttons">
      <div className="heist-gaits" role="group" aria-label="Cara bergerak">
        {[['sneak', 'Mengendap', 'slow'], ['walk', 'Jalan', 'steps'], ['run', 'Lari', 'fast']].map(([id, label, icon]) => { const I = ICONS[icon]; return <ActionButton key={id} aria-pressed={p.gait === id} onActivate={() => onGait(id)}><I size={15} /><span>{label}</span></ActionButton>; })}
      </div>
      <div className="heist-action-grid">
        <ActionButton className="heist-interact" disabled={!p.interaction} onActivate={() => onAction('interact')} title={p.interaction || 'Dekati pintu, tuas atau portal'}><ICONS.key size={17} /><span>{p.interaction || 'Interaksi'}<kbd>E</kbd></span></ActionButton>
        <ActionButton disabled={!p.canHide && !p.hidden} aria-pressed={p.hidden} onActivate={() => onAction('hide')}><ICONS.dark size={17} /><span>{p.hidden ? 'Keluar' : 'Sembunyi'}<kbd>F</kbd></span></ActionButton>
        <ActionButton disabled={p.gadgetWait > 0} onActivate={() => onAction('gadget')} title="Tiap alat pulih dalam 10 detik"><GadgetIcon size={17} /><span>{label} · {p.gadgetWait ? `${p.gadgetWait}s` : 'Siap'}<kbd>Q</kbd></span></ActionButton>
        <ActionButton onActivate={() => onAction('cycle')} aria-label="Ganti alat (X)"><ICONS.swap size={17} /><span>Ganti alat<kbd>X</kbd></span></ActionButton>
      </div>
      <button className="heist-restart" onClick={onRestart}><ICONS.restart size={13} />Ulang & acak <kbd>R</kbd></button>
    </div>
  </div>;
}
