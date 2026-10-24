'use client';
import { useEffect, useState } from 'react';
import { gameView } from '@/lib/gameView';
import { getMode } from '@/lib/modes/registry';
import { ICONS } from '@/lib/icons';

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
          <span><ICONS.shield size={14} />Perisai {b.shield}/{b.shieldMax}{b.shieldSecs > 0 ? ` · +10 dalam ${b.shieldSecs}s` : ''}</span>
          <span><BoltI size={14} />Orb ×2: {b.damageStacks} · Daya pukul {b.playerDamage.toLocaleString('id-ID')}</span>
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

export function GameDetails({ mode, hud: h }) {
  const meta = getMode(mode);
  return <div className="game-details">
    <p className="eyebrow">K-SNAKE / {meta?.label}</p>
    {h.puzzle && <><h3>Ruang {h.puzzle.levelNo} · {h.puzzle.name}</h3><PuzzleStats p={h.puzzle} /><p>Rekor: {h.puzzle.best || '—'} · Acuan: {h.puzzle.par} · Denah: {h.puzzle.shape}</p><details><summary>Cara mendapat 3 bintang</summary><p>Tanpa alarm, ambil semua koin bonus, dan keluar sebelum waktu acuan.</p></details></>}
    {h.delivery && <DeliveryStats d={h.delivery} />}
    {h.roguelite && <RogueStats r={h.roguelite} />}
    {h.boss && <BossStats b={h.boss} />}
    {h.territory && <TerritoryStats t={h.territory} />}
    {meta?.kind === 'arcade' && <p>Skor {h.score} · Terbaik {h.best}</p>}
    <p>{meta?.goal || meta?.description}</p><p>{meta?.finish}</p>
  </div>;
}

export default function Hud({ mode, hud, onInfo, onPause, canPause, onCamera }) {
  const view = gameView(mode, hud);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setNotice(view.message || '');
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [view.message]);
  return <div className="game-hud">
    <div className="hud-readout">
      <div className="hud-values">{view.stats.map((s, i) => {
        const Icon = ICONS[s.icon] || ICONS.help;
        return <div key={i} className="hud-chip" data-danger={s.danger} aria-label={`${s.label}: ${s.value}`}><Icon size={17} aria-hidden="true" /><span><small>{s.label}</small><b>{s.value}</b></span></div>;
      })}</div>
      {(view.signals.length > 0 || view.cargo) && <div className="hud-signals">
        {view.signals.map((s, i) => { const Icon = ICONS[s.icon] || ICONS.help; return <span key={i} data-danger={s.danger}><Icon size={13} aria-hidden="true" />{s.label}</span>; })}
        {view.cargo?.map((c, i) => <span key={`cargo-${i}`} className="cargo-chip" data-danger={c && c.secs <= 3} aria-label={`Kargo ${i + 1}: ${c ? `paket ${c.type}, ${c.secs} detik` : 'kosong'}`}><ICONS.delivery size={13} />{c ? `${c.type} · ${c.secs}d` : '—'}</span>)}
      </div>}
      {view.suspicion !== null && <div className="hud-awareness" role="progressbar" aria-label="Kecurigaan penjaga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={view.suspicion}><i style={{ width: `${view.suspicion}%` }} /></div>}
    </div>
    <nav className="hud-tools" aria-label="Menu permainan">
      <button type="button" onClick={onInfo} title="Info misi & pengaturan" aria-label="Info misi dan pengaturan"><ICONS.info size={20} /></button>
      {canPause && <button type="button" onClick={onPause} title="Jeda (Esc)" aria-label="Jeda"><ICONS.pause size={20} /></button>}
    </nav>
    {mode === 'puzzle' && <nav className="camera-tools" aria-label="Kamera Dungeon">
      <button onClick={() => onCamera?.('out')} aria-label="Perkecil tampilan" disabled={!hud.puzzle?.camera?.overview && hud.puzzle?.camera?.zoom <= .8}><ICONS.zoomOut size={19} /></button>
      <button onClick={() => onCamera?.('toggle')} aria-label={hud.puzzle?.camera?.overview ? 'Ikuti ular' : 'Lihat seluruh peta'} aria-pressed={!!hud.puzzle?.camera?.overview}>{hud.puzzle?.camera?.overview ? <ICONS.locate size={19} /> : <ICONS.map size={19} />}</button>
      <button onClick={() => onCamera?.('in')} aria-label="Perbesar tampilan" disabled={!hud.puzzle?.camera?.overview && hud.puzzle?.camera?.zoom >= 1.65}><ICONS.zoomIn size={19} /></button>
    </nav>}
    {notice && <div className="game-toast" title={notice} role="status" aria-live="polite" aria-atomic="true">{notice}</div>}
  </div>;
}
