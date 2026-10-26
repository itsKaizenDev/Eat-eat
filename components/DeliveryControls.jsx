 'use client';
import { ICONS } from '@/lib/icons';
export default function DeliveryControls({onAction,braking,editing=false,dragProps={}}){
 const release=()=>onAction('brake-off');
 return <div className={`dungeon-controls delivery-controls no-swipe ${editing?'editing':''}`} {...dragProps}>
  <button type="button" aria-label="Tahan rem (Spasi)" aria-pressed={!!braking} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);onAction('brake-on');}} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();onAction('brake-on');}}} onKeyUp={release} onBlur={release}><ICONS.pause size={24}/><b>REM</b><small>Tahan / Spasi</small></button>
 </div>;
}
