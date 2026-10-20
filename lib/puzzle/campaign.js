// Kampanye "Dungeon": level 1..5 = tutorial buatan tangan (levels.js), level 6..50 = buatan sistem (campaignData.js).
// Seed kampanye TETAP supaya id level (dan progres tersimpan) stabil antar sesi dan antar pemain.
import { RAW_LEVELS, loadLevels } from './levels';
import { CAMPAIGN_SPECS } from './campaignData';

export { CAMPAIGN_SPECS };
export const CAMPAIGN_SEED = 0;

const tutorialSpecs = RAW_LEVELS.map(s => ({ ...s, tier: 'Tutorial', intro: null }));
const loaded = loadLevels([...tutorialSpecs, ...CAMPAIGN_SPECS]);
// Metadata tampilan (tier, kartu pengantar, tutorial?) ditempel ke objek level hasil build.
const metaById = Object.fromEntries([...tutorialSpecs, ...CAMPAIGN_SPECS].map((s, i) => [s.id, { tier: s.tier, intro: s.intro || null, tutorial: i < tutorialSpecs.length, revision: 4 }]));
export const CAMPAIGN_LEVELS = loaded.levels.map(l => ({ ...l, ...metaById[l.id] }));
export const CAMPAIGN_REJECTED = loaded.rejected;
