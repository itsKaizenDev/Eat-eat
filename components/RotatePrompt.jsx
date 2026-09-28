'use client';
import { useEffect, useState } from 'react';

// Muncul di HP saat posisi portrait: minta pemain memutar ke landscape.
// Di Android (Chrome) ada tombol layar penuh + kunci landscape. iOS Safari nggak
// mengizinkan kunci orientasi dari web, jadi cuma bisa minta pemain memutar sendiri.
export default function RotatePrompt() {
  const [canLock, setCanLock] = useState(false);
  useEffect(() => {
    setCanLock(!!(document.documentElement.requestFullscreen && window.screen.orientation && window.screen.orientation.lock));
  }, []);

  async function lockLandscape() {
    try { await document.documentElement.requestFullscreen(); } catch (e) { /* diabaikan */ }
    try { await window.screen.orientation.lock('landscape'); } catch (e) { /* diabaikan */ }
  }

  return (
    <div
      className="no-swipe fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 p-6 text-center"
      style={{ background: 'radial-gradient(circle at 50% 30%, rgba(45,65,20,.98), rgba(10,16,6,.99))' }}
    >
      <div className="rotate-phone" aria-hidden>
        <svg width="84" height="84" viewBox="0 0 64 64" fill="none" stroke="#d8e6c8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="20" y="6" width="24" height="44" rx="5" />
          <line x1="29" y1="43" x2="35" y2="43" />
          <path d="M14 58c10 4 26 4 36 0" />
          <path d="M46 55l4 3-1 5" />
        </svg>
      </div>
      <img src="/assets/game/mascot-idle.png" alt="" width={72} height={77} className="select-none" draggable={false} />
      <h2 className="text-2xl font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>Putar HP kamu ke landscape</h2>
      <p className="text-sm text-[#d8e6c8] max-w-[260px]">Biar papan lebih lebar dan tombol panahnya lebih enak dipencet.</p>
      {canLock && (
        <button onClick={lockLandscape} className="mt-2 bg-[#5f9c22] text-white px-7 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform">
          Layar penuh &amp; kunci landscape
        </button>
      )}
      <p className="text-[11px] text-[#8a988a] max-w-[260px]">Kalau HP nggak mau berputar, matikan dulu &ldquo;Kunci rotasi layar&rdquo; di pengaturan / panel notifikasi.</p>
    </div>
  );
}
