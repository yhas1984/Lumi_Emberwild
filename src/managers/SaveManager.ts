import type { SaveData } from "../types";
import { emitEvent } from "../utils/events";
import type { CloudSaveService } from "../services/CloudSaveService";
import { SAVE_VERSION, defaultSave, migrateSave } from "./saveMigrate";

export { SAVE_VERSION, defaultSave } from "./saveMigrate";

const SAVE_KEY = "lumi_wild_realms_save";

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
        this.data = migrateSave(remote as Partial<SaveData>);
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
      this.data = migrateSave(parsed);
    } catch (err) {
      console.warn("[save] corrupt save data, using defaults", err);
      this.data = defaultSave();
    }
    return this.data;
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