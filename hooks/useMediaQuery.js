'use client';
import { useEffect, useState } from 'react';

// Awalnya false supaya render server & klien sama (nggak hydration mismatch),
// lalu langsung menyesuaikan begitu komponen ter-mount.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}
