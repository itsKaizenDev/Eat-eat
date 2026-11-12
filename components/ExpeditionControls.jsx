'use client';
import SkillButton from './SkillButton';
import { ICONS } from '@/lib/icons';

export default function ExpeditionControls({ data: r, onAction, editing = false, dragProps = {} }) {
  if (!r) return null;
  return <div className={`dungeon-controls expedition-controls no-swipe ${editing ? 'editing' : ''}`} {...dragProps} role="group" aria-label="Skill Ekspedisi">
    <SkillButton icon={ICONS.fast} label="Dash" hotkey="Spasi" wait={r.dashWait} cooldown={3} onActivate={() => onAction('dash')} />
    <SkillButton icon={ICONS.flask} label="Sembur Bisa" hotkey="Q" wait={r.skillWait} cooldown={8} onActivate={() => onAction('skill')} />
    <SkillButton icon={ICONS.normal} label="Bekal" detail={r.food + ' tersisa'} hotkey="F" disabled={!r.food || r.hp >= r.maxHp} onActivate={() => onAction('food')} />
    {r.poison && <SkillButton icon={ICONS.leaf} label="Penawar" detail={r.antidote + ' tersisa'} hotkey="X" disabled={!r.antidote} onActivate={() => onAction('antidote')} />}
    {r.interaction && <SkillButton icon={ICONS.key} label={r.interaction} hotkey="E" className="expedition-interact" onActivate={() => onAction('interact')} />}
  </div>;
}
