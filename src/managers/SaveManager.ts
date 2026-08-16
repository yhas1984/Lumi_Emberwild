import type { SaveData } from "../types";
import { emitEvent } from "../utils/events";
import type { CloudSaveService } from "../services/CloudSaveService";

const SAVE_KEY = "lumi_wild_realms_save";
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

export class SaveManager {
  private data: SaveData = defaultSave();
  private cloud: CloudSaveService | null = null;

  attachCloud(cloud: CloudSaveService): void {
    this.cloud = cloud;
  }

  /** Loads the remote save only when there is no local save (first device). */
  async loadFromCloudIfEmpty(): Promise<boolean> {
    if (!this.cloud) {
      return false;
    }
    try {
      const local = localStorage.getItem(SAVE_KEY);
      if (local) {
        return false;
      }
      const remote = await this.cloud.load();
      if (remote) {
        this.data = this.migrate(remote as Partial<SaveData>);
        this.save();
        console.info("[cloud] restored remote save");
        return true;
      }
    } catch (err) {
      console.warn("[cloud] restore failed", err);
    }
    return false;
  }

  load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        this.data = defaultSave();
        return this.data;
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      this.data = this.migrate(parsed);
    } catch (err) {
      console.warn("[save] corrupt save data, using defaults", err);
      this.data = defaultSave();
    }
    return this.data;
  }

  // Migrations: each version upgrade is applied in sequence.
  private migrate(raw: Partial<SaveData>): SaveData {
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

  get(): SaveData {
    return this.data;
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      emitEvent("save-changed", {});
    } catch (err) {
      console.warn("[save] could not persist", err);
    }
    // Mirror to the cloud service (fire and forget).
    if (this.cloud) {
      this.cloud.save(this.data).catch(() => {});
    }
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }

  update(fn: (data: SaveData) => void): void {
    fn(this.data);
    this.save();
  }
}