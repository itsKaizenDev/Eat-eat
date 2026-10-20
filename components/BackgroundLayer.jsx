'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { BG } from '@/lib/sceneTheme';

// Banner mempertahankan ilustrasi utuh; versi HP berbeda resolusi.
export default function BackgroundLayer({ mode }) {
  const ref = useRef(null);
  useEffect(() => {
    function punch() {
      if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo(ref.current, { scale: 1, filter: 'brightness(1)' }, { scale: 1.035, filter: 'brightness(1.35)', duration: .3, onComplete: () => gsap.set(ref.current, { clearProps: 'transform,filter' }) });
    }
    window.addEventListener('snake:play-punch', punch);
    const el = ref.current;
    return () => { window.removeEventListener('snake:play-punch', punch); gsap.killTweensOf(el); };
  }, []);
  const src = BG[mode] || BG.classic;
  return <div ref={ref} className="focus-scene scene-cutout" aria-hidden="true"><picture key={mode}>
    <source media="(max-width: 768px), (pointer: coarse)" srcSet={src.replace('.webp', '-m.webp')} />
    <img src={src} alt="" width="1672" height="941" draggable={false} />
  </picture></div>;
}
