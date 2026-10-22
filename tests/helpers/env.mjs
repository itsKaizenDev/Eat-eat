// Menyalin lib/ ke cache sebagai .mjs (impor relatif ditulis ulang) agar bisa dijalankan
// langsung oleh `node --test`, tanpa bundler dan tanpa mengubah source produksi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'node_modules/.cache/snake-tests');
fs.rmSync(out, { recursive: true, force: true });
(function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, f.name);
    if (f.isDirectory()) copy(s, path.join(dst, f.name));
    else if (f.name.endsWith('.js')) {
      const code = fs.readFileSync(s, 'utf8')
        .replace(/^'use client';\n/, '')
        .replace(/from '(\.{1,2}\/[^']+)'/g, "from '$1.mjs'");
      fs.writeFileSync(path.join(dst, f.name.replace(/\.js$/, '.mjs')), code);
    }
  }
})(path.join(root, 'lib'), out);

const load = (rel) => import(pathToFileURL(path.join(out, rel)).href);
export const { createSnakeGame } = await load('gameEngine.mjs');
export const storage = await load('storage.mjs');
export const grid = await load('sim/grid.mjs');
export const { createRng } = await load('sim/rng.mjs');
export const { createSimClock } = await load('sim/clock.mjs');
export const puzzle = await load('puzzle/sim.mjs');
export const { LEVELS, RAW_LEVELS, REJECTED_LEVELS, loadLevels } = await load('puzzle/levels.mjs');
export const { createPuzzleGame } = await load('puzzle/controller.mjs');
export const generator = await load('puzzle/generator.mjs');
export const rounds = await load('puzzle/rounds.mjs');
export const campaign = await load('puzzle/campaign.mjs');
export const progressLib = await load('progress.mjs');
export const registry = await load('modes/registry.mjs');
export const gameView = await load('gameView.mjs');
export const constants = await load('constants.mjs');
export const sceneTheme = await load('sceneTheme.mjs');
export { root };

export const geometry = await load('puzzle/geometry.mjs');
export const validation = await load('puzzle/validation.mjs');

// Fixed-step dungeon controller with an observable world and an actual simulated RAF clock.
export function makePuzzleWorld({ progress, levels, io, rng = createRng(123) } = {}) {
  const noop=()=>{};
  const ctx=new Proxy({}, {get:(t,p)=>p in t?t[p]:noop,set:(t,p,v)=>{t[p]=v;return true;}});
  const w={emits:[],saves:[],calls:{win:0,death:0,chomp:0,eits:0},rafQueue:new Map(),now:5000,seq:0};
  w.progress=progress||{v:1,puzzle:{levels:{}}};
  const sounds=Object.fromEntries(['Win','Death','Chomp','Eits'].map(n=>['play'+n,()=>w.calls[n.toLowerCase()]++]));
  w.eng=createPuzzleGame({canvas:{width:680,height:600,getContext:()=>ctx},sounds,onUpdate:p=>w.emits.push(p),
    levels:levels||LEVELS,rng,io:io||{load:()=>w.progress,save:p=>{w.saves.push(p);w.progress=p;return true;}},
    raf:fn=>{const id=++w.seq;w.rafQueue.set(id,fn);return id;},caf:id=>w.rafQueue.delete(id),now:()=>w.now,inspect:h=>w.x=h});
  w.frame=ms=>{w.now+=ms;const q=[...w.rafQueue.values()];w.rafQueue.clear();q.forEach(cb=>cb(w.now));};
  w.advance=ms=>{const end=w.now+ms;while(w.now<end)w.frame(Math.min(1000/60,end-w.now));};
  w.last=key=>w.emits.findLast(e=>key in e)?.[key];
  w.overlays=phase=>w.emits.filter(e=>e.overlay?.phase===phase);
  return w;
}

