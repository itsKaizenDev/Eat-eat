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

  return { playChomp, playMove, playEits, playDeath };
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
