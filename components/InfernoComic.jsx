'use client';
import { useEffect, useRef } from 'react';
import { ICONS } from '@/lib/icons';

export default function InfernoComic({ title, sub, btnText, onPlay, onMenu, onRetrySave, savePending }) {
  const primary = useRef(null);
  useEffect(() => { primary.current?.focus({ preventScroll: true }); }, []);
  function keyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onMenu();
    }
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    const current = buttons.indexOf(document.activeElement);
    const offset = event.shiftKey ? -1 : 1;
    event.preventDefault();
    buttons[(current + offset + buttons.length) % buttons.length]?.focus();
  }
  return (
    <section className="inferno-comic no-swipe" role="dialog" aria-modal="true"
      aria-labelledby="inferno-comic-title" onKeyDown={keyDown}>
      <div className="inferno-comic-card">
        <img src="/assets/dungeon/neraka-komik.webp" width={1024} height={1536}
          alt="Penjaga batu tumbang dan lantai retak. Ular dan reliknya jatuh melalui jurang. Ular terbangun di depan gerbang Neraka." />
        <div className="inferno-comic-copy">
          <p className="inferno-chapter-name">Bab II · Neraka</p>
          <h2 id="inferno-comic-title">{title}</h2>
          <p>{sub}</p>
          <div className="inferno-comic-actions">
            {savePending && <button type="button" className="secondary-button" onClick={onRetrySave}>Coba simpan lagi</button>}
            <button type="button" ref={primary} className="start-play" onClick={onPlay}>{btnText}<ICONS.right size={18} aria-hidden="true" /></button>
            <button type="button" className="secondary-button" onClick={onMenu}>Kembali ke menu</button>
          </div>
        </div>
      </div>
    </section>
  );
}
