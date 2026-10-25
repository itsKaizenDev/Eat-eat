'use client';
import { useRef, useMemo, useEffect } from 'react';
import { createAudioDirector } from '@/lib/audio/director';
import { createScoreRenderer } from '@/lib/audio/renderer';
import { audioScene } from '@/lib/audio/score';

export function useSounds(preferences) {
  const director = useRef(null);
  const getDirector = () => {
    if (!director.current) {
      const renderer = createScoreRenderer();
      director.current = createAudioDirector({renderScore:renderer.render,disposeRenderer:renderer.destroy});
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
    updateScene: hud => getDirector().setScene(audioScene(hud)),
    playEvent: name => getDirector().event(name),
    playChomp: () => getDirector().sample('chomp'), playMove: () => getDirector().sample('move'),
    playEits: () => getDirector().sample('eits'), playDeath: reason => getDirector().sample(reason === 'poison' ? 'poison' : 'death'),
    playBump: () => getDirector().event('bump'), playLocked: () => getDirector().event('locked'),
    playWin: () => getDirector().event('win'), playDeliver: () => getDirector().event('deliver'), playBark: () => getDirector().event('bark'),
  }), []);
}
