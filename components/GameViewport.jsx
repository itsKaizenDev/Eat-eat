'use client';
import { useEffect, useRef, useState } from 'react';
import { arenaLayout } from '@/lib/gameView';

export default function GameViewport({ active, sleeping, mode, touch, lefty, world, children }) {
  const space = useRef(null);
  const [layout, setLayout] = useState(null);
  useEffect(() => {
    const el = space.current;
    const resize = () => setLayout(arenaLayout(el.clientWidth, el.clientHeight, { touch, actions: ['puzzle','delivery','roguelite'].includes(mode) }));
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    return () => observer.disconnect();
  }, [touch, mode, active]);
  return <div id="wrap" className={`game-viewport ${active ? 'viewport-active' : 'viewport-idle'}`} data-mode={mode} data-touch={touch} data-lefty={lefty} data-rail={layout?.rail || false}>
    <div ref={space} className="arena-space">
      <div className={`world-frame ${sleeping ? 'world-sleep' : ''}`} style={layout ? { left: layout.left, top: layout.top, width: layout.width, height: layout.height } : undefined}>{world}</div>
      {children}
    </div>
  </div>;
}
