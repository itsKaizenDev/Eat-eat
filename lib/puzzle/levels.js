import { CAMPAIGN_VARIANTS } from './campaignData';
export const RAW_LEVELS = CAMPAIGN_VARIANTS.slice(0, 5).map(variants => variants[0]);
// Validation lives in validation.js and runs in build:campaign and the test suite.
export const LEVELS = RAW_LEVELS;
export const REJECTED_LEVELS = [];
