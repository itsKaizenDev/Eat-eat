import { LEVELS } from './levels';
import { CAMPAIGN_SPECS, CAMPAIGN_VARIANTS } from './campaignData';
export { CAMPAIGN_SPECS, CAMPAIGN_VARIANTS };
export const CAMPAIGN_SEED = 0;
import { bossLevel } from './generator';
export const BOSS_LEVEL = bossLevel();
export const CAMPAIGN_LEVELS = [...LEVELS, ...CAMPAIGN_SPECS, BOSS_LEVEL];
export const CAMPAIGN_REJECTED = [];
