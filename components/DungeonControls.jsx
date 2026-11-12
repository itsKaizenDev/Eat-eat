'use client';
import { useEffect, useRef } from 'react';
import GameButton from './GameButton';
import SkillButton from './SkillButton';
import { ICONS } from '@/lib/icons';
import { DUNGEON_TOOLS } from '@/lib/puzzle/powers';

export default function DungeonControls({ data: p, onAction, onSprint, editing = false, dragProps = {} }) {
  const pointer = useRef(null);
  const release = () => {
    pointer.current = null;
    onSprint(false, 'sprint-touch');
    onSprint(false, 'sprint-button-key');
  };
  useEffect(() => () => {
    onSprint(false, 'sprint-touch');
    onSprint(false, 'sprint-button-key');
  }, [onSprint]);
  if (!p) return null;

  const tool = DUNGEON_TOOLS[p.gadget] || DUNGEON_TOOLS.stone;
  const ToolIcon = ICONS[tool.icon];
  const holdKey = event => event.key === ' ' || event.key === 'Enter';
  return <div className={`dungeon-controls no-swipe ${editing ? 'editing' : ''}`} {...dragProps}>
    <button type="button" className="action-small sprint-button" aria-pressed={p.sprinting} aria-label="Tahan untuk sprint (Shift)" disabled={editing}
      onPointerDown={event => {
        if (event.button !== 0 || pointer.current !== null) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        onSprint(true, 'sprint-touch');
      }}
      onPointerUp={event => { if (event.pointerId === pointer.current) release(); }}
      onPointerCancel={event => { if (event.pointerId === pointer.current) release(); }}
      onLostPointerCapture={event => { if (event.pointerId === pointer.current) release(); }}
      onBlur={release}
      onKeyDown={event => {
        if (!holdKey(event)) return;
        event.preventDefault();
        if (!event.repeat) onSprint(true, 'sprint-button-key');
      }}
      onKeyUp={event => {
        if (!holdKey(event)) return;
        event.preventDefault();
        onSprint(false, 'sprint-button-key');
      }}>
      <ICONS.fast size={19} /><small>Tahan Lari</small>
    </button>
    <GameButton immediate className="action-small" onActivate={() => onAction('cycle')} aria-label="Ganti alat (X)" title="Ganti alat (X)"><ICONS.swap size={19} /><small>Alat</small></GameButton>
    <SkillButton icon={ToolIcon} label={tool.name} hotkey="Q" wait={p.gadgetWait}
      cooldown={tool.cooldown} className="gadget-button" onActivate={() => onAction('gadget')} />
    <GameButton immediate className="action-main interact-button" disabled={!p.interaction} onActivate={() => onAction('interact')}
      aria-label={p.interaction ? `${p.interaction} (E)` : 'Interaksi (E)'} title={p.interaction || 'Interaksi (E)'}><ICONS.key size={21} /><small>Interaksi</small></GameButton>
  </div>;
}
