'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ICONS } from '@/lib/icons';

function EffectBadge({ effect }) {
  const ref = useRef(null);
  const Icon = ICONS[effect.type] || ICONS.help;
  useEffect(() => {
    gsap.fromTo(ref.current, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(3)' });
  }, []);
  return (
    <div ref={ref} className="flex items-center gap-1 bg-[#232323] text-white text-[11px] font-semibold px-2 py-1 rounded-full">
      <Icon size={13} strokeWidth={2.5} />
      <span>{effect.label}</span>
      {effect.t && <span className="opacity-60">{effect.t}</span>}
    </div>
  );
}

function Hearts({ count }) {
  const HeartIcon = ICONS.heart;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: Math.max(0, count) }).map((_, i) => (
        <HeartIcon key={i} size={11} className="fill-current" />
      ))}
    </span>
  );
}

function PuzzleStats({ p }) {
  return <div className="heist-hud">
    <div className="heist-mission"><span className="eyebrow">SHADOW HEIST{p.shape ? ` · DENAH ${p.shape.toUpperCase()}` : ''}</span><strong>{p.artifacts === p.artifactsTotal ? 'Relik lengkap. Kembali ke pintu keluar.' : p.goal}</strong></div>
    <div className="heist-counters">
      <span><ICONS.gift size={15} />Relik <b>{p.artifacts}/{p.artifactsTotal}</b></span>
      <span><ICONS.normal size={15} />Apel <b>{p.coins}/{p.coinTotal}</b></span>
      <span><ICONS.timeattack size={15} /><b>{p.time}</b></span>
      {!!p.keys.length && <span><ICONS.key size={15} />{p.keys.join(', ').toUpperCase()}</span>}
    </div>
    <div className="heist-alert" data-alert={p.cameraAlarm || p.suspicion > 70}>
      <span><ICONS.eye size={15} />{p.statusText}</span><small>Alarm {p.alerts}</small>
      <div role="progressbar" aria-label="Kecurigaan penjaga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.suspicion}><i style={{ width: p.suspicion + '%' }} /></div>
    </div>
    <div className="heist-message" role="status" aria-live="polite">{p.message}</div>
  </div>;
}

// Statistik Delivery: waktu shift, terkirim/target, tiga slot kargo (ikon + huruf + sisa umur), dan pesanan aktif.
// Warna paket selalu didampingi ikon dan huruf, jadi status terbaca tanpa warna.
const TYPE_ICON = { A: 'normal', B: 'mail', C: 'delivery' };
function DeliveryStats({ d, cols }) {
  const TimerI = ICONS.timeattack, PkgI = ICONS.delivery;
  return (
    <div className={`deliv-hud ${cols ? 'hud-cols' : ''}`}>
      <div className="hud-col">
      <div className="puzzle-stats">
        <span><TimerI size={14} />Shift {d.timeText}</span>
        <span><PkgI size={14} />Terkirim {d.delivered}/{d.target}</span>
        {d.stale > 0 && <span><ICONS.poison size={14} />Basi {d.stale}</span>}
      </div>
      <div className="deliv-slots" role="list" aria-label="Kargo">
        {d.cargo.map((c, i) => {
          if (!c) return <div key={i} role="listitem" className="deliv-slot" data-filled="false" aria-label={`Slot ${i + 1}: kosong`}><span>—</span><span>kosong</span></div>;
          const I = ICONS[TYPE_ICON[c.type]];
          return (
            <div key={i} role="listitem" className="deliv-slot" data-filled="true" data-low={c.secs <= 3} aria-label={`Slot ${i + 1}: paket ${c.type} ${c.label}, sisa ${c.secs} detik`}>
              <span className="inline-flex items-center gap-1"><I size={13} />{c.type}</span><span>{c.secs}s</span>
            </div>
          );
        })}
      </div>
      </div>
      <div className="hud-col">
      <div className="deliv-orders">
        {d.orders.map(o => <span key={o.id}>{o.type} {o.label}: {o.picked ? `antar ke rumah ${o.type}` : 'ambil di titik pickup'}</span>)}
      </div>
      <div className="puzzle-msg" role="status" aria-live="polite" aria-atomic="true">{d.message}</div>
      </div>
    </div>
  );
}