// Dunia palsu: jam, RAF, localStorage, Image, canvas.
export function makeWorld(mode, { seed = 1, store = {}, speed } = {}) {
  const w = { t: 1000, raf: [], emits: [], calls: { death: 0, move: 0, chomp: 0, eits: 0 }, store: { ...store } };
  globalThis.localStorage = { getItem: k => (k in w.store ? w.store[k] : null), setItem: (k, v) => { w.store[k] = String(v); } };
  globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; } set src(v) {} };
  globalThis.requestAnimationFrame = (cb) => { w.raf.push(cb); return w.raf.length; };
  globalThis.cancelAnimationFrame = () => {};
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, p) => (p === 'createRadialGradient' ? () => ({ addColorStop: noop }) : (p in t ? t[p] : noop)), set: (t, p, v) => { t[p] = v; return true; } });
  const canvas = { width: 680, height: 600, x: 0, getContext: () => ctx };
  w.canvas = canvas;
  const sounds = { playDeath: () => w.calls.death++, playEits: () => w.calls.eits++, playChomp: () => w.calls.chomp++, playMove: () => w.calls.move++ };
  let hook;
  w.eng = createSnakeGame({ canvas, sounds, onUpdate: p => w.emits.push(p), rng: createRng(seed), now: () => w.t, inspect: h => { hook = h; } });
  w.x = hook; // akses internal HANYA lewat hook inspeksi (tidak ada di build produksi)
  w.eng.setMode(mode);
  if (speed) w.eng.setSpeedPref(speed);
  // Maju `ms` dengan frame 16 ms (seperti RAF).
  w.advance = (ms) => { const end = w.t + ms; while (w.t < end) { w.t = Math.min(end, w.t + 16); const q = w.raf; w.raf = []; q.forEach(cb => cb(w.t)); } };
  w.last = (key) => { for (let i = w.emits.length - 1; i >= 0; i--) if (key in w.emits[i]) return w.emits[i][key]; };
  w.overlays = (phase) => w.emits.filter(e => e.overlay && e.overlay.phase === phase);
  return w;
}
export const food = (x, y, kind = 'normal') => ({ x, y, kind, slot: 'random', scale: { v: 1 }, expiresAt: null, disguised: false, revealUntil: 0, expiring: 0, expiringFrom: 1 });
export const { ICONS } = await load('icons.mjs');
export const animLib = await load('sim/anim.mjs');
export const pathLib = await load('render/snakePath.mjs');
export const deliverySim = await load('delivery/sim.mjs');
export const { createDeliveryGame } = await load('delivery/controller.mjs');
export const recordsLib = await load('records.mjs');

// Dunia palsu Delivery: jam & RAF palsu, rekor di memori, suara dihitung.
export function makeDeliveryWorld({ seed = 1, config, speed, records } = {}) {
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, p) => (p === 'createRadialGradient' ? () => ({ addColorStop: noop }) : (p in t ? t[p] : noop)), set: (t, p, v) => { t[p] = v; return true; } });
  const canvas = { width: 680, height: 600, getContext: () => ctx };
  const w = { t: 1000, raf: [], emits: [], saves: [], records: records || { v: 1, records: {} }, calls: { move: 0, chomp: 0, eits: 0, death: 0, bump: 0, win: 0, deliver: 0, locked: 0 } };
  const sounds = { playMove: () => w.calls.move++, playChomp: () => w.calls.chomp++, playEits: () => w.calls.eits++, playDeath: () => w.calls.death++, playBump: () => w.calls.bump++, playWin: () => w.calls.win++, playDeliver: () => w.calls.deliver++, playLocked: () => w.calls.locked++ };
  const io = { load: () => w.records, save: (r) => { w.saves.push(r); w.records = r; } };
  let hook;
  w.eng = createDeliveryGame({ canvas, sounds, onUpdate: p => w.emits.push(p), rng: createRng(seed), now: () => w.t, raf: cb => { w.raf.push(cb); return 1; }, caf: () => { w.raf = []; }, io, config, inspect: h => { hook = h; } });
  w.x = hook;
  if (speed) w.eng.setSpeedPref(speed);
  w.advance = (ms) => { const end = w.t + ms; while (w.t < end) { w.t = Math.min(end, w.t + 16); const q = w.raf; w.raf = []; q.forEach(cb => cb(w.t)); } };
  w.last = (key) => { for (let i = w.emits.length - 1; i >= 0; i--) if (key in w.emits[i]) return w.emits[i][key]; };
  w.overlays = (phase) => w.emits.filter(e => e.overlay && e.overlay.phase === phase);
  return w;
}

export const rogueUp = await load('roguelite/upgrades.mjs');
export const rogueSim = await load('roguelite/sim.mjs');
export const { createRogueliteGame } = await load('roguelite/controller.mjs');

// Dunia palsu Roguelite: jam & RAF palsu, rekor di memori, suara dihitung, seed eksplisit.
export function makeRogueWorld({ seed = 1, speed, records, config, reviveIO, wallNow } = {}) {
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, p) => (p === 'createRadialGradient' ? () => ({ addColorStop: noop }) : (p in t ? t[p] : noop)), set: (t, p, v) => { t[p] = v; return true; } });
  const canvas = { width: 680, height: 600, getContext: () => ctx };
  const w = { t: 1000, raf: [], emits: [], saves: [], records: records || { v: 1, records: {} }, calls: { move: 0, chomp: 0, eits: 0, death: 0, bump: 0, win: 0 } };
  const sounds = { playMove: () => w.calls.move++, playChomp: () => w.calls.chomp++, playEits: () => w.calls.eits++, playDeath: () => w.calls.death++, playBump: () => w.calls.bump++, playWin: () => w.calls.win++, playLocked: noop, playDeliver: noop };
  const io = { load: () => w.records, save: (r) => { w.saves.push(r); w.records = r; } };
  let hook;
  w.eng = createRogueliteGame({ canvas, sounds, onUpdate: p => w.emits.push(p), seed, now: () => w.t, raf: cb => { w.raf.push(cb); return 1; }, caf: () => { w.raf = []; }, io, config, reviveIO, wallNow, inspect: h => { hook = h; } });
  w.x = hook;
  if (speed) w.eng.setSpeedPref(speed);
  w.advance = (ms) => { const end = w.t + ms; while (w.t < end) { w.t = Math.min(end, w.t + 16); const q = w.raf; w.raf = []; q.forEach(cb => cb(w.t)); } };
  w.last = (key) => { for (let i = w.emits.length - 1; i >= 0; i--) if (key in w.emits[i]) return w.emits[i][key]; };
  w.overlays = (phase) => w.emits.filter(e => e.overlay && e.overlay.phase === phase);
  w.D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };
  return w;
}

