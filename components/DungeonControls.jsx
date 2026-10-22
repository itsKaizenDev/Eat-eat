'use client';
import GameButton from './GameButton';
import { ICONS } from '@/lib/icons';

export default function DungeonControls({ data: p, onAction, onGait }) {
  if (!p) return null;
  const gait = { walk: ['Jalan', 'steps', 'run'], run: ['Lari', 'fast', 'sneak'], sneak: ['Mengendap', 'slow', 'walk'] }[p.gait] || ['Jalan', 'steps', 'run'];
  const GaitIcon = ICONS[gait[1]], ToolIcon = p.gadget === 'trap' ? ICONS.plate : p.gadget === 'stone' ? ICONS.stone : ICONS.flask;
  const tool = { stone: 'Batu', smoke: 'Asap', trap: 'Jebakan' }[p.gadget];
  return <div className="dungeon-controls no-swipe" role="group" aria-label="Aksi Dungeon">
    <GameButton immediate className="action-small gait-button" onActivate={() => onGait(gait[2])} aria-label={`Gerak: ${gait[0]}. Ganti ke ${{ run: 'lari', walk: 'jalan', sneak: 'mengendap' }[gait[2]]}`} title="Ganti cara bergerak"><GaitIcon size={19} /><small>{gait[0]}</small></GameButton>
    <GameButton immediate className="action-small" onActivate={() => onAction('cycle')} aria-label="Ganti alat (X)" title="Ganti alat (X)"><ICONS.swap size={19} /><small>Alat</small></GameButton>
    <GameButton immediate className="action-main gadget-button" disabled={p.gadgetWait > 0} onActivate={() => onAction('gadget')} aria-label={`${tool}: ${p.gadgetWait > 0 ? `pulih ${p.gadgetWait} detik` : 'siap (Q)'}`} title={`${tool} (Q). Pulih 10 detik.`} style={{ '--cooldown': `${Math.min(100, (p.gadgetWait || 0) * 10)}%` }}><ToolIcon size={23} /><small>{p.gadgetWait > 0 ? `${p.gadgetWait}d` : tool}</small></GameButton>
    <GameButton immediate className="action-main" disabled={!p.canHide && !p.hidden} aria-pressed={p.hidden} onActivate={() => onAction('hide')} aria-label={p.hidden ? 'Keluar dari persembunyian (F)' : 'Sembunyi (F)'} title="Sembunyi / keluar (F)"><ICONS.dark size={21} /><small>{p.hidden ? 'Keluar' : 'Sembunyi'}</small></GameButton>
    <GameButton immediate className="action-main interact-button" disabled={!p.interaction} onActivate={() => onAction('interact')} aria-label={p.interaction || 'Interaksi: dekati pintu, tuas, atau portal (E)'} title={p.interaction || 'Dekati objek lalu tekan E'}><ICONS.key size={23} /><small>Interaksi</small></GameButton>
  </div>;
}
