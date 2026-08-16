// ============================================================
// Cloud save abstraction. Local implementation simulates the server
// (localStorage). Swap for a Supabase-backed implementation later
// without touching game code.
// ============================================================

export interface CloudSaveService {
  isAvailable(): boolean;
  load(): Promise<unknown | null>;
  save(data: unknown): Promise<void>;
  getPlayerId(): string;
}

export class LocalCloudSaveService implements CloudSaveService {
  private readonly playerId: string;
  private readonly key = "lumi_cloud_save";

  constructor() {
    this.playerId = "plr-" + Math.random().toString(36).slice(2, 10);
  }

  isAvailable(): boolean {
    return true;
  }

  async load(): Promise<unknown | null> {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { data: unknown };
      return parsed.data ?? null;
    } catch (err) {
      console.warn("[cloud] load failed", err);
      return null;
    }
  }

  async save(data: unknown): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch (err) {
      console.warn("[cloud] save failed", err);
    }
  }

  getPlayerId(): string {
    return this.playerId;
  }
}
