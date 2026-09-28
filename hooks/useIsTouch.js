'use client';
import { useEffect, useState } from 'react';

// True kalau perangkat utamanya layar sentuh (HP / tablet tanpa mouse).
// Dipakai buat menyembunyikan mode 2P Lokal, karena 2 pemain butuh 2 keyboard
// (Panah + WASD) dan nggak enak dimainkan di satu layar sentuh.
// Awalnya false supaya hasil render server & klien sama (nggak hydration mismatch).
export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isTouch;
}
