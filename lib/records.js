// Rekor per MODE + KONFIGURASI, terpisah dari `snake_best` (rekor lama tidak dimigrasikan: asal modenya tidak diketahui).
// Key: `snake-records-v1`. Contoh kunci rekor: "delivery|shift:120|target:5|speed:normal" — durasi/target/kecepatan berbeda = rekor berbeda.
import { read, write } from './storage';

export const RECORDS_KEY = 'snake-records-v1';
const KEY_RE = /^[a-z0-9:|_.-]{1,80}$/;
const emptyRecords = () => ({ v: 1, records: {} });
const intIn = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;

// Aman terhadap string apa pun: rusak / versi asing / entri liar -> kosong atau dibersihkan.
// `bestDeliveries` dan `bestRounds` opsional di data lama (default 0) — entri Delivery yang sudah tersimpan tetap valid.
export function parseRecords(raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { return emptyRecords(); }
  if (!data || typeof data !== 'object' || data.v !== 1 || !data.records || typeof data.records !== 'object') return emptyRecords();
  const out = emptyRecords();
  Object.keys(data.records).forEach(k => {
    const r = data.records[k];
    if (!KEY_RE.test(k) || !r || typeof r !== 'object') return;
    const bd = r.bestDeliveries === undefined ? 0 : r.bestDeliveries, br = r.bestRounds === undefined ? 0 : r.bestRounds;
    if (intIn(r.best, 0, 999999) && intIn(bd, 0, 9999) && intIn(br, 0, 99) && intIn(r.plays, 0, 999999) && intIn(r.wins, 0, 999999) && r.wins <= r.plays)
    {
      const e = { best: r.best, bestDeliveries: bd, bestRounds: br, plays: r.plays, wins: r.wins };
      // Territory: p1Wins/p2Wins/draws opsional; ditulis hanya bila ada di data (entri mode lain tidak berubah bentuk).
      const extra = ['p1Wins', 'p2Wins', 'draws'].filter(f => r[f] !== undefined);
      if (extra.length && !extra.every(f => intIn(r[f], 0, r.plays))) return;
      extra.forEach(f => { e[f] = r[f]; });
      // Boss: bestSecs (kemenangan tercepat, 0 = belum pernah menang) opsional, 0..99999.
      if (r.bestSecs !== undefined) { if (!intIn(r.bestSecs, 0, 99999)) return; e.bestSecs = r.bestSecs; }
      out.records[k] = e;
    }
  });
  return out;
}

export const loadRecords = () => parseRecords(read(RECORDS_KEY));
export const saveRecords = (r) => write(RECORDS_KEY, JSON.stringify(r));

export const deliveryConfigKey = (cfg, speed) => `delivery|shift:${Math.round(cfg.shiftMs / 1000)}|target:${cfg.target}|speed:${speed}`;
export const rogueConfigKey = (cfg, speed) => `roguelite|v:2|rounds:${cfg.rounds}|food:${cfg.foodCount}|speed:${speed}`;
export const territoryConfigKey = (cfg, speed) => `territory|match:${Math.round(cfg.matchMs / 1000)}|target:${cfg.targetPct}|speed:${speed}`;
export const bossConfigKey = (speed, cfg = { bossHp: 18, lives: 5, minionRounds: 9 }) => `boss|v:3|hp:${cfg.bossHp}|lives:${cfg.lives}|rounds:${cfg.minionRounds + 1}|speed:${speed}`;
export const getRecord = (records, key) => records.records[key] || { best: 0, bestDeliveries: 0, bestRounds: 0, plays: 0, wins: 0 };

// Murni: catat hasil satu ronde. Skor/pengantaran terbaik = maksimum; hasil tidak valid ditolak.
export function recordResult(records, key, { score, delivered, won }) {
  if (!KEY_RE.test(key) || !intIn(score, 0, 999999) || !intIn(delivered, 0, 9999)) return { records, newBest: false };
  const prev = getRecord(records, key);
  const newBest = score > prev.best;
  const next = { v: 1, records: { ...records.records, [key]: { best: Math.max(prev.best, score), bestDeliveries: Math.max(prev.bestDeliveries, delivered), bestRounds: prev.bestRounds, plays: prev.plays + 1, wins: prev.wins + (won ? 1 : 0) } } };
  return { records: next, newBest };
}

// Murni: catat satu run Roguelite. Skor total terbaik dan ronde tertinggi yang dicapai = maksimum; `won` = seluruh rute dan boss kebun selesai.
export function recordRun(records, key, { score, rounds, won }) {
  if (!KEY_RE.test(key) || !intIn(score, 0, 999999) || !intIn(rounds, 0, 99)) return { records, newBest: false };
  const prev = getRecord(records, key);
  const newBest = score > prev.best;
  const next = { v: 1, records: { ...records.records, [key]: { best: Math.max(prev.best, score), bestDeliveries: prev.bestDeliveries, bestRounds: Math.max(prev.bestRounds, rounds), plays: prev.plays + 1, wins: prev.wins + (won ? 1 : 0) } } };
  return { records: next, newBest };
}

// Territory: best = persentase wilayah tertinggi yang pernah dicapai satu pemain; wins = pertandingan yang ada pemenangnya.
export const getTerritoryRecord = (records, key) => ({ p1Wins: 0, p2Wins: 0, draws: 0, ...getRecord(records, key) });
export function recordMatch(records, key, { best, winner }) {
  if (!KEY_RE.test(key) || !intIn(best, 0, 100) || ![0, 1, 2].includes(winner)) return { records, newBest: false };
  const prev = getTerritoryRecord(records, key);
  const newBest = best > prev.best;
  const next = { v: 1, records: { ...records.records, [key]: {
    best: Math.max(prev.best, best), bestDeliveries: prev.bestDeliveries, bestRounds: prev.bestRounds, plays: prev.plays + 1, wins: prev.wins + (winner ? 1 : 0),
    p1Wins: prev.p1Wins + (winner === 1 ? 1 : 0), p2Wins: prev.p2Wins + (winner === 2 ? 1 : 0), draws: prev.draws + (winner === 0 ? 1 : 0),
  } } };
  return { records: next, newBest };
}

// Boss v3: best = kerusakan HP boss (0..18, shield tidak dihitung); rekor lama tetap disimpan terpisah; bestSecs = kemenangan tercepat (detik, 0 = belum ada); wins = boss kalah.
export const getBossRecord = (records, key) => ({ bestSecs: 0, ...getRecord(records, key) });
export function recordBoss(records, key, { damage, won, secs, round = 1 }) {
  const limit = Number((key.match(/\|hp:(\d+)\|/) || [])[1]) || 12;
  if (!KEY_RE.test(key) || !intIn(damage, 0, limit) || !intIn(round, 1, 99) || !intIn(secs, 0, 99999)) return { records, newBest: false };
  const prev = getBossRecord(records, key);
  const newBest = won ? (prev.bestSecs === 0 || secs < prev.bestSecs) : damage > prev.best;
  const next = { v: 1, records: { ...records.records, [key]: {
    best: Math.max(prev.best, damage), bestDeliveries: prev.bestDeliveries, bestRounds: Math.max(prev.bestRounds, round), plays: prev.plays + 1, wins: prev.wins + (won ? 1 : 0),
    bestSecs: won ? (prev.bestSecs === 0 ? secs : Math.min(prev.bestSecs, secs)) : prev.bestSecs,
  } } };
  return { records: next, newBest };
}
