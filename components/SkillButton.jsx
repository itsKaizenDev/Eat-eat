'use client';
import GameButton from './GameButton';

export default function SkillButton({ icon: Icon, label, detail, hotkey, wait = 0, cooldown, disabled, onActivate, className = '' }) {
  return <GameButton immediate className={`skill-button ${className}`} disabled={disabled || wait > 0}
    onActivate={onActivate} aria-label={`${label}${hotkey ? ` (${hotkey})` : ''}${wait > 0 ? `, pulih dalam ${Math.ceil(wait)} detik` : detail ? `, ${detail}` : ''}`}>
    <Icon size={20} aria-hidden="true" />
    <span><b>{label}</b><small>{wait > 0 ? `Pulih ${Math.ceil(wait)} dtk` : detail || hotkey}</small></span>
    {wait > 0 && cooldown && <i aria-hidden="true" style={{ width: `${Math.min(1, wait / cooldown) * 100}%` }} />}
  </GameButton>;
}
