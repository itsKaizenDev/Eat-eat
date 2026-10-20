// Upgrade "Ekspedisi Mayhem" — MURNI: data + perhitungan. Semua angka adalah PARAMETER AWAL (balance belum teruji main).
//
// STACKING (semua tingkat dihitung dari jumlah tingkat `n` tiap upgrade):
//   * Pengali (skor, interval, durasi, bobot): MULTIPLIKATIF — faktor^n.   * Hitungan (panjang awal, perisai, penawar, ranjau): ADITIF.
// URUTAN KALKULASI nilai apel (positif):
//   1) nilai dasar jenis apel -> 2) pengali khusus jenis (Tubuh ringkas utk normal, Racikan penawar utk besar)
//   -> 3) pengali skor global (Langkah berani ×1.25^n, Kulit tebal ×0.85^n) -> 4) efek "Skor Ganda" (×2) -> 5) round() -> 6) clamp >= 1.
//   Racun = -6 tetap (tidak diskalakan).
// CLAMP: panjang awal >= 3 · interval gerak dalam [70, 300] ms · durasi efek <= 20 dtk · peluang efek merugikan <= 0.8 · ranjau <= 10.
// KOMBINASI TERLARANG: upgrade TIDAK ditawarkan bila pengambilannya membuat nilai apel normal (tanpa efek) < 3 poin
//   (mis. Tubuh ringkas ×2 + Kulit tebal): build yang membuat target mustahil tidak bisa terbentuk. Upgrade yang sudah mencapai
//   `max` juga tidak ditawarkan lagi. Dalam satu penawaran tidak ada duplikat; bila pool < 3, yang tersedia saja yang ditampilkan.

export const BASE = { normal: 4, big: 10, lucky: 4, poison: -6 };
export const BASE_START_LEN = 5;
export const MIN_START_LEN = 3;
export const MIN_INTERVAL = 70;
export const MAX_INTERVAL = 300;
export const MAX_EFFECT_MS = 20000;
export const MIN_NORMAL_VALUE = 3;
export const MAX_HARM_PROB = 0.8;
export const MAX_BOMBS = 10;

export const UPGRADES = [
  { id: 'compact', name: 'Tubuh ringkas', icon: 'compress', max: 2, benefit: 'Panjang awal −1 tiap tingkat (minimal 3), termasuk saat masuk kebun.', cost: 'Nilai apel normal ×0,8 tiap tingkat.' },
  { id: 'brave', name: 'Langkah berani', icon: 'bolt', max: 2, benefit: 'Skor semua apel ×1,25 tiap tingkat.', cost: 'Interval gerak ×0,9 tiap tingkat (batas minimum 70 ms).' },
  { id: 'thick', name: 'Kulit tebal', icon: 'shield', max: 2, benefit: 'Menahan 1 tabrakan per rute tiap tingkat. Bekal kebun: +2 hati/tingkat.', cost: 'Skor semua apel ×0,85 tiap tingkat.' },
  { id: 'antidote', name: 'Racikan penawar', icon: 'flask', max: 2, benefit: 'Meniadakan 1 racun per rute tiap tingkat. Bekal kebun: +1 hati/tingkat.', cost: 'Nilai apel besar ×0,8 tiap tingkat.' },
  { id: 'sweet', name: 'Bekal manis', icon: 'gift', max: 2, benefit: 'Apel besar ×1,5 lebih sering tiap tingkat. Bekal kebun: +2 energi/tingkat.', cost: 'Ranjau +2 per ronde dan efek merugikan +15% tiap tingkat.' },
  { id: 'breath', name: 'Napas panjang', icon: 'wind', max: 2, benefit: 'Efek menguntungkan ×1,4 lebih lama tiap tingkat; durasi kebal di kebun juga ×1,4.', cost: 'Efek merugikan juga ×1,4 lebih lama.' },
];
export const UPGRADE_IDS = UPGRADES.map(u => u.id);
export const getUpgrade = (id) => UPGRADES.find(u => u.id === id) || null;
export const emptyCounts = () => Object.fromEntries(UPGRADE_IDS.map(id => [id, 0]));

