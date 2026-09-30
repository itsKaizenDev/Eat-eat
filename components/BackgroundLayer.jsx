'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { BG, ORDER, ACCENT, POS, FX } from '@/lib/sceneTheme';

// Scene menu ala layar pilih karakter game fighting:
//  - ganti mode  -> "slash wipe" diagonal + flash + speed lines + zoom punch + shake kecil
//  - selalu hidup -> ken burns pelan, parallax mouse, cahaya lewat, partikel ambient per mode
//  - klik PLAY   -> zoom-in + flash (event 'snake:play-punch' dari Overlay)
// Semua animasi cuma transform/opacity/clip-path, dan mati kalau prefers-reduced-motion.

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const TAU = Math.PI * 2;
const SLANT = 18; // kemiringan garis slash, % lebar

/* ---------- partikel ---------- */
function spawn(cfg, W, H, initial) {
  const c = pick(cfg.colors);
  const f = cfg.fast || 1;
  switch (cfg.kind) {
    case 'pollen':
      return { x: rand(0, W), y: rand(0, H), vx: rand(6, 16), vy: rand(-14, -4), r: rand(1.2, 2.8), ph: rand(0, TAU), sp: rand(0.8, 1.8), a: rand(0.45, 0.9), c };
    case 'firefly':
      return { x: rand(0, W), y: rand(H * 0.15, H), ang: rand(0, TAU), v: rand(8, 22), r: rand(1.6, 3.2), ph: rand(0, TAU), sp: rand(0.9, 2.2), c };
    case 'suck': {
      const R = Math.max(W, H) * 0.6;
      return { ang: rand(0, TAU), rad: initial ? rand(20, R) : R, R, w: rand(0.7, 1.5), dr: rand(60, 140), r: rand(1, 2.4), c };
    }
    case 'dust':
      return { x: rand(0, W), y: initial ? rand(0, H) : H + 6, vx: rand(-6, 6), vy: rand(-22, -8), r: rand(1, 2.6), ph: rand(0, TAU), sp: rand(1.5, 3.5), c };
    case 'ember':
      return { x: rand(0, W), y: initial ? rand(0, H) : H + 8, vx: rand(-14, 14), vy: -rand(30, 90) * f, r: rand(1.3, 3.4), ph: rand(0, TAU), sp: rand(3, 7), c };
    case 'ash':
      return { x: rand(0, W), y: initial ? rand(0, H) : -8, vx: rand(-10, 10), vy: rand(12, 34), r: rand(1, 2.8), ph: rand(0, TAU), sp: rand(1, 2.5), c };
    default: // sparkle
      return { x: rand(0, W), y: rand(0, H), r: rand(1.4, 3.2), ph: rand(0, TAU), sp: rand(1.2, 3), c };
  }
}

// update 1 partikel, kembalikan alpha (0 = jangan digambar). Posisi ada di p.x / p.y.
function tick(p, cfg, W, H, dt, t) {
  switch (cfg.kind) {
    case 'pollen':
      p.x += p.vx * dt + Math.sin(t * p.sp + p.ph) * 0.3;
      p.y += p.vy * dt;
      if (p.x > W + 8) p.x = -8;
      if (p.y < -8) p.y = H + 8;
      return p.a * (0.6 + 0.4 * Math.sin(t * p.sp * 2 + p.ph));
    case 'firefly':
      p.ang += rand(-1, 1) * dt * 2.2;
      p.x += Math.cos(p.ang) * p.v * dt;
      p.y += Math.sin(p.ang) * p.v * dt * 0.6;
      if (p.x < 0 || p.x > W || p.y < H * 0.1 || p.y > H) { p.ang += Math.PI; p.x = Math.min(W, Math.max(0, p.x)); p.y = Math.min(H, Math.max(H * 0.1, p.y)); }
      return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph));
    case 'suck': {
      p.rad -= p.dr * dt;
      p.ang += p.w * dt * (1 + (1 - p.rad / p.R) * 1.5);
      if (p.rad < 12) { Object.assign(p, spawn(cfg, W, H, false)); }
      p.x = cfg.cx * W + Math.cos(p.ang) * p.rad;
      p.y = cfg.cy * H + Math.sin(p.ang) * p.rad * 0.75;
      return Math.min(1, p.rad / 80) * 0.9;
    }
    case 'dust':
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -6) Object.assign(p, spawn(cfg, W, H, false));
      return 0.35 + 0.5 * Math.abs(Math.sin(t * p.sp + p.ph));
    case 'ember':
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(t * p.sp + p.ph) * 0.4;
      if (p.y < -8) Object.assign(p, spawn(cfg, W, H, false));
      return Math.min(1, Math.max(0, p.y / (H * 0.6))) * (0.55 + 0.45 * Math.sin(t * p.sp * 1.7 + p.ph));
    case 'ash':
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(t * p.sp + p.ph) * 0.3;
      if (p.y > H + 8) Object.assign(p, spawn(cfg, W, H, false));
      return 0.55;
    default: {
      const s = Math.sin(t * p.sp + p.ph);
      return s > 0 ? s * s : 0;
    }
  }
}

