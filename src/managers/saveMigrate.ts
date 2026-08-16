import type { SaveData } from "../types";

export const SAVE_VERSION = 2;

export function defaultSave(): SaveData {
  return {
    saveVersion: SAVE_VERSION,
    account: { level: 1, xp: 0 },
    currency: { coins: 0, gems: 0 },
    creatures: [],
    sanctuary: { treeOfLife: 0, forge: 0, hatchery: 0, portal: 0 },
    missions: { claimed: [] },
    settings: { sfx: true, music: true, shake: true },
    statistics: { totalKills: 0, totalRuns: 0, bestTime: 0, totalCoins: 0, totalBosses: 0, totalChests: 0 },
    daily: { lastClaimDay: "", streak: 0 },
  };
}

// Pure save migration (testable without Phaser). Each version upgrade is
// applied in sequence; unknown/missing fields fall back to defaults.
export function migrateSave(raw: Partial<SaveData>): SaveData {
  const base = defaultSave();
  const merged: SaveData = {
    ...base,
    ...raw,
    account: { ...base.account, ...(raw.account ?? {}) },
    currency: { ...base.currency, ...(raw.currency ?? {}) },
    creatures: raw.creatures ?? [],
    sanctuary: { ...base.sanctuary, ...(raw.sanctuary ?? {}) },
    missions: { ...base.missions, ...(raw.missions ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    statistics: { ...base.statistics, ...(raw.statistics ?? {}) },
    daily: { ...base.daily, ...(raw.daily ?? {}) },
  };

  // v1 -> v2: lastClaimDay was a number; now it is a YYYY-MM-DD string.
  if (typeof merged.daily.lastClaimDay !== "string") {
    merged.daily.lastClaimDay = "";
  }
  if (typeof merged.daily.streak !== "number") {
    merged.daily.streak = 0;
  }
  merged.saveVersion = SAVE_VERSION;
  return merged;
}