// Efek sementara (dipicu apel keberuntungan). Durasi dasar 6 dtk, diskalakan Napas panjang, di-clamp.
export const EFFECTS = {
  slow: { label: 'Waktu Melambat', good: true, ms: 6000, intervalMult: 1.5 },
  double: { label: 'Skor Ganda', good: true, ms: 6000 },
  rush: { label: 'Terburu-buru', good: false, ms: 6000, intervalMult: 0.7 },
  reverse: { label: 'Kontrol Terbalik', good: false, ms: 6000 },
};
const GOOD = ['slow', 'double'], BAD = ['rush', 'reverse'];

const pow = (b, n) => Math.pow(b, n);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function deriveStats(counts) {
  const c = { ...emptyCounts(), ...counts };
  return {
    startLen: Math.max(MIN_START_LEN, BASE_START_LEN - c.compact),
    normalMult: pow(0.8, c.compact),
    bigMult: pow(0.8, c.antidote),
    scoreMult: pow(1.25, c.brave) * pow(0.85, c.thick),
    intervalMult: pow(0.9, c.brave),
    shield: c.thick,
    neutral: c.antidote,
    bigWeightMult: pow(1.5, c.sweet),
    bombExtra: 2 * c.sweet,
    harmProb: Math.min(MAX_HARM_PROB, 0.5 + 0.15 * c.sweet),
    durMult: pow(1.4, c.breath),
  };
}

export const hasEffect = (effects, type) => effects.some(e => e.type === type);

// Nilai apel (integer). `effects` = efek aktif [{type}].
export function appleValue(kind, stats, effects) {
  if (kind === 'poison') return BASE.poison;
  let raw = BASE[kind];
  if (kind === 'normal') raw *= stats.normalMult;
  if (kind === 'big') raw *= stats.bigMult;
  raw *= stats.scoreMult;
  if (hasEffect(effects || [], 'double')) raw *= 2;
  return Math.max(1, Math.round(raw));
}
export const normalValue = (stats) => appleValue('normal', stats, []);

export function intervalFor(baseMs, stats, effects) {
  let m = stats.intervalMult;
  (effects || []).forEach(e => { if (EFFECTS[e.type] && EFFECTS[e.type].intervalMult) m *= EFFECTS[e.type].intervalMult; });
  return clamp(Math.round(baseMs * m), MIN_INTERVAL, MAX_INTERVAL);
}

export const effectDuration = (type, stats) => Math.min(MAX_EFFECT_MS, Math.round(EFFECTS[type].ms * stats.durMult));

// Memilih efek: merugikan dengan peluang `harmProb`. Urutan konsumsi rng tetap (deterministik).
export function rollEffect(stats, rng) {
  const harm = rng() < stats.harmProb;
  const pool = harm ? BAD : GOOD;
  return pool[Math.floor(rng() * pool.length)];
}

export function canOffer(counts, id) {
  const u = getUpgrade(id);
  if (!u) return false;
  const have = counts[id] || 0;
  if (have >= u.max) return false;
  const next = { ...emptyCounts(), ...counts, [id]: have + 1 };
  return normalValue(deriveStats(next)) >= MIN_NORMAL_VALUE;
}

// Penawaran: acak (Fisher-Yates dengan rng yang diberikan), tanpa duplikat, hanya yang boleh ditawarkan. Bisa < n.
export function offerUpgrades(counts, rng, n) {
  const pool = UPGRADE_IDS.filter(id => canOffer(counts, id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n == null ? 3 : n);
}

// Bekal permanen saat lima rute selesai; efek apel sementara tidak dibawa.
export function expeditionSupplies(counts) {
  const c = { ...emptyCounts(), ...counts };
  return {
    energy: c.sweet * 2,
    config: { lives: 5 + c.thick * 2 + c.antidote, apples: 5, startLen: deriveStats(c).startLen, invulnMs: Math.round(2500 * Math.pow(1.4, c.breath)) },
  };
}
