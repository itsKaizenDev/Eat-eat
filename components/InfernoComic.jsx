'use client';
import { useEffect, useRef } from 'react';
import { ICONS } from '@/lib/icons';
import { ARENA_TRANSITION_MS, CINEMATICS, DESCENT_FADE_MS } from '@/lib/puzzle/cinematics';

export default function InfernoComic({ cinematic, frame, fromArena, onPlay, onMenu, onRetrySave, savePending }) {
  const movie = CINEMATICS[cinematic];
  const ready = !!movie.button && frame >= movie.frames.length;
  const shot = movie.frames[Math.min(frame, movie.frames.length - 1)];
  const dialog = useRef(null);
  const primary = useRef(null);

  useEffect(() => { dialog.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (ready) primary.current?.focus({ preventScroll: true }); }, [ready]);

  function keyDown(event) {
    if (event.key === 'Escape' && !event.repeat) {
      event.preventDefault();
      onMenu();
    }
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    const current = buttons.indexOf(document.activeElement);
    const offset = event.shiftKey ? -1 : 1;
    event.preventDefault();
    if (buttons.length) buttons[(current + offset + buttons.length) % buttons.length].focus();
  }

  return (
    <section ref={dialog} tabIndex={-1} className="inferno-comic no-swipe" role="dialog" aria-modal="true"
      aria-label={movie.title} data-opening={!shot} data-arena={fromArena} data-tone={shot?.tone || 'ember'}
      onKeyDown={keyDown} style={{ '--arena-ms': ARENA_TRANSITION_MS + 'ms' }}>
      {!shot ? <div className="cinematic-arena-shade" aria-hidden="true" /> : (
        <figure className="cinematic-card">
          <div key={frame < movie.frames.length ? frame : movie.frames.length - 1} className="cinematic-panel"
            data-motion={shot.motion} data-focus={shot.focus} aria-hidden="true">
            <img src={shot.image} alt="" loading="eager" />
          </div>
          <figcaption className="cinematic-caption">
            <p key={shot.text} role="status">{shot.text}</p>
            {ready && <div className="cinematic-actions">
              {savePending && <button type="button" className="secondary-button" onClick={onRetrySave}>Coba simpan lagi</button>}
              <button type="button" ref={primary} className="start-play" onClick={onPlay}>{movie.button}<ICONS.right size={18} aria-hidden="true" /></button>
            </div>}
          </figcaption>
        </figure>
      )}
      {!movie.button && frame === movie.frames.length - 1 && (
        <div className="cinematic-tail" aria-hidden="true"
          style={{ '--fade-delay': shot.ms - DESCENT_FADE_MS + 'ms', '--fade-ms': DESCENT_FADE_MS + 'ms' }} />
      )}
    </section>
  );
}