export const terrSim = await load('territory/sim.mjs');
export const { createTerritoryGame } = await load('territory/controller.mjs');

// Dunia palsu Territory: jam & RAF palsu, rekor di memori, suara dihitung.
export function makeTerritoryWorld({ speed, records, config } = {}) {
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, p) => (p === 'createRadialGradient' ? () => ({ addColorStop: noop }) : (p in t ? t[p] : noop)), set: (t, p, v) => { t[p] = v; return true; } });
  const canvas = { width: 680, height: 600, getContext: () => ctx };
  const w = { t: 1000, raf: [], emits: [], saves: [], records: records || { v: 1, records: {} }, calls: { move: 0, chomp: 0, eits: 0, death: 0, bump: 0, win: 0 } };
  const sounds = { playMove: () => w.calls.move++, playChomp: () => w.calls.chomp++, playEits: () => w.calls.eits++, playDeath: () => w.calls.death++, playBump: () => w.calls.bump++, playWin: () => w.calls.win++ };
  const io = { load: () => w.records, save: (r) => { w.saves.push(r); w.records = r; } };
  w.eng = createTerritoryGame({ canvas, sounds, onUpdate: p => w.emits.push(p), now: () => w.t, raf: cb => { w.raf.push(cb); return 1; }, caf: () => { w.raf = []; }, io, config });
  if (speed) w.eng.setSpeedPref(speed);
  w.advance = (ms) => { const end = w.t + ms; while (w.t < end) { w.t = Math.min(end, w.t + 16); const q = w.raf; w.raf = []; q.forEach(cb => cb(w.t)); } };
  w.last = (key) => { for (let i = w.emits.length - 1; i >= 0; i--) if (key in w.emits[i]) return w.emits[i][key]; };
  w.overlays = (phase) => w.emits.filter(e => e.overlay && e.overlay.phase === phase);
  return w;
}

export const bossSim = await load('boss/sim.mjs');
export const { createBossGame } = await load('boss/controller.mjs');

// Dunia palsu Boss: jam & RAF palsu, rekor di memori, RNG ber-seed.
export function makeBossWorld({ seed = 1, speed, records, config } = {}) {
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, p) => (p === 'createRadialGradient' ? () => ({ addColorStop: noop }) : (p in t ? t[p] : noop)), set: (t, p, v) => { t[p] = v; return true; } });
  const canvas = { width: 680, height: 600, getContext: () => ctx };
  const w = { t: 1000, raf: [], emits: [], saves: [], records: records || { v: 1, records: {} }, calls: { move: 0, chomp: 0, eits: 0, death: 0, win: 0 }, h: null };
  const sounds = { playMove: () => w.calls.move++, playChomp: () => w.calls.chomp++, playEits: () => w.calls.eits++, playDeath: () => w.calls.death++, playWin: () => w.calls.win++ };
  const io = { load: () => w.records, save: (r) => { w.saves.push(r); w.records = r; } };
  w.eng = createBossGame({ canvas, sounds, onUpdate: p => w.emits.push(p), rng: createRng(seed), now: () => w.t, raf: cb => { w.raf.push(cb); return 1; }, caf: () => { w.raf = []; }, io, config, inspect: h => { w.h = h; } });
  if (speed) w.eng.setSpeedPref(speed);
  w.advance = (ms) => { const end = w.t + ms; while (w.t < end) { w.t = Math.min(end, w.t + 16); const q = w.raf; w.raf = []; q.forEach(cb => cb(w.t)); } };
  w.last = (key) => { for (let i = w.emits.length - 1; i >= 0; i--) if (key in w.emits[i]) return w.emits[i][key]; };
  w.overlays = (phase) => w.emits.filter(e => e.overlay && e.overlay.phase === phase);
  return w;
}

export const revives = await load('roguelite/revives.mjs');