// Statistik Ekspedisi Mayhem: ronde, progres target (bilah + angka), total skor, perisai/penawar tersisa, daftar upgrade.
function RogueStats({ r, cols }) {
  const RI = ICONS.roguelite, TI = ICONS.trophy;
  const pct = Math.min(100, Math.round((r.roundScore / r.target) * 100));
  return (
    <div className={`rogue-hud ${cols ? 'hud-cols' : ''}`}>
      <div className="hud-col">
      <div className="puzzle-stats">
        <span><RI size={14} />Ronde {r.round}/{r.rounds}</span>
        <span><TI size={14} />Target {r.roundScore}/{r.target}</span>
        <span>Total {r.total}</span>
        {r.reviveSecs > 0 && <span><ICONS.shield size={14} />Perlindungan {r.reviveSecs} dtk</span>}
        {r.shield > 0 && <span><ICONS.shield size={14} />Perisai {r.shield}</span>}
        {r.neutral > 0 && <span><ICONS.flask size={14} />Penawar {r.neutral}</span>}
      </div>
      <div className="rogue-bar" role="progressbar" aria-label="Progres target ronde" aria-valuemin={0} aria-valuemax={r.target} aria-valuenow={Math.min(r.roundScore, r.target)}><i style={{ width: pct + '%' }} /></div>
      </div>
      <div className="hud-col">
      {r.upgrades.length > 0 && (
        <ul className="rogue-ups" aria-label="Upgrade aktif">
          {r.upgrades.map(u => { const I = ICONS[u.icon] || ICONS.help; return <li key={u.id}><I size={12} />{u.name} ×{u.stacks}</li>; })}
        </ul>
      )}
      <div className="puzzle-msg" role="status" aria-live="polite" aria-atomic="true">{r.message}</div>
      </div>
    </div>
  );
}

// Statistik Penjaga Kebun: HP boss, fase, nyawa, energi, status titik lemah (ikon + teks, bukan hanya warna), kebal, tahap serangan.
function BossStats({ b, cols }) {
  const BossI = ICONS.boss, BoltI = ICONS.bolt, LockI = ICONS.lock, KeyI = ICONS.key || ICONS.bolt;
  const weakTxt = b.weak.status === 'open' ? (b.weak.ready ? `TERBUKA ${b.weak.secs} dtk: masuk sekarang!` : `TERBUKA ${b.weak.secs} dtk, butuh ${b.need} energi`) : b.weak.status === 'done' ? 'Sudah kena, menunggu' : 'TERKUNCI';
  return (
    <div className={`boss-hud ${cols ? 'hud-cols' : ''}`}>
      <div className="hud-col">
        <div className="puzzle-stats">
          <span><BossI size={14} />Ronde {b.round}/{b.rounds}</span>
          <span className="boss-heart-count" aria-label={`${b.lives} hati tersimpan`}><ICONS.heart size={16} fill="currentColor" /> × {b.lives}</span>
          <span>{b.isBoss ? `Fase ${b.phase}/${b.phases} · ${b.phaseHp}/${b.phaseMaxHp} HP` : `${b.minionsLeft}/${b.minionsTotal} antek tersisa`}</span>
        </div>
        <div className="rogue-bar" role="progressbar" aria-label="Energi" aria-valuemin={0} aria-valuemax={b.need} aria-valuenow={Math.min(b.energy, b.need)}><i style={{ width: Math.min(100, Math.round((b.energy / b.need) * 100)) + '%' }} /></div>
        <div className="puzzle-stats"><span><BoltI size={14} />Energi {b.energy}/{b.need}{b.energy > b.need ? ` (+${b.energy - b.need})` : ''}</span>{b.invulnSecs > 0 && <span><ICONS.shield size={14} />Kebal {b.invulnSecs} dtk</span>}</div>
      </div>
      <div className="hud-col">
        <div className="puzzle-stats"><span>{b.weak.status === 'open' ? <KeyI size={14} /> : <LockI size={14} />}Titik lemah: {weakTxt}</span></div>
        {b.isBoss && b.phase === 3 && <div className="puzzle-stats boss-power">
          <span><ICONS.shield size={14} />Shield {b.shield}/{b.shieldMax}{b.shieldSecs > 0 ? ` · +10 dalam ${b.shieldSecs}s` : ''}</span>
          <span><BoltI size={14} />Orb ×2: {b.damageStacks} · Damage {b.playerDamage.toLocaleString('id-ID')}</span>
        </div>}
        <div className="puzzle-stats"><span><b>{b.enemy}</b> · {b.isBoss ? `${b.hp}/${b.maxHp} HP · ${b.openings} celah` : '1 energi per pukulan'}</span><span>{b.stage}</span></div>
        <div className="puzzle-msg" role="status" aria-live="polite" aria-atomic="true">{b.message}</div>
      </div>
    </div>
  );
}

