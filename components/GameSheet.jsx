'use client';
import { useRef } from 'react';
import { useModalFocus } from '@/hooks/useModalFocus';
import { ICONS } from '@/lib/icons';
import { GameDetails } from './Hud';

export default function GameSheet({ panel, mode, hud, onClose, onPanel, lefty, onSwap, fullscreen, canFullscreen, onFullscreen, fullscreenMessage, onHelp, onRestart }) {
  const ref = useRef(null);
  useModalFocus(ref, panel, onClose);
  if (!panel) return null;
  const title = { info: 'Info permainan', settings: 'Pengaturan', restart: 'Ulang dari awal?', keyboard: 'Perlu keyboard' }[panel];
  return <div className="sheet-backdrop no-swipe" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={ref} tabIndex={-1}>
    <section className="game-sheet">
      <header><h2 id="sheet-title">{title}</h2><button data-autofocus className="icon-button" onClick={onClose} title="Tutup (Esc)" aria-label="Tutup panel"><ICONS.close size={20} /></button></header>
      <div className="sheet-content">
        {panel === 'info' && <><GameDetails mode={mode} hud={hud} /><div className="sheet-links"><button className="secondary-button" onClick={() => onPanel('settings')}><ICONS.settings size={17} />Pengaturan</button><button className="secondary-button" onClick={onHelp}><ICONS.help size={17} />Cara main & ikon</button></div></>}
        {panel === 'settings' && <><p>Posisi tombol disimpan untuk permainan berikutnya.</p><button className="setting-row" aria-pressed={lefty} onClick={onSwap}><ICONS.swap size={20} /><span>Joystick di {lefty ? 'kanan' : 'kiri'}<small>Ketuk untuk menukar joystick dan aksi</small></span><b>{lefty ? 'Kidal' : 'Standar'}</b></button>{canFullscreen ? <button className="setting-row" onClick={onFullscreen}>{fullscreen ? <ICONS.exitFullscreen size={20} /> : <ICONS.fullscreen size={20} />}<span>{fullscreen ? 'Keluar layar penuh' : 'Layar penuh'}<small>Pilihan browser, dapat keluar kapan saja</small></span></button> : <p>Layar penuh tidak tersedia di browser ini. Arena tetap menyesuaikan layar.</p>}<p role="status">{fullscreenMessage}</p><button className="secondary-button" onClick={() => onPanel('info')}>Kembali ke info</button></>}
        {panel === 'restart' && <><p>{mode === 'puzzle' ? 'Misi saat ini diulang dengan denah acak baru. Koleksi yang sudah tersimpan tetap ada.' : 'Ronde saat ini akan diulang dari awal.'}</p><button className="start-play" onClick={onRestart}>Ya, ulang permainan<ICONS.restart size={20} /></button><button className="secondary-button" onClick={onClose}>Batal</button></>}
        {panel === 'keyboard' && <p>Mode dua pemain memakai P1 Panah dan P2 WASD pada satu keyboard. Hubungkan keyboard lalu tekan salah satu tombol untuk bermain.</p>}
      </div>
      <footer>Menutup panel tidak melanjutkan permainan. Tekan Lanjut saat siap.</footer>
    </section>
  </div>;
}
