'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ICONS } from '@/lib/icons';
import { useIsTouch } from '@/hooks/useIsTouch';
import { ACCENT } from '@/lib/sceneTheme';
import BackgroundLayer from '@/components/BackgroundLayer';
import { GROUPS as ALL_GROUPS, getMode, kindOf, isAdventure, modesInGroup, arcadeModes } from '@/lib/modes/registry';

// Grup, sub-mode, dan deskripsi menu dibaca dari registry mode (satu sumber). Layar arkade tetap tiga grup lama.
const GROUPS = ALL_GROUPS.filter(g => g.arcade);

const SUBS = Object.fromEntries(GROUPS.map(g => [g.key, modesInGroup(g.key).map(m => ({ mode: m.id, label: m.short }))]));
const ADVENTURE_ALL = modesInGroup('adventure');

const MASCOTS = {
  idle: '/assets/game/mascot-idle.png',
  win: '/assets/game/mascot-win.png',
  sick: '/assets/game/mascot-sick.png',
  shock: '/assets/game/mascot-shock.png',
  dizzy: '/assets/game/mascot-dizzy.png',
};

// Tint overlay per mood, biar layar "Menang" kerasa beda sama "Game Over"/"Waktu
// Habis" — bukan cuma teks & mascot yang beda, warna suasananya juga ikut ganti.
const MOOD_BG = {
  idle:  'linear-gradient(180deg, rgba(8,14,4,.50) 0%, rgba(8,14,4,0) 24%, rgba(8,14,4,0) 58%, rgba(8,14,4,.38) 100%)',
  win:   'radial-gradient(circle at 50% 30%, rgba(120,92,10,.90), rgba(48,30,4,.95))',
  sick:  'radial-gradient(circle at 50% 30%, rgba(80,28,96,.90), rgba(22,8,28,.95))',
  shock: 'radial-gradient(circle at 50% 30%, rgba(110,26,22,.90), rgba(28,6,6,.95))',
  dizzy: 'radial-gradient(circle at 50% 30%, rgba(34,42,92,.90), rgba(10,10,26,.95))',
};

// Confetti kecil buat layar menang doang — titik-titik warna-warni yang
// disusun pakai beberapa radial-gradient, tanpa perlu file gambar baru.
const CONFETTI_BG = [
  'radial-gradient(circle, #ffd23f 3px, transparent 4px)',
  'radial-gradient(circle, #ff6a5c 3px, transparent 4px)',
  'radial-gradient(circle, #5fc2ea 3px, transparent 4px)',
  'radial-gradient(circle, #8fd13f 3px, transparent 4px)',
].join(',');
const CONFETTI_SIZE = '64px 84px, 78px 96px, 90px 70px, 70px 110px';
const CONFETTI_POS = '6px 10px, 34px 46px, 54px 8px, 20px 70px';

const DESCRIPTION = {
  puzzle: 'Shadow Heist · Amati patroli, curi relik, dan keluar tanpa jejak.',
  delivery: 'Antar paket apel sebelum waktunya habis.',
  roguelite: 'Kumpulkan bekal. Tembus antek. Taklukkan boss.',
  boss: 'Tembus 9 ronde antek, lalu taklukkan boss tiga fase.',
  territory: 'Gambar jejak dan rebut wilayah dari lawan.',
};
const LEVEL_PAGE = 10;
const SPEEDS = [{ k: 'santai', l: 'Santai' }, { k: 'normal', l: 'Normal' }, { k: 'ngebut', l: 'Ngebut' }, { k: 'konstan', l: 'Konstan' }];
function Chip({ on, onClick, children, start }) {
  return (
    <button onClick={onClick} aria-pressed={start ? on : undefined} className="speed-chip">{children}</button>
  );
}

function ReviveInfo({ data }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!data) return null;
  const minutes = Math.max(0, Math.ceil((data.resetAt - now) / 60000));
  const days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60), mins = minutes % 60;
  return <div className="revive-info"><span><ICONS.heart size={15} />Revive <b>{data.left}/3</b></span><small>{data.resetAt ? `Pulih penuh dalam ${days ? days + ' hari ' : ''}${hours ? hours + ' jam ' : ''}${mins} menit` : 'Pulih penuh 72 jam setelah revive pertama'}</small></div>;
}

