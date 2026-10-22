'use client';
import { useRef, useCallback } from 'react';

// Priority fix: "bruh" (death) sounds always win over the "eits" near-wall
// warning. Kalau si "eits" masih ke-trigger di tick sebelumnya lalu di tick
// berikutnya snake beneran mati, "eits" langsung dipotong (pause + reset)
// sebelum sound kematian dimainkan, jadi nggak numpuk/barengan lagi.
export function useSounds() {
  const chompRef = useRef(null);
  const eitsRef = useRef(null);
  const deathRef = useRef(null);
  const poisonDeathRef = useRef(null);
  const moveRef = useRef(null);
  const acRef = useRef(null); // AudioContext untuk bunyi sintetis kecil (tumbukan, kunci, menang, antar)

  const ensureLoaded = useCallback(() => {
    if (chompRef.current) return;
    chompRef.current = new Audio('/sounds/chomp.mp3');
    eitsRef.current = new Audio('/sounds/eits.mp3');
    eitsRef.current.volume = 0.25; // diturunin ~75% sesuai request sebelumnya
    deathRef.current = new Audio('/sounds/death.mp3');
    poisonDeathRef.current = new Audio('/sounds/poison-death.mp3');
    moveRef.current = new Audio('/sounds/move.wav');
    moveRef.current.volume = 0.25; // diturunin ~75% juga
  }, []);

  const playChomp = useCallback(() => {
    ensureLoaded();
    play(chompRef.current);
  }, [ensureLoaded]);

  const playMove = useCallback(() => {
    ensureLoaded();
    play(moveRef.current);
  }, [ensureLoaded]);

  const playEits = useCallback(() => {
    ensureLoaded();
    play(eitsRef.current);
  }, [ensureLoaded]);

  // reason: undefined = tabrak tembok/badan sendiri/bom -> death.mp3 ("bruh")
  //         'poison' = mati abis kena racun -> poison-death.mp3 (movie_1.mp3)
  const playDeath = useCallback((reason) => {
    ensureLoaded();
    // Priority: matiin eits dulu (kalau lagi/baru aja bunyi) sebelum bruh main,
    // biar nggak kedengeran numpuk pas snake sengaja nabrak tembok.
    stop(eitsRef.current);
    play(reason === 'poison' ? poisonDeathRef.current : deathRef.current);
  }, [ensureLoaded]);

  // ---- bunyi sintetis (tanpa file audio): lembut & pendek, dibuat lazily saat pertama dibutuhkan ----
  const tone = useCallback((freq, start, dur, type, vol, glideTo) => {
    try {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return;
      if (!acRef.current) acRef.current = new AC();
      const ac = acRef.current;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const t0 = ac.currentTime + start;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    } catch (e) {}
  }, []);

  // Gerakan tertahan punya bunyi sendiri; "eits" hanya untuk peringatan bahaya.
  const playBump = useCallback(() => tone(170, 0, 0.09, 'sine', 0.12, 85), [tone]);
  const playLocked = useCallback(() => { tone(330, 0, 0.06, 'square', 0.04); tone(247, 0.07, 0.09, 'square', 0.04); }, [tone]);
  const playWin = useCallback(() => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.1, 0.16, 'triangle', 0.09)); }, [tone]);
  const playDeliver = useCallback(() => { tone(880, 0, 0.09, 'triangle', 0.1); tone(1318.5, 0.08, 0.16, 'triangle', 0.1); }, [tone]);
  // Short, stylized double bark; no downloaded audio asset or extra dependency.
  const playBark = useCallback(() => {
    for (const start of [0, .19]) { tone(230, start, .13, 'sawtooth', .035, 75); tone(115, start, .15, 'triangle', .07, 55); }
  }, [tone]);

  return { playChomp, playMove, playEits, playDeath, playBump, playLocked, playWin, playDeliver, playBark };
}

function play(audio) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) {}
}

function stop(audio) {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {}
}
