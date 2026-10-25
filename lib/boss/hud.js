import { isBossRound, energyNeed, phaseRules, isInvuln, playerDamage } from './sim';
const ATTACK = { row: 'Baris berbahaya', mines: 'Ranjau kebun', corridor: 'Koridor menyempit' };

export function bossHud(sim, message = '') {
  if (!sim) return null;
  const cfg = sim.cfg;
  const secs = ms => Math.max(0, Math.ceil(ms / 1000));
  function stageText() {
    if (!sim) return '';
    if (sim.status !== 'playing') return sim.status === 'won' ? 'Kebun aman!' : 'Run selesai';
    const k = sim.sched.kind, a = sim.attack, name = a ? a.pattern || ATTACK[a.kind] : '';
    if (k === 'tele') return `${name}: PERINGATAN • −${a.damage} hati`;
    if (k === 'active') return `${name}: AKTIF`;
    if (k === 'recovery') return `${name}: selesai`;
    if (k === 'window') return 'Titik lemah TERBUKA';
    if (k === 'transition') return 'Boss berubah fase… Ambil heal!';
    if (k === 'round') return sim.round === cfg.minionRounds ? 'Boss mendekat… Ambil heal!' : 'Ronde tuntas… Ambil heal!';
    return isBossRound(sim) ? 'Boss bersiap…' : `${sim.minion.name} bersiap…`;
  }
  function hudData() {
    if (!sim) return null;
    const w = sim.window;
    const weak = sim.sched.kind === 'window' && w.open ? { status: 'open', secs: secs(sim.sched.endAt - sim.t), ready: sim.energy >= energyNeed(sim) } : { status: sim.sched.kind === 'transition' ? 'locked' : (w.hit ? 'done' : 'locked'), secs: 0, ready: false };
    return {
      variant: sim.variant.id, round: sim.round, rounds: cfg.minionRounds + 1, isBoss: isBossRound(sim), enemy: isBossRound(sim) ? sim.variant.name : sim.minion.name,
      minionsLeft: sim.minionsLeft, minionsTotal: sim.minionsTotal, phaseHp: sim.phaseHp, phaseMaxHp: cfg.phases[sim.phase - 1].hp, damage: phaseRules(sim).damage,
      openings: sim.window.open ? (sim.window.targets || []).length - (sim.window.used || []).length : phaseRules(sim).openings,
      hp: sim.hp, maxHp: cfg.bossHp, phase: Math.min(sim.phase, 3), phases: 3, lives: Math.max(0, sim.lives), maxLives: cfg.lives,
      energy: sim.energy, need: energyNeed(sim), max: cfg.energyMax, weak, invulnSecs: isInvuln(sim) ? secs(sim.invulnUntil - sim.t) : 0,
      shield: sim.shield, shieldMax: cfg.shieldMax, damageStacks: sim.damageStacks, playerDamage: playerDamage(sim),
      shieldSecs: sim.shieldBursts.length ? secs(Math.min(...sim.shieldBursts.map(b => b.nextAt)) - sim.t) : 0,
      stage: stageText(), message,
    };
  }
  return hudData();
}