export default function BackgroundLayer({ mode }) {
  const [layers, setLayers] = useState(() => [{ src: BG[mode] || BG.classic, key: mode, mode, dir: 1 }]);
  const prevMode = useRef(mode);
  const rootRef = useRef(null);
  const shakeRef = useRef(null);
  const zoomRef = useRef(null);
  const parRef = useRef(null);
  const flashRef = useRef(null);
  const linesRef = useRef(null);
  const slashRef = useRef(null);
  const canvasRef = useRef(null);
  const layerEls = useRef({});
  const punchEls = useRef({});
  const tlRef = useRef(null);
  const fxRef = useRef(FX[mode] || FX.classic);
  const reinitRef = useRef(() => {});

  /* --- mode berubah: tambah layer baru di atas layer terakhir (maks 2 layer di DOM) --- */
  useEffect(() => {
    if (prevMode.current === mode) return;
    const a = ORDER.indexOf(prevMode.current);
    const b = ORDER.indexOf(mode);
    const dir = b >= a ? 1 : -1;
    prevMode.current = mode;
    const key = mode + '::' + Date.now();
    setLayers(prev => [prev[prev.length - 1], { src: BG[mode] || BG.classic, key, mode, dir }]);
    fxRef.current = FX[mode] || FX.classic;
    reinitRef.current();
  }, [mode]);

  /* --- transisi: slash wipe + zoom punch + flash + speed lines + shake --- */
  useIsoLayoutEffect(() => {
    if (layers.length < 2) return;
    const top = layers[layers.length - 1];
    const under = layers[layers.length - 2];
    const el = layerEls.current[top.key];
    const punch = punchEls.current[top.key];
    const elUnder = layerEls.current[under.key];
    if (!el || !rootRef.current) return;

    if (tlRef.current) tlRef.current.kill();
    if (elUnder) gsap.set(elUnder, { clearProps: 'all' }); // layer lama dipastikan penuh (kalau transisi sebelumnya kepotong)

    const finish = () => {
      el.style.clipPath = '';
      setLayers(prev => (prev[prev.length - 1].key === top.key ? [prev[prev.length - 1]] : prev));
    };

    if (reduced()) {
      tlRef.current = gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25, onComplete: finish });
      return;
    }

    const dir = top.dir;
    const r = rootRef.current.getBoundingClientRect();
    const angle = (Math.atan(((SLANT / 100) * r.width) / Math.max(1, r.height)) * 180) / Math.PI;
    const slash = slashRef.current;
    const apply = (p) => {
      const edge = 100 + SLANT / 2 - p * (100 + SLANT);
      const xt = edge + SLANT / 2;
      const xb = edge - SLANT / 2;
      const pts = dir === 1
        ? [[xt, 0], [220, 0], [220, 100], [xb, 100]]
        : [[100 - xt, 0], [-120, 0], [-120, 100], [100 - xb, 100]];
      el.style.clipPath = 'polygon(' + pts.map(([x, y]) => x + '% ' + y + '%').join(',') + ')';
      slash.style.left = (dir === 1 ? edge : 100 - edge) + '%';
      slash.style.opacity = String(Math.sin(Math.PI * p));
    };
    slash.style.transform = 'skewX(' + (dir === 1 ? -angle : angle) + 'deg)';

    const o = { p: 0 };
    apply(0);
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(o, { p: 1, duration: 0.5, ease: 'power3.inOut', onUpdate: () => apply(o.p) }, 0)
      .fromTo(punch, { scale: 1.18 }, { scale: 1, duration: 0.75, ease: 'power3.out' }, 0)
      .to(elUnder, { xPercent: -10 * dir, scale: 1.08, duration: 0.6, ease: 'power2.in' }, 0)
      .fromTo(flashRef.current, { opacity: 0 }, { opacity: 0.8, duration: 0.09, ease: 'power1.out' }, 0.14)
      .to(flashRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0.23)
      .fromTo(linesRef.current, { opacity: 0, scale: 1.5, rotate: -4 * dir }, { opacity: 0.6, scale: 1.05, rotate: 0, duration: 0.16, ease: 'power2.out' }, 0.12)
      .to(linesRef.current, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 0.3)
      .to(shakeRef.current, { keyframes: [{ x: -4, y: 2 }, { x: 4, y: -2 }, { x: -3, y: 1 }, { x: 2, y: -1 }, { x: 0, y: 0 }], duration: 0.24, ease: 'none' }, 0.42);
    tlRef.current = tl;
  }, [layers]);

  /* --- muncul halus + bersihin timeline saat unmount --- */
  useEffect(() => {
    if (!reduced()) gsap.from(rootRef.current, { opacity: 0, duration: 0.25 });
    return () => { if (tlRef.current) tlRef.current.kill(); };
  }, []);

  /* --- parallax mouse (desktop saja) --- */
  useEffect(() => {
    if (reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const qx = gsap.quickTo(parRef.current, 'x', { duration: 0.7, ease: 'power3.out' });
    const qy = gsap.quickTo(parRef.current, 'y', { duration: 0.7, ease: 'power3.out' });
    const onMove = (e) => {
      qx(-((e.clientX / window.innerWidth) - 0.5) * 2 * 10);
      qy(-((e.clientY / window.innerHeight) - 0.5) * 2 * 6);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  /* --- klik PLAY: zoom-in + flash --- */
  useEffect(() => {
    const onPunch = () => {
      if (reduced()) return;
      gsap.to(zoomRef.current, { scale: 1.2, duration: 0.32, ease: 'power2.in' });
      gsap.fromTo(flashRef.current, { opacity: 0 }, { opacity: 0.9, duration: 0.3, ease: 'power2.in' });
      gsap.fromTo(linesRef.current, { opacity: 0, scale: 1.1 }, { opacity: 0.7, scale: 1.5, duration: 0.3, ease: 'power1.in' });
    };
    window.addEventListener('snake:play-punch', onPunch);
    return () => window.removeEventListener('snake:play-punch', onPunch);
  }, []);

  /* --- partikel ambient --- */
  useEffect(() => {
    if (reduced()) return;
    const cv = canvasRef.current;
    const root = rootRef.current;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, raf = 0, last = performance.now(), t = 0, parts = [];
    const init = () => {
      const cfg = fxRef.current;
      parts = Array.from({ length: cfg.n }, () => spawn(cfg, W, H, true));
    };
    reinitRef.current = init;
    const size = () => {
      const rc = root.getBoundingClientRect();
      W = rc.width; H = rc.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(root);
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      const cfg = fxRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const a = tick(p, cfg, W, H, dt, t);
        if (a <= 0.02) continue;
        ctx.fillStyle = p.c;
        if (cfg.kind === 'sparkle') {
          ctx.globalAlpha = a;
          ctx.fillRect(p.x - p.r * 2.2, p.y - 0.5, p.r * 4.4, 1);
          ctx.fillRect(p.x - 0.5, p.y - p.r * 2.2, 1, p.r * 4.4);
        }
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = a * 0.25;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); reinitRef.current = () => {}; };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="bg-scene absolute inset-0 overflow-hidden bg-[#141414]"
      style={{ '--acc': ACCENT[mode] || '#9be04a' }}
    >
      <div ref={shakeRef} className="absolute inset-0">
        <div ref={zoomRef} className="absolute inset-0">
          <div ref={parRef} className="absolute inset-0">
            {layers.map(l => (
              <div key={l.key} ref={(n) => { layerEls.current[l.key] = n; }} className="absolute inset-0">
                <div ref={(n) => { punchEls.current[l.key] = n; }} className="absolute inset-0">
                  <div
                    className="kb absolute inset-0 bg-cover"
                    style={{ backgroundImage: `url(${l.src})`, backgroundPosition: POS[l.mode] || '50% 70%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="sweep absolute inset-y-0 left-0 w-3/5 pointer-events-none" style={{ background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,.16) 50%, transparent 80%)', mixBlendMode: 'screen' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.35) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none bg-black/10" />

      <div
        ref={linesRef}
        className="absolute inset-0 pointer-events-none opacity-0"
        style={{
          background: 'repeating-conic-gradient(from 3deg at 50% 50%, var(--acc) 0deg 1deg, transparent 1deg 7deg)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 30%, #000 78%)',
          maskImage: 'radial-gradient(circle at 50% 50%, transparent 30%, #000 78%)',
          mixBlendMode: 'screen',
        }}
      />
      <div
        ref={slashRef}
        className="absolute top-[-5%] h-[110%] w-[5px] pointer-events-none opacity-0"
        style={{ marginLeft: '-2px', background: 'linear-gradient(180deg, transparent, #fff 15%, #fff 85%, transparent)', boxShadow: '0 0 14px 3px var(--acc), 0 0 40px 8px var(--acc)' }}
      />
      <div ref={flashRef} className="absolute inset-0 pointer-events-none opacity-0" style={{ background: 'radial-gradient(circle at 50% 50%, #fff 30%, var(--acc) 100%)', mixBlendMode: 'screen' }} />
    </div>
  );
}