// Statistik Rebut Arena: waktu + target di atas, lalu satu kartu per pemain (nama + tombol, persen + bilah, nyawa).
// Pemain dibedakan oleh label "P1/P2" dan tombolnya, bukan hanya warna.
function TerritoryStats({ t }) {
  const TimerI = ICONS.timeattack, FlagI = ICONS.territory;
  return (
    <div className="terr-hud">
      <div className="puzzle-stats">
        <span><TimerI size={14} />Waktu {t.timeText}</span>
        <span><FlagI size={14} />Target {t.targetPct}% wilayah</span>
      </div>
      <div className="terr-players">
        {t.players.map(p => (
          <div key={p.id} className="terr-player" data-p={p.id}>
            <div className="terr-row"><b>{p.name} <small>({p.keys})</small></b><span className="terr-pct">{p.pct}%</span></div>
            <div className="rogue-bar terr-bar" role="progressbar" aria-label={`Wilayah ${p.name}`} aria-valuemin={0} aria-valuemax={t.targetPct} aria-valuenow={Math.min(p.pct, t.targetPct)}><i style={{ width: Math.min(100, Math.round((p.pct / t.targetPct) * 100)) + '%' }} /></div>
            <div className="terr-row"><span aria-label={`Nyawa ${p.lives} dari ${p.maxLives}`}><Hearts count={p.lives} /></span><small>{p.lives}/{p.maxLives} nyawa</small></div>
          </div>
        ))}
      </div>
      <div className="puzzle-msg" role="status" aria-live="polite" aria-atomic="true">{t.message}</div>
    </div>
  );
}

