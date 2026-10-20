// Progres ekspansi, terpisah dari key lama (`snake_best`, `snake-speed`, ...).
// Key: `snake-progress-v1` berisi JSON ber-versi. Semua nilai divalidasi saat dibaca.
import { read, write } from './storage';

export const PROGRESS_KEY = 'snake-progress-v1';
const ID_RE = /^[a-z0-9-]{1,24}$/;
const emptyProgress = () => ({ v: 1, puzzle: { levels: {} } });

// Mengembalikan progres yang AMAN dari string mentah apa pun: rusak / versi asing / angka liar -> kosong atau dibersihkan.
export function parseProgress(raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { return emptyProgress(); }
  if (!data || typeof data !== 'object' || data.v !== 1) return emptyProgress();
  const out = emptyProgress();
  const src = data.puzzle && data.puzzle.levels;
  if (src && typeof src === 'object') {
    Object.keys(src).forEach(id => {
      const best = src[id] && src[id].best;
      if (ID_RE.test(id) && Number.isInteger(best) && best >= 1 && best <= 9999) {
        const revision = src[id].revision;
        const coins = src[id].coins;
        out.puzzle.levels[id] = { best, ...(Number.isInteger(revision) && revision > 1 && revision <= 99 ? { revision } : {}),
          ...(Number.isInteger(coins) && coins > 0 && coins <= 255 ? { coins } : {}) };
      }
    });
  }
  return out;
}

export const loadProgress = () => parseProgress(read(PROGRESS_KEY));
export const saveProgress = (p) => write(PROGRESS_KEY, JSON.stringify(p));

// Gabungkan hasil lokal yang belum tersimpan dengan hasil terbaru dari tab lain.
export function mergeProgress(local, disk) {
  const a = parseProgress(JSON.stringify(local)), b = parseProgress(JSON.stringify(disk));
  const levels = { ...a.puzzle.levels };
  Object.entries(b.puzzle.levels).forEach(([id, record]) => {
    const old = levels[id];
    if (!old) { levels[id] = { ...record }; return; }
    const ar = old.revision || 1, br = record.revision || 1;
    const best = ar === br ? Math.min(old.best, record.best) : ar > br ? old.best : record.best;
    const revision = Math.max(ar, br), coins = Math.max(old.coins || 0, record.coins || 0);
    levels[id] = { best, ...(revision > 1 ? { revision } : {}), ...(coins ? { coins } : {}) };
  });
  return { v: 1, puzzle: { levels } };
}

// Murni: catat hasil level. Replay tidak merusak rekor (best = minimum). `firstClear` hanya benar sekali per level.
export function recordPuzzleResult(progress, levelId, steps, revision = 1, apples = 0) {
  const prev = progress.puzzle.levels[levelId];
  const firstClear = !prev;
  const newBest = !prev || (prev.revision || 1) !== revision || steps < prev.best;
  if (!Number.isInteger(steps) || steps < 1 || steps > 9999) return { progress, newBest: false, firstClear: false };
  const oldCoins = prev && prev.coins || 0;
  const coins = Math.max(oldCoins, Number.isInteger(apples) && apples >= 0 && apples <= 255 ? apples : 0);
  const next = { v: 1, puzzle: { levels: { ...progress.puzzle.levels, [levelId]: { best: newBest ? steps : prev.best, ...(revision > 1 ? { revision } : {}), ...(coins ? { coins } : {}) } } } };
  return { progress: next, newBest, firstClear, earned: coins - oldCoins };
}

// Saldo berasal dari hadiah terbaik per level, sehingga replay/undo tidak mencetak koin.
// Belanja skin belum aktif; saat hadir, ledger pengeluaran perlu ditambahkan.
export const appleCoins = (progress) => Object.values(progress.puzzle.levels).reduce((n, r) => n + (r.coins || 0), 0);

// Level ke-i terbuka bila i = 0 atau SEMUA level sebelumnya pernah diselesaikan (rantai penuh;
// progres yang dilompati, mis. hasil edit manual, tidak membuka level lanjutan).
export function isUnlocked(progress, levels, i) {
  if (!Number.isInteger(i) || i < 0 || i >= levels.length) return false;
  for (let k = 0; k < i; k++) if (!progress.puzzle.levels[levels[k].id]) return false;
  return true;
}
