// Membuat lib/puzzle/campaignData.js (level 6..50) dari generator dengan seed kampanye tetap.
// Jalankan: node scripts/build-campaign.mjs   (test `kampanye: data ... identik dengan keluaran generator` menjaga agar data tidak basi)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Catatan: bila campaignData.js belum ada, buat dulu berisi `export const CAMPAIGN_SPECS = [];` lalu jalankan skrip ini.
import { generator, campaign } from '../tests/helpers/env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { getLevel, TIERS, tierOf, MAX_LEVEL, TUTORIAL_COUNT } = generator;
const INTRO = {
  portal: 'Baru: Portal. Masuk satu ujung, kepalamu muncul di ujung pasangannya (angka dan jumlah cincin sama).',
  duri: 'Baru: Duri dan tembok retak. Duri hanya bisa dilewati dengan Perisai (S), tembok retak dengan Palu (P). Keduanya sekali pakai.',
  gerbang: 'Baru: Tuas. Injak tuas kuningan untuk membuka gerbang permanen. Tidak ada hitungan genap/ganjil.',
  penjaga: 'Baru: Dungeon dijaga musuh. Tiga hati; tekan arah ke musuh untuk menyerang. Hindari petak serangan yang ditandai. Slime 1 HP, penjaga 2 HP.',
};
const specs = [];
for (let n = TUTORIAL_COUNT + 1; n <= MAX_LEVEL; n++) {
  const g = getLevel(n, campaign.CAMPAIGN_SEED);
  if (g.fallback) throw new Error(`level ${n} jatuh ke cadangan; ubah seed/generator`);
  const t = tierOf(n);
  const s = g.spec;
  specs.push({
    id: `gen-${n}`, name: s.name, tier: t.name, intro: n === t.from && t.intro ? INTRO[t.intro] : null,
    goal: s.goal, par: g.par, map: s.map, snake: s.snake, dir: s.dir, exit: s.exit, guards: s.guards || [], links: s.links || [],
  });
}
const body = `// DIBUAT OTOMATIS oleh scripts/build-campaign.mjs dari generator (seed kampanye tetap). Jangan diedit tangan.\n// Level 6..50 "Jejak Kunci". Generator dijalankan di luar runtime karena butuh sampai ~1,5 dtk per level.\nexport const CAMPAIGN_SPECS = ${JSON.stringify(specs, null, 1).replace(/\n\s+/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']')};\n`;
fs.writeFileSync(path.join(root, 'lib/puzzle/campaignData.js'), body);
console.log('ditulis', specs.length, 'level,', body.length, 'byte');
