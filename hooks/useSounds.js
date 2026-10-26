'use client';
import { useRef, useMemo, useEffect } from 'react';
import { createAudioDirector } from '@/lib/audio/director';
import { audioScene } from '@/lib/audio/score';

export function useSounds(preferences, onStatus) {
  const director = useRef(null), statusRef = useRef(onStatus); statusRef.current = onStatus;
  const getDirector = () => {
    if (!director.current) {
<<<<<<< HEAD
      director.current = createAudioDirector({onStatus:value => statusRef.current?.(value)});
=======
      director.current = createAudioDirector();
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
    }
    return director.current;
  };
  useEffect(() => {
    const unlock = () => getDirector().unlock();
    window.addEventListener('pointerdown',unlock); window.addEventListener('keydown',unlock);
    return () => { window.removeEventListener('pointerdown',unlock); window.removeEventListener('keydown',unlock); director.current?.destroy(); director.current = null; };
  }, []);
  useEffect(() => { getDirector().setPreferences(preferences); }, [preferences]);
  return useMemo(() => ({
    retryMusic: () => getDirector().retryMusic(),
    updateScene: hud => getDirector().setScene(audioScene(hud)),
    playEvent: name => getDirector().event(name),
    playChomp: () => getDirector().sample('chomp'), playMove: () => getDirector().sample('move'),
    playEits: () => getDirector().sample('eits'), playDeath: reason => getDirector().sample(reason === 'poison' ? 'poison' : 'death'),
    playBump: () => getDirector().event('bump'), playLocked: () => getDirector().event('locked'),
    playWin: () => getDirector().event('win'), playDeliver: () => getDirector().event('deliver'), playBark: () => getDirector().event('bark'),
  }), []);
}
