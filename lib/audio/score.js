// Original compositions. No streamed recordings, samples or imported melodies.
// The calm and danger stems share harmony, sample count and loop boundaries.
const theme = (bpm, root, chords, motif, voice, rhythm, drums, air = .5) => ({ bpm, root, chords, motif, voice, rhythm, drums, air });
export const SCORES = {
  deliveryMenu: theme(92, 60, [0,9,5,7,0,2,5,7], [0,4,9,7,14,12,9,4], 'glass', .5, 'sync', .35),
  delivery: theme(116, 57, [0,5,9,7,0,2,5,7], [0,4,7,9,16,12,7,2], 'pluck', .5, 'sync', .25),
  deliveryRush: theme(128, 55, [0,9,5,7,0,5,2,7], [12,7,16,9,19,14,9,4], 'glass', .5, 'break', .2),
  deliveryWon: {...theme(108, 60, [0,5,7,0], [0,4,7,12,16,12,9,7], 'bell', 1, 'light', .45), bars:4, loop:false},
  deliveryLost: {...theme(78, 52, [0,8,5,0], [12,7,10,3,7,2,0,0], 'glass', 1, 'air', .6), bars:4, loop:false},
  classic: theme(96, 60, [0,5,7,0,9,5,7,0], [0,4,7,12,9,7,4,2], 'pluck', 1, 'light', .4),
  classicnight: theme(72, 50, [0,8,3,7,0,5,8,7], [12,7,15,10,19,15,7,3], 'bell', 2, 'air', .9),
  portal: theme(104, 55, [0,3,10,5,0,7,3,10], [0,7,14,10,17,12,5,14], 'glass', .5, 'sync', .6),
  timeattack: theme(128, 57, [0,5,9,7,0,9,5,7], [0,7,12,7,16,14,9,7], 'pluck', .5, 'clock', .2),
  mayhem: theme(118, 48, [0,3,5,7,0,10,5,7], [0,3,10,7,12,5,15,7], 'reed', .5, 'sync', .25),
  mayhemplus: theme(126, 46, [0,5,3,10,0,7,5,3], [0,7,10,15,12,5,17,10], 'pluck', .5, 'break', .25),
  mayhemhard: theme(132, 43, [0,8,5,7,0,3,8,7], [0,3,7,13,12,10,5,1], 'reed', .5, 'heavy', .2),
  impossible: theme(146, 40, [0,1,5,7,0,8,3,7], [0,7,13,12,19,10,6,1], 'glass', .5, 'clock', .15),
  multiplayer: theme(110, 55, [0,5,7,0,9,5,2,7], [0,4,9,7,12,16,9,2], 'pluck', 1, 'light', .35),
  mayhemduo: theme(124, 45, [0,3,10,7,5,0,8,7], [0,7,3,10,12,5,15,14], 'reed', .5, 'break', .2),
  dungeon: theme(78, 45, [0,5,8,3,0,10,5,7], [12,19,15,22,19,14,17,10], 'bell', 2, 'air', .9),
  dungeonBoss: theme(108, 38, [0,3,7,5,0,8,3,7], [12,15,19,14,22,17,10,19], 'reed', .5, 'ritual', .3),
  expedition: theme(112, 55, [0,7,5,10,0,3,5,7], [0,4,9,7,2,12,7,4], 'pluck', 1, 'march', .55),
  expeditionBoss: theme(136, 40, [0,5,3,7,0,10,5,7], [12,19,15,24,22,14,17,19], 'reed', .5, 'heavy', .15),
  expeditionSpore: theme(120, 46, [0,8,3,10,0,5,8,7], [12,15,22,17,13,20,10,15], 'glass', .5, 'sync', .65),
  expeditionVine: theme(142, 43, [0,3,5,10,0,7,5,3], [12,19,22,14,17,24,15,10], 'pluck', .5, 'break', .25),
  adventure: theme(94, 60, [0,5,9,7,0,2,5,7], [0,7,4,9,2,12,7,4], 'pluck', 2, 'light', .75),
  adventureMarket: theme(102, 57, [0,9,5,7,0,5,2,7], [0,4,12,9,7,2,9,4], 'bell', 1, 'sync', .5),
  adventureArena: theme(108, 53, [0,5,10,7,0,3,5,7], [0,7,12,10,5,14,7,3], 'reed', 1, 'march', .4),
  adventureDanger: theme(122, 42, [0,3,5,7,0,8,3,7], [12,15,22,19,14,17,24,10], 'reed', .5, 'ritual', .2),
};
const hz = n => 440 * 2 ** ((n - 69) / 12);
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
export function composeScore(key, sampleRate = 22050, variation = 0) {
  const cfg = SCORES[key] || SCORES.classic, beat = 60 / cfg.bpm;
  variation = Math.floor(clamp(variation, 0, 2));
  const length = Math.round((cfg.bars || 16) * 4 * beat * sampleRate), base = new Float32Array(length), danger = new Float32Array(length);
  function note(out, at, duration, midi, volume, voice) {
    const start = Math.round(at * beat * sampleRate), count = Math.round(duration * beat * sampleRate), f = hz(midi);
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate, p = i / count, phase = 2 * Math.PI * f * t;
      const attack = Math.min(1, t / (voice === 'pad' ? .15 : .012));
      const envelope = attack * (1 - p) ** (voice === 'pad' ? 1.5 : 3);
      const wave = voice === 'pad' ? (Math.sin(phase) + .16 * Math.sin(phase * 2 + Math.sin(t * 2) * .1)) * Math.sin(Math.PI * p)
        : voice === 'bass' ? Math.sin(phase) + .12 * Math.sin(phase * 2)
        : voice === 'reed' ? Math.sin(phase) + .22 * Math.sin(phase * 3) + .07 * Math.sin(phase * 5)
        : voice === 'glass' ? Math.sin(phase) + .3 * Math.sin(phase * 2.756) * Math.exp(-p * 6)
        : voice === 'bell' ? Math.sin(phase) + .22 * Math.sin(phase * 3) * Math.exp(-p * 8)
        : Math.sin(phase) + .12 * Math.sin(phase * 2);
      out[(start + i) % length] += wave * envelope * volume;
    }
  }
  // Deterministic filtered noise: percussion adds no external audio assets.
  let seed = 2166136261; for (const c of key) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  function drum(out, at, kind, volume) {
    const duration = kind === 'kick' ? .22 : kind === 'snare' ? .14 : .055, count = Math.round(duration * sampleRate), start = Math.round(at * beat * sampleRate);
    let previous = 0;
    for (let i = 0; i < count; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const noise = (seed >>> 0) / 2147483648 - 1, t = i / sampleRate;
      const wave = kind === 'kick' ? Math.sin(2 * Math.PI * (48 * t + 65 * .025 * (1 - Math.exp(-t / .025))))
        : kind === 'snare' ? noise * .7 + Math.sin(2 * Math.PI * 165 * t) * .3 : (noise - previous) * .5;
      previous = noise;
      const envelope = Math.min(1, t / .003) * Math.exp(-t / (duration / 5)) * (1 - i / count);
      out[(start + i) % length] += wave * envelope * volume;
    }
  }
  for (let bar = 0; bar < (cfg.bars || 16); bar++) {
    const root = cfg.root + cfg.chords[bar % cfg.chords.length], at = bar * 4;
    const sparse = (bar + variation) % 4 === 3, reply = bar >= 8;
    [0,7,12].forEach((n, i) => note(base, at + i * .08, 5, root - 12 + n, .025 + cfg.air * .025, 'pad'));
    for (let b = 0; b < 4; b += cfg.rhythm) note(base, at + b, .85, root - 24 + (b === 2 ? 7 : 0), .065, 'bass');
    if (!sparse) {
      const m = cfg.motif[(bar + variation * 2) % 8];
      note(base, at + .5, 1.6, cfg.root + m + (reply && bar % 3 === 0 ? 12 : 0), .115, cfg.voice);
      note(base, at + 2.5, 1.25, cfg.root + cfg.motif[(bar + 3) % 8], .075, cfg.voice);
    } else note(base, at + 1, 2.7, root + 7, .075, cfg.voice);
    if (cfg.drums !== 'air') {
      drum(base, at, 'kick', .035); drum(base, at + 2, 'snare', .018);
      if (cfg.drums === 'sync') drum(base, at + 2.75, 'hat', .02);
    }
    const steps = cfg.drums === 'air' ? 1 : .5;
    for (let b = 0; b < 4; b += steps) {
      note(danger, at + b + (cfg.drums === 'sync' && b % 1 ? .12 : 0), .42, root - 12 + (b % 1 ? 19 : 12), .055, cfg.voice);
      drum(danger, at + b, 'hat', cfg.drums === 'air' ? .012 : .025);
    }
    for (const b of cfg.drums === 'break' ? [0,1.5,2.75] : cfg.drums === 'ritual' ? [0,1.5,3] : cfg.drums === 'clock' ? [0,1,2,3] : [0,2]) drum(danger, at + b, 'kick', .14);
    for (const b of cfg.drums === 'heavy' ? [1,3,3.5] : [1,3]) drum(danger, at + b, 'snare', .055);
    if (bar % 4 === 3) for (const b of [3,3.5,3.75]) drum(danger, at + b, 'snare', .025);
    note(danger, at, 3.9, root - 12, .035, 'reed');
    if (variation > 0) {
      note(danger, at + 1.25, .65, cfg.root + cfg.motif[(bar + 5) % 8] + 12, .045, 'glass');
      note(danger, at + 2.75, .7, root + 19, .04, cfg.voice);
      drum(danger, at + 3.5, 'kick', .065);
    }
    if (variation === 2) for (const b of [.75,1.75,2.75]) note(danger, at + b, .28, root + 24, .035, 'bell');
  }
  if (cfg.loop === false) for (let i=0; i<length; i++) { const envelope=Math.min(1,i/(sampleRate*.02),(length-1-i)/(sampleRate*.8)); base[i]*=envelope; danger[i]*=envelope; }
  let peak = 0; for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(base[i]) + Math.abs(danger[i]));
  const scale = Math.min(1, .75 / Math.max(.001, peak));
  if (scale < 1) for (let i = 0; i < length; i++) { base[i] *= scale; danger[i] *= scale; }
  return { base, danger, sampleRate, duration: length / sampleRate };
}
const seconds = text => { const parts = String(text ?? '').split(':').map(Number); return parts.length === 2 && parts.every(Number.isFinite) ? parts[0] * 60 + parts[1] : Infinity; };
// Routing consumes real HUD state. Minor changes only mix stems; they never restart a loop.
export function audioScene(h) {
  const p = h.puzzle, b = h.boss, playing = !!h.running;
  const dungeonBoss = playing && p?.boss && p.boss.stage !== 'DEFEATED';
  let key = SCORES[h.mode] ? h.mode : 'classic', intensity = .08, variation = 0;
  if (h.mode === 'puzzle') {
    key = dungeonBoss ? 'dungeonBoss' : 'dungeon';
    variation = dungeonBoss ? Math.min(2,Math.floor((p.boss.phase - 1) / 2)) : Math.abs([...String(p?.environment || 'ruins')].reduce((n,c)=>n+c.charCodeAt(0),0)) % 3;
    intensity = dungeonBoss ? .18 + p.boss.phase * .14 : clamp(p?.threatLevel ?? p?.suspicion / 100, 0, 1);
  } else if (h.mode === 'roguelite' && h.roguelite?.expedition) {
    const r=h.roguelite,e=r.encounter;
    key=e?.kind==='boss'?['expeditionBoss','expeditionSpore','expeditionVine'][r.region]:e?'adventureDanger':'expedition';
    variation=e?.kind==='boss'?Math.min(2,e.phase-1):0;
    intensity=e?.kind==='boss'?.25+e.phase*.2:e?.kind==='mini'?.7:r.hp<30?.6:.16;
  } else if (h.mode === 'roguelite' || h.mode === 'boss') {
    key = b?.isBoss && playing ? ({root:'expeditionBoss',spore:'expeditionSpore',vine:'expeditionVine'}[b.variant] || 'expeditionBoss') : 'expedition';
    variation = b?.isBoss && playing ? Math.min(2,b.phase - 1) : 0;
    intensity = playing ? b ? .18 + (b.isBoss ? b.phase * .22 : .035 * b.round) : .12 + .65 * clamp((h.roguelite?.roundScore || 0) / Math.max(1,h.roguelite?.target || 1),0,1) : .08;
  } else if (h.mode === 'delivery') {
    const context = h.delivery?.scene || (!playing ? 'menu' : seconds(h.delivery?.timeText) <= 20 ? 'rush' : 'normal');
    key = ({menu:'deliveryMenu',normal:'delivery',rush:'deliveryRush',won:'deliveryWon',lost:'deliveryLost'})[context] || 'delivery';
    intensity = context === 'rush' ? .8 : playing ? .35 : .1;
  } else if (h.mode === 'territory') {
    const danger = playing && (seconds(h.territory?.timeText) <= 20 || h.territory?.players?.some(player => player.lives <= 1 || player.pct >= 50));
    key = danger ? 'adventureDanger' : 'adventureArena'; intensity = danger ? .85 : playing ? .35 : .08;
  } else if (playing) {
    intensity = clamp(.1 + (h.score || 0) / 90 + (h.effects?.length || 0) * .12, .08, .9);
    if (h.mode === 'timeattack' && seconds(h.timerText) <= 15) intensity = .95;
  }
  return { key, variation: Math.max(0, variation), intensity: playing ? clamp(intensity,0,1) : .05, paused: !!h.paused };
}
