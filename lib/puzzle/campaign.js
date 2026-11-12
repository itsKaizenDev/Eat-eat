import { LEVELS } from './levels';
import { CAMPAIGN_SPECS, CAMPAIGN_VARIANTS } from './campaignData';
import { bossLevel } from './generator';
import { INFERNO_FINAL, INFERNO_REVISION, INFERNO_START } from './inferno-layout';
import { INFERNO_LEVELS } from './inferno-data';

export { CAMPAIGN_SPECS, CAMPAIGN_VARIANTS, INFERNO_LEVELS, INFERNO_START };
export const CAMPAIGN_SEED = 0;
export const BOSS_LEVEL = bossLevel();
export const DUNGEON_MAPS = [...LEVELS, ...CAMPAIGN_SPECS];
export const INFERNO_BOSS = {
  ...bossLevel(), id: 'inferno-99', number: INFERNO_FINAL, chapter: 'inferno', revision: INFERNO_REVISION,
  name: 'Raja Bara', tier: 'Takhta Neraka', shapeLabel: 'Takhta obsidian', par: 540,
  map: [
    '###################', '###.............###', '##......###......##', '#.......###.......#',
    '#...C...###...C...#', '#.................#', '#.................#', '#..C...........C..#',
    '#.................#', '#.................#', '#......C...C......#', '#.................#',
    '#.................#', '#..C...........C..#', '##...............##', '###.............###',
    '###################',
  ],
  torches: [],
  artifacts: [{ id: 'inferno-crown', x: 9.5, y: 1.5, kind: 'artifact', value: 100, locked: 'boss' }],
  boss: {
    profile: 'inferno', x: 9.5, y: 3.5, size: 3.5, zone: { x0: 1, y0: 5, x1: 17, y1: 15 },
    weak: [{ x: 9.5, y: 6.5 }, { x: 5.5, y: 7.5 }, { x: 13.5, y: 7.5 }],
  },
  goal: 'Kalahkan Raja Bara, rebut Mahkota (100 Apple Coin), lalu buka jalan pulang.',
  tip: 'Raja Bara merangkai gelombang lebih cepat. Baca lorong aman tiap gelombang; batu ke resonator sian masih bisa memutus serangan.',
  intro: 'Lima fase Raja Bara. Sela aman berpindah saat belahan api dan beberapa ledakan mengejar posisi terakhirmu.',
};
export const CAMPAIGN_LEVELS = [...DUNGEON_MAPS.slice(0, 49), BOSS_LEVEL, ...INFERNO_LEVELS, INFERNO_BOSS];
export const CAMPAIGN_REJECTED = [];
