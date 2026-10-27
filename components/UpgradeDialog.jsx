'use client';
import { useEffect, useRef, useState } from 'react';
import { ICONS } from '@/lib/icons';

// Menu upgrade Ekspedisi Mayhem. Dialog modal: fokus pindah ke kartu pertama dan DIKUNCI di dalam dialog (Tab/panah berputar),
// tombol 1-3 memilih langsung, Esc tidak menutup (pilihan wajib), dan setelah satu pilihan semua kartu dinonaktifkan
// (klik kedua yang cepat tidak mengambil upgrade lain; controller juga menolaknya). Manfaat dan harga selalu tertulis.
export default function UpgradeDialog({ data, onChoose }) {
  const [picked, setPicked] = useState(false);
  const refs = useRef([]);
  const key = data && data.cleared ? `${data.cleared.round}` : null;
  const open = !!(data && data.offer && data.offer.length);

  useEffect(() => {
    if (!open) return undefined;
    setPicked(false);
    const prev = document.activeElement;
    if (refs.current[0]) refs.current[0].focus();
    return () => { if (prev && prev.focus && document.contains(prev)) prev.focus(); };
  }, [open, key]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= data.offer.length) { e.preventDefault(); choose(data.offer[n - 1].id); return; }
      const btns = refs.current.filter(Boolean);
      const idx = btns.indexOf(document.activeElement);
      if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const back = e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey);
        const next = (idx + (back ? -1 : 1) + btns.length) % btns.length;
        btns[next < 0 ? 0 : next].focus();
      } else if (e.key === 'Escape') e.preventDefault(); // pilihan wajib
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, picked]);

  function choose(id) {
    if (picked) return;
    setPicked(true);
    onChoose(id);
  }
  if (!open) return null;
  const c = data.cleared;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="upg-title" aria-describedby="upg-desc" className="no-swipe fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.72)' }}>
      <div className="focus-dialog bg-[#1f2a22] rounded-2xl p-4 sm:p-5 w-full max-w-[640px] max-h-[92dvh] overflow-y-auto text-white">
        <h3 id="upg-title" className="text-lg font-bold flex items-center gap-2"><ICONS.trophy size={18} className="text-[#f5b942]" /> {data.expedition ? 'Bekal perjalanan baru' : `Ronde ${c.round} tuntas!`}</h3>
        <p id="upg-desc" className="text-[13px] text-[#c9d6bd] mb-3">{data.expedition ? `Kemajuan tersimpan setelah memilih. Total ${c.total} skor.` : `Skor ronde ${c.roundScore} • Total ${c.total}.`} Pilih satu upgrade (tekan 1, 2, atau 3). Game berhenti sampai kamu memilih.</p>
        <div className="grid gap-2.5 sm:grid-cols-3" role="group" aria-label="Pilihan upgrade">
          {data.offer.map((u, i) => {
            const Icon = ICONS[u.icon] || ICONS.help;
            return (
              <button key={u.id} ref={el => { refs.current[i] = el; }} type="button" disabled={picked} onClick={() => choose(u.id)} className="upgrade-card" aria-label={`${i + 1}. ${u.name}, tingkat ${u.stacks + 1} dari ${u.max}. Manfaat: ${u.benefit} Harga: ${u.cost}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold text-[14px]"><Icon size={17} />{u.name}</span>
                  <span className="upgrade-key" aria-hidden="true">{i + 1}</span>
                </span>
                <span className="text-[11px] text-[#a6b29f]">Tingkat {u.stacks + 1}/{u.max}</span>
                <dl className="m-0">
                  <dt>Manfaat</dt><dd>{u.benefit}</dd>
                  <dt>Harga</dt><dd>{u.cost}</dd>
                </dl>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