export default function Hud({ mode, modeLabel, timerText, effects, score, best, mpHud, onHelp, side, lefty, onSwap, canPause, onPause, puzzle, onUndo, onRestart, onWait, delivery, roguelite, territory, boss, hideStats }) {
  const HelpIcon = ICONS.help;
  const TimerIcon = ICONS.timeattack;
  const isPuzzle = mode === 'puzzle' && !!puzzle;
  const isDelivery = mode === 'delivery' && !!delivery;
  const isRogue = mode === 'roguelite' && !!roguelite;
  const isTerritory = mode === 'territory' && !!territory;
  const isBoss = (mode === 'boss' || mode === 'roguelite') && !!boss;

  if (isPuzzle && !side) return <section className="heist-desktop-hud">
    <div className="heist-heading"><span className="eyebrow">K-SNAKE / DUNGEON</span><div>
      {canPause && <button className="icon-button" aria-label="Jeda" onClick={onPause}><ICONS.pause size={17} /></button>}
      <button className="icon-button" aria-label="Bantuan" onClick={onHelp}><HelpIcon size={17} /></button>
    </div></div>
    <h1>Shadow Heist</h1>
    <p className="heist-level-name"><b>{String(puzzle.levelNo).padStart(2, '0')}</b> {puzzle.name}<small>{puzzle.levelNo}/{puzzle.levelCount} misi{puzzle.shape ? ` · Denah ${puzzle.shape}` : ''}</small></p>
    <PuzzleStats p={puzzle} />
    <div className="heist-best"><span>Rekor <b>{puzzle.best || '—'}</b></span><span>Acuan <b>{puzzle.par}</b></span></div>
    <details className="heist-rating-help"><summary>Cara mendapat 3 bintang</summary><p>Tuntaskan misi tanpa alarm, ambil semua koin bonus, lalu keluar sebelum waktu acuan. Mengendap memberi waktu untuk mengamati.</p></details>
  </section>;

  // Mode landscape di HP: kartu kecil & ringkas di panel samping kanvas.
  if (side) {
    const showTimer = mode === 'timeattack' && timerText;
    const short = String(modeLabel || '').split('·').pop().trim();
    return (
      <div className="side-hud bg-white text-[#202124] rounded-xl shadow-lg px-2.5 py-2 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {isPuzzle ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <ICONS.puzzle size={20} className="text-[#3b8fb5] shrink-0" />
              <span className="text-2xl font-bold leading-none tabular-nums">Ruang {puzzle.levelNo}/{puzzle.levelCount}</span>
            </div>
          ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <ICONS.trophy size={20} className="text-[#f5b942] shrink-0" />
            <span className="text-3xl font-bold leading-none tabular-nums">{score}</span>
          </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {isPuzzle && <button onClick={onRestart} aria-label="Ulang & acak" title="Ulang misi dengan denah baru" className="w-8 h-8 rounded-full bg-[#e8eaed] text-[#3c4043] flex items-center justify-center active:scale-95 transition-transform"><ICONS.restart size={15} /></button>}
            <button
              onClick={onSwap}
              aria-label={lefty ? 'Mode kidal aktif, tap untuk balik ke kanan' : 'Pindahkan tombol ke kiri (mode kidal)'}
              aria-pressed={!!lefty}
              className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform ${lefty ? 'bg-[#5f9c22] text-white' : 'bg-[#e8eaed] text-[#3c4043]'}`}
            >
              <ICONS.swap size={15} />
            </button>
            {canPause && (
              <button onClick={onPause} aria-label="Jeda" className="w-8 h-8 rounded-full bg-[#232323] text-white flex items-center justify-center active:scale-95 transition-transform">
                <ICONS.pause size={15} />
              </button>
            )}
            <button onClick={onHelp} aria-label="Bantuan" className="w-8 h-8 rounded-full bg-[#232323] text-white flex items-center justify-center active:scale-95 transition-transform">
              <HelpIcon size={15} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#5f6368] leading-none">
          <span className="truncate font-semibold">{isPuzzle ? puzzle.name : short}</span>
          <span className="shrink-0">{isPuzzle ? 'Rekor' : 'Terbaik'} <b className="text-[#202124]">{isPuzzle ? (puzzle.best || '-') : best}</b></span>
        </div>
        {isPuzzle && (
          <>
            <PuzzleStats p={puzzle} />

          </>
        )}
        {isDelivery && <DeliveryStats d={delivery} />}
        {isRogue && <RogueStats r={roguelite} />}
        {isTerritory && <TerritoryStats t={territory} />}
        {isBoss && <BossStats b={boss} />}
        {(showTimer || effects.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {showTimer && (
              <span className="flex items-center gap-1 text-[13px] font-bold text-[#c9432f]">
                <TimerIcon size={14} />{timerText}
              </span>
            )}
            {effects.map((e, i) => <EffectBadge key={e.type + i} effect={e} />)}
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      {(mode === 'multiplayer' || mode === 'mayhemduo') && mpHud && (
        <div className="game-w flex justify-between items-center text-[12px] font-semibold mb-1.5 px-1">
          <span className="flex items-center gap-1.5" style={{ color: '#8fd13f' }}>{mpHud.p1Label} <Hearts count={mpHud.p1Lives} /></span>
          <span className="flex items-center gap-1.5" style={{ color: '#5fc2ea' }}>{mpHud.p2Label} <Hearts count={mpHud.p2Lives} /></span>
        </div>
      )}
      <div className="game-w bg-white text-[#202124] rounded-lg flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 mb-2 sm:mb-2.5 shadow-lg">
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
          <ICONS.gamepad size={18} className="text-[#5f6368]" />
          <b className="text-[15px] sm:text-[17px] tracking-wide">{String(modeLabel || '').replace(/^Snake/, 'K-Snake')}</b>
          {isPuzzle && <span className="text-[13px] font-semibold text-[#3c4043]">Ruang {puzzle.levelNo}/{puzzle.levelCount} · {puzzle.name}</span>}
          {mode === 'timeattack' && timerText && (
            <span className="flex items-center gap-1 text-[13px] font-bold text-[#c9432f]">
              <TimerIcon size={14} />{timerText}
            </span>
          )}
          <div className="flex items-center gap-1 flex-wrap">
            {effects.map((e, i) => <EffectBadge key={e.type + i} effect={e} />)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canPause && <button onClick={onPause} aria-label="Jeda" className="icon-button"><ICONS.pause size={18} /></button>}
          <button onClick={onHelp} aria-label="Bantuan" className="w-7 h-7 rounded-full bg-[#232323] text-white flex items-center justify-center">
            <HelpIcon size={15} />
          </button>
          {mode !== 'multiplayer' && mode !== 'mayhemduo' && mode !== 'territory' && mode !== 'boss' && !isPuzzle && (
            <div className="flex items-center gap-1.5 font-bold">
              <ICONS.trophy size={15} className="text-[#f5b942]" />
              <span>{score}</span>
            </div>
          )}
        </div>
      </div>
      {isRogue && !hideStats && (
        <div className="game-w bg-white text-[#202124] rounded-lg px-3 sm:px-4 py-2 mb-2 sm:mb-2.5 shadow-lg">
          <RogueStats r={roguelite} cols />
        </div>
      )}
      {isDelivery && !hideStats && (
        <div className="game-w bg-white text-[#202124] rounded-lg px-3 sm:px-4 py-2 mb-2 sm:mb-2.5 shadow-lg">
          <DeliveryStats d={delivery} cols />
        </div>
      )}
      {isBoss && !hideStats && (
        <div className="game-w bg-white text-[#202124] rounded-lg px-3 sm:px-4 py-2 mb-2 sm:mb-2.5 shadow-lg">
          <BossStats b={boss} cols />
        </div>
      )}
      {isTerritory && !hideStats && (
        <div className="game-w bg-white text-[#202124] rounded-lg px-3 sm:px-4 py-2 mb-2 sm:mb-2.5 shadow-lg">
          <TerritoryStats t={territory} />
        </div>
      )}
      {isPuzzle && !hideStats && (
        <div className="game-w bg-white text-[#202124] rounded-lg flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 mb-2 sm:mb-2.5 shadow-lg">
          <PuzzleStats p={puzzle} />
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#5f6368]">Rekor <b className="text-[#202124]">{puzzle.best || '-'}</b></span>

          </div>
        </div>
      )}
    </>
  );
}