export default function Overlay({ side, host, visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay, onRevive, onRetrySave, onMenu, speed, onSpeedChange, taSecs, onTaChange, puzzleMenu, onSelectLevel, deliveryMenu, rogueMenu, territoryMenu, bossMenu, onHelp }) {
  const [busy, setBusy] = useState(false);
  const isTouch = useIsTouch();
  const groups = isTouch ? GROUPS.filter(g => g.key !== 'mp') : GROUPS; // 2P Lokal disembunyikan di HP
  const ADVENTURE_MODES = isTouch ? ADVENTURE_ALL.filter(m => m.touch) : ADVENTURE_ALL; // mode 2 pemain butuh keyboard, tidak ditampilkan di layar sentuh
  const adv = isAdventure(mode);
  const speedMode = (getMode(mode) || {}).speedMode || 'pref';
  const lastArcade = useRef('classic');
  useEffect(() => { if (!isAdventure(mode)) lastArcade.current = mode; }, [mode]);
  const start = phase === 'start';
  // Ikuti mode aktual, termasuk saat perangkat sentuh kembali ke Classic.
  const startGroup = GROUPS.find(g => SUBS[g.key].some(s => s.mode === mode))?.key || 'classic';
  const rootRef = useRef(null);
  const mascotRef = useRef(null);
  const slamRef = useRef(null);
  const prevMode = useRef(mode);
  const playTimer = useRef(null);
  const primaryRef = useRef(null);
  const idle = mood === 'idle';
  // Daftar level Puzzle dipecah per 10 (5 kolom x 2 baris); halaman mengikuti level yang dipilih.
  const [lvPage, setLvPage] = useState(0);
  const selIdx = puzzleMenu && puzzleMenu.levels && puzzleMenu.levels.length ? puzzleMenu.selected : 0;
  useEffect(() => { setLvPage(Math.floor(selIdx / LEVEL_PAGE)); }, [selIdx]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (visible && rootRef.current) {
      gsap.fromTo(rootRef.current, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.32, ease: 'power2.out' });
    }
  }, [visible, phase]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (mascotRef.current) {
      gsap.fromTo(mascotRef.current, { scale: 0.6, rotate: -8, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' });
    }
  }, [mood]);

  // Ganti mode = nama mode "menghantam" layar dari kiri (ala layar pilih karakter game fighting).
  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    const el = slamRef.current;
    if (!el || !idle) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.killTweensOf(el);
    const tween = gsap.fromTo(el, { x: -150, opacity: 0, skewX: -20, scale: 1.2 }, { x: 0, opacity: 1, skewX: 0, scale: 1, duration: 0.38, ease: 'back.out(2.2)' });
    return () => tween.kill();
  }, [mode, idle]);

  useEffect(() => () => { if (playTimer.current) clearTimeout(playTimer.current); }, []);

  // Layar Jeda / Hasil: fokus keyboard pindah ke tombol utama supaya Enter/Spasi langsung bekerja.
  useEffect(() => {
    if (visible && (phase === 'pause' || phase === 'gameover') && primaryRef.current) primaryRef.current.focus();
  }, [visible, phase, host]);

  // PLAY dari menu awal: scene zoom-in + flash sebentar, baru game mulai.
  function handlePlay() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !idle || phase !== 'start') { onPlay(); return; }
    if (playTimer.current) return;
    setBusy(true);
    window.dispatchEvent(new Event('snake:play-punch'));
    playTimer.current = setTimeout(() => { playTimer.current = null; setBusy(false); onPlay(); }, 320);
  }

  function selectGroup(g) {
    onModeChange(SUBS[g.key][0].mode);
  }

  if (!visible) return null;

  const arcadeCount = arcadeModes().filter(m => !isTouch || m.touch).length;
  const lv = puzzleMenu && puzzleMenu.levels && puzzleMenu.levels.length ? puzzleMenu : null;
  const selLevel = lv ? lv.levels[lv.selected] : null;

  const am = getMode(mode) || {};
  const isPuzzleMode = kindOf(mode) === 'puzzle';
  const isDelivery = kindOf(mode) === 'delivery';
  const dm = isDelivery && deliveryMenu ? deliveryMenu : null;
  const isRogue = kindOf(mode) === 'roguelite';
  const rm = isRogue && rogueMenu ? rogueMenu : null;
  const isTerritory = kindOf(mode) === 'territory';
  const tm = isTerritory && territoryMenu ? territoryMenu : null;
  const isBoss = kindOf(mode) === 'boss';
  const bm = isBoss && bossMenu ? bossMenu : null;
  const ready = isPuzzleMode ? !!lv : isDelivery ? !!dm : isRogue ? !!rm : isTerritory ? !!tm : isBoss ? !!bm : true;
  const speedLabel = (SPEEDS.find(s => s.k === speed) || {}).l;

  // Layar Petualangan: tiap mode menampilkan deskripsi, tujuan, pratinjau aturan, kontrol, dan hanya pengaturan yang BENAR-BENAR didukung.
  const adventureBody = (
    <div className={`ov-body start-menu start-menu-adv no-swipe ${host ? 'start-menu-side' : ''}`} style={{ '--accent': ACCENT[mode] || '#6ed3ff' }}>
      <div className="start-menu-heading"><span>Pilih petualangan</span><span>{ADVENTURE_MODES.length} pilihan</span></div>
      <div className="start-modes adv-modes" data-n={ADVENTURE_MODES.length} role="group" aria-label="Pilihan mode petualangan">
        {ADVENTURE_MODES.map(m => {
          const Icon = ICONS[m.id];
          return (
            <button key={m.id} onClick={() => onModeChange(m.id)} aria-pressed={mode === m.id} className={`mode-btn ${mode === m.id ? 'active' : ''}`}>
              <Icon size={20} strokeWidth={2.2} /><span>{m.short}</span>
            </button>
          );
        })}
      </div>
      <div className="adv-cols">
      <div className="adv-info">
      <p className="start-description" role="status" aria-live="polite" aria-atomic="true">{DESCRIPTION[mode] || am.description}</p>
      {am.preview && <details className="mode-details"><summary>Tujuan & cara bermain</summary><p className="start-description">{am.goal}</p><ul className="start-preview" aria-label="Pratinjau aturan">{am.preview.map((t, i) => <li key={i}>{t}</li>)}</ul></details>}
      {isPuzzleMode && lv && selLevel && (
        <div className="level-info" role="status" aria-live="polite" aria-atomic="true">
          <div className="coin-wallet"><ICONS.normal size={18} /><b>{lv.coins || 0} koin apel</b><span>Bonus terbaik per misi · replay memberi selisih koleksi saja</span></div>
          {lv.savePending && <div className="save-notice" role="status"><p>Progres masih di sesi ini. Simpan sebelum menutup game.</p><button onClick={onRetrySave}>Coba simpan lagi</button></div>}
          <p className="start-description"><span><b>Ruang {lv.selected + 1}{selLevel.tutorial ? ' (tutorial)' : ''} · {selLevel.tier || selLevel.name}:</b> {selLevel.goal} Acuan bintang ketiga {Math.floor(selLevel.par / 60)}:{String(selLevel.par % 60).padStart(2, '0')}.</span></p>
          {selLevel.intro && <p className="level-intro">{selLevel.intro}</p>}
        </div>
      )}
      </div>
      <div className="adv-controls">
      {isPuzzleMode && lv && (
        <div className="start-settings">
          <div className="start-menu-heading"><span>Ruang</span><span>{lv.levels.filter(l => l.cleared).length}/{lv.levels.length} selesai</span></div>
          {lv.levels.length > LEVEL_PAGE && (
            <div className="level-pager">
              <button onClick={() => setLvPage(p => Math.max(0, p - 1))} disabled={lvPage === 0} aria-label="Halaman ruang sebelumnya"><ICONS.left size={14} /></button>
              <span aria-live="polite">Ruang {lvPage * LEVEL_PAGE + 1}–{Math.min(lv.levels.length, (lvPage + 1) * LEVEL_PAGE)}</span>
              <button onClick={() => setLvPage(p => Math.min(Math.ceil(lv.levels.length / LEVEL_PAGE) - 1, p + 1))} disabled={(lvPage + 1) * LEVEL_PAGE >= lv.levels.length} aria-label="Halaman ruang berikutnya"><ICONS.right size={14} /></button>
            </div>
          )}
          <div className="level-list" role="group" aria-label="Pilih ruang">
            {lv.levels.map((l, i) => ({ l, i })).slice(lvPage * LEVEL_PAGE, (lvPage + 1) * LEVEL_PAGE).map(({ l, i }) => (
              <button
                key={l.id}
                disabled={!l.unlocked}
                aria-pressed={lv.selected === i}
                aria-label={`Ruang ${i + 1}: ${l.name}${l.unlocked ? '' : ', terkunci'}${l.cleared ? (l.stars ? `, ${l.stars} bintang, rekor ${l.best}` : ', selesai di versi lama') : ''}`}
                onClick={() => onSelectLevel && onSelectLevel(i)}
                className="level-btn"
              >
                <b>{i + 1}</b>
                <small>{!l.unlocked ? 'Terkunci' : l.cleared ? (l.stars ? '★'.repeat(l.stars) + '☆'.repeat(3 - l.stars) : 'Versi lama') : 'Baru'}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {isDelivery && (
        <div className="start-settings">
          <div className="start-menu-heading"><span>Durasi shift</span><span>{am.duration ? am.duration.label : ''}</span></div>
          <div className="start-menu-heading"><span>Kecepatan</span><span>Sesuai gayamu</span></div>
          <div className="start-chips" role="group" aria-label="Kecepatan">
            {SPEEDS.map(s => <Chip key={s.k} start on={speed === s.k} onClick={() => onSpeedChange(s.k)}>{s.l}</Chip>)}
          </div>
          {dm && <p className="start-touch-note" role="status"><ICONS.trophy size={14} /> Rekor ({speedLabel}): {dm.best} skor • {dm.bestDeliveries} terkirim • {dm.wins}/{dm.plays} shift menang</p>}
        </div>
      )}
      {isRogue && (
        <div className="start-settings">
          <div className="start-menu-heading"><span>Struktur</span><span>5 rute → 9 gelombang → boss</span></div>
          <ReviveInfo data={rm && rm.revive} />
          <div className="start-menu-heading"><span>Kecepatan</span><span>Sesuai gayamu</span></div>
          <div className="start-chips" role="group" aria-label="Kecepatan">
            {SPEEDS.map(s => <Chip key={s.k} start on={speed === s.k} onClick={() => onSpeedChange(s.k)}>{s.l}</Chip>)}
          </div>
          {rm && <p className="start-touch-note" role="status"><ICONS.trophy size={14} /> Rekor ({speedLabel}): {rm.best} skor • ronde tertinggi {rm.bestRounds}/{rm.rounds} • {rm.wins}/{rm.plays} run tuntas</p>}
        </div>
      )}
      {isBoss && (
        <div className="start-settings">
          <div className="start-menu-heading"><span>Boss</span><span>{bm ? `${bm.rounds} ronde • ${bm.maxHp} HP boss • ♥ × ${bm.lives}` : ''}</span></div>
          <div className="start-menu-heading"><span>Kecepatan</span><span>Sesuai gayamu</span></div>
          <div className="start-chips" role="group" aria-label="Kecepatan">
            {SPEEDS.map(s => <Chip key={s.k} start on={speed === s.k} onClick={() => onSpeedChange(s.k)}>{s.l}</Chip>)}
          </div>
          {bm && <p className="start-touch-note" role="status"><ICONS.trophy size={14} /> Rekor ({speedLabel}): ronde {bm.bestRound || 0}/{bm.rounds} • boss {bm.best}/{bm.maxHp} HP • {bm.wins}/{bm.plays} menang{bm.bestSecs ? ` • tercepat ${bm.bestSecs} dtk` : ''}</p>}
        </div>
      )}
      {isTerritory && (
        <div className="start-settings">
          <div className="start-menu-heading"><span>Durasi</span><span>{am.duration ? am.duration.label : ''}</span></div>
          <div className="start-menu-heading"><span>Kecepatan</span><span>Sesuai gayamu</span></div>
          <div className="start-chips" role="group" aria-label="Kecepatan">
            {SPEEDS.map(s => <Chip key={s.k} start on={speed === s.k} onClick={() => onSpeedChange(s.k)}>{s.l}</Chip>)}
          </div>
          {tm && <p className="start-touch-note" role="status"><ICONS.trophy size={14} /> Rekor ({speedLabel}): wilayah {tm.best}% • {tm.plays} main • P1 {tm.p1Wins} / P2 {tm.p2Wins} / seri {tm.draws}</p>}
        </div>
      )}
      <p className="start-touch-note"><ICONS.steps size={14} /> {am.controls}</p>
      {isTouch && <p className="start-touch-note"><ICONS.multiplayer size={14} /> Rebut Arena (2 pemain) memerlukan keyboard.</p>}
      <button onClick={handlePlay} disabled={isPuzzleMode ? !lv : isDelivery ? !dm : isRogue ? !rm : isTerritory ? !tm : isBoss ? !bm : false} className="start-play">{busy ? 'Bersiap…' : 'Mulai main'}<ICONS.right size={20} aria-hidden="true" /></button>
      </div>
      </div>
    </div>
  );

  const body = start && adv ? adventureBody : start ? (
    <div className={`ov-body start-menu start-menu-arc no-swipe ${host ? 'start-menu-side' : ''}`} style={{ '--accent': ACCENT[mode] || '#9be04a' }}>
      <div className="arc-cols">
      <div className="arc-pick">
      <div className="start-menu-heading"><span>Pilih mode</span><span>{arcadeCount} pilihan</span></div>
      <div className="start-groups" role="group" aria-label="Grup mode">
        {groups.map(g => {
          const Icon = ICONS[g.icon];
          return (
            <button key={g.key} onClick={() => selectGroup(g)} aria-pressed={startGroup === g.key} className={`mode-group ${startGroup === g.key ? 'active' : ''}`}>
              <Icon size={18} strokeWidth={2.2} /><span>{g.label}</span>
            </button>
          );
        })}
      </div>
      <div className={`start-modes ${startGroup === 'mp' ? 'start-modes-duo' : ''}`} role="group" aria-label="Pilihan mode">
        {SUBS[startGroup].map(s => {
          const Icon = ICONS[s.mode];
          return (
            <button key={s.mode} onClick={() => onModeChange(s.mode)} aria-pressed={mode === s.mode} className={`mode-btn ${mode === s.mode ? 'active' : ''}`}>
              <Icon size={20} strokeWidth={2.2} /><span>{s.mode === 'timeattack' ? 'Time Attack' : s.label}</span>
            </button>
          );
        })}
      </div>
      <p className="start-description" role="status" aria-live="polite" aria-atomic="true">{(getMode(mode) || {}).description}</p>
      </div>
      <div className="arc-set">
      <div className="start-settings">
        <div className="start-menu-heading"><span>Kecepatan</span><span>{speedMode === 'locked' ? 'Terkunci' : 'Sesuai gayamu'}</span></div>
        {speedMode === 'locked'
          ? <p className="start-locked"><ICONS.impossible size={16} /> Ngebut · tantangan Impossible</p>
          : <div className="start-chips" role="group" aria-label="Kecepatan">
              {SPEEDS.map(s => <Chip key={s.k} start on={speed === s.k} onClick={() => onSpeedChange(s.k)}>{s.l}</Chip>)}
            </div>}
        {speedMode === 'pref+duration' && (
          <div className="start-duration">
            <div className="start-menu-heading"><span>Durasi</span><ICONS.timeattack size={14} /></div>
            <div className="start-chips" role="group" aria-label="Durasi Time Attack">
              {[30, 60, 90, 120].map(t => <Chip key={t} start on={taSecs === t} onClick={() => onTaChange(t)}>{t} detik</Chip>)}
            </div>
          </div>
        )}
      </div>
      {isTouch && <p className="start-touch-note"><ICONS.multiplayer size={14} /> Mode 2P Lokal memerlukan keyboard.</p>}
      <button onClick={handlePlay} className="start-play">{busy ? 'Bersiap…' : 'Mulai main'}<ICONS.right size={20} aria-hidden="true" /></button>
      </div>
      </div>
    </div>
  ) : (
    <div className="result-actions">
      {isPuzzleMode && lv?.savePending && <div className="save-notice" role="status"><p>Progres belum tersimpan.</p><button onClick={onRetrySave}>Coba simpan lagi</button></div>}
      {phase === 'gameover' && rm && rm.revive.eligible && <>
        <button ref={rm.revive.left ? primaryRef : null} onClick={onRevive} disabled={!rm.revive.left || rm.revive.busy} className="revive-button"><ICONS.heart size={18} />{rm.revive.busy ? 'Menyiapkan…' : `Hidup lagi · ${rm.revive.left}/3`}</button>
        <p className="revive-detail">Lanjut dari rute atau fase ini. Upgrade tetap dibawa.</p>
        <ReviveInfo data={rm.revive} />
        {rm.revive.error && <p role="alert">{rm.revive.error}</p>}
      </>}
      <button ref={phase === 'gameover' && rm?.revive?.eligible && rm.revive.left ? null : primaryRef} disabled={rm?.revive?.busy} onClick={handlePlay} className="start-play">{phase === 'pause' ? 'Lanjut main' : btnText === 'PLAY' ? 'Main lagi' : btnText}<ICONS.right size={20} /></button>
      <button disabled={rm?.revive?.busy} onClick={onMenu} className="secondary-button">Kembali ke menu</button>
    </div>
  );

  if (start) return (
    <section ref={rootRef} className="focus-menu no-swipe" style={{ '--accent': ACCENT[mode] }} aria-label="Menu permainan">
      <header className="focus-header">
        <div className="brand" aria-label="K-Snake"><img src={MASCOTS.idle} alt="" width="38" height="38" />K<span>-</span>Snake</div>
        <nav className="menu-tabs" aria-label="Jenis permainan">
          <button disabled={busy} aria-pressed={!adv} onClick={() => onModeChange(lastArcade.current)}>Arkade</button>
          <button disabled={busy} aria-pressed={adv} onClick={() => onModeChange('puzzle')}>Petualangan</button>
        </nav>
        <button disabled={busy} className="icon-button" onClick={onHelp} aria-label="Bantuan"><ICONS.help size={21} /></button>
      </header>
      <div className="menu-hero">
        <BackgroundLayer mode={mode} />
        <div className="hero-copy"><span className="eyebrow">{adv ? 'Petualangan kecil' : 'Satu ronde lagi?'}</span><h1 ref={slamRef}>{am.label}</h1><span className="hero-tag">{am.players === 2 ? 'Dua pemain' : 'Satu pemain'} · {adv ? 'Misi baru' : 'Arkade'}</span></div>
      </div>
      {side && !host ? null : host ? createPortal(<fieldset disabled={busy} className="menu-fieldset"><div className="side-scroll">{body}</div><button disabled={!ready} onClick={handlePlay} className="start-play">{busy ? 'Bersiap…' : 'Mulai main'}<ICONS.right size={20} /></button></fieldset>, host) : <fieldset disabled={busy} className="menu-fieldset">{body}</fieldset>}
      {!side && <footer className="menu-footer"><ICONS.leaf size={14} /> {isTouch ? 'Pilih dulu. Putar HP saat siap main.' : 'Panah atau WASD untuk bergerak · Esc untuk jeda'}</footer>}
    </section>
  );

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="result-title" onKeyDown={e => {
        if (e.key === 'Escape' && !e.repeat && phase === 'pause') { e.preventDefault(); onPlay(); }
        if (e.key !== 'Tab') return;
        const buttons = [...e.currentTarget.querySelectorAll('button:not(:disabled)')];
        const index = buttons.indexOf(document.activeElement);
        e.preventDefault();
        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }} className="overlay-root result-overlay no-swipe" style={{ background: MOOD_BG[mood] || MOOD_BG.idle, '--accent': ACCENT[mode] }}>
      {mood === 'win' && <div aria-hidden="true" className="confetti" style={{ backgroundImage: CONFETTI_BG, backgroundSize: CONFETTI_SIZE, backgroundPosition: CONFETTI_POS }} />}
      <div className="result-card">
        <img ref={mascotRef} src={MASCOTS[mood] || MASCOTS.idle} alt="" width="140" height="140" className="result-mascot" />
        <span className="eyebrow">{am.label}</span><h2 id="result-title">{title}</h2><p>{sub}</p>
        {body}
      </div>
    </div>
  );
}
