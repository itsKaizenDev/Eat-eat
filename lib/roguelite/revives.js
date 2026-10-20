// Jatah lokal bersama untuk semua run/kecepatan Ekspedisi. Bukan mata uang server.
import { read, write } from '../storage';

export const REVIVE_KEY = 'snake-expedition-revives-v1';
export const REVIVE_LIMIT = 3;
export const REVIVE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function parseRevives(raw, now) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { data = null; }
  const valid = data && data.v === 1 && Number.isInteger(data.left) && data.left >= 0 && data.left <= REVIVE_LIMIT
    && Number.isSafeInteger(data.resetAt) && data.resetAt >= 0 && Number.isSafeInteger(data.lastUsed) && data.lastUsed >= 0
    && (data.resetAt === 0 ? data.left === REVIVE_LIMIT : data.resetAt >= data.lastUsed);
  if (!valid || (data.resetAt && now >= data.resetAt)) return { v: 1, left: REVIVE_LIMIT, resetAt: 0, lastUsed: 0 };
  return { v: 1, left: data.left, resetAt: data.resetAt, lastUsed: data.lastUsed };
}

export const loadRevives = (now = Date.now()) => parseRevives(read(REVIVE_KEY), now);

// Baca ulang di dalam lock agar dua tab tidak menghabiskan jatah yang sama.
// Browser tanpa Web Locks tetap memakai penyimpanan lokal; tidak tahan manipulasi jam/storage.
export function consumeRevive(now = Date.now()) {
  const take = () => {
    const current = loadRevives(now);
    if (!current.left) return { ok: false, reason: 'empty', quota: current };
    const usedAt = Math.max(now, current.lastUsed);
    const next = { v: 1, left: current.left - 1, resetAt: current.resetAt || usedAt + REVIVE_WINDOW_MS, lastUsed: usedAt };
    if (!write(REVIVE_KEY, JSON.stringify(next))) return { ok: false, reason: 'storage', quota: current };
    return { ok: true, quota: next };
  };
  if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) return navigator.locks.request(REVIVE_KEY, take);
  return Promise.resolve(take());
}
