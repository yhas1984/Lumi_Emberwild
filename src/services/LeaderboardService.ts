// ============================================================
// Leaderboard abstraction. Local implementation persists top runs.
// Swap for a Supabase-backed leaderboard later.
// ============================================================

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  time: number;
  kills: number;
  victory: boolean;
  at: number;
}

export interface LeaderboardService {
  submitScore(entry: Omit<LeaderboardEntry, "playerId" | "displayName" | "at">): Promise<void>;
  getTop(limit?: number): Promise<LeaderboardEntry[]>;
}

export class LocalLeaderboardService implements LeaderboardService {
  private entries: LeaderboardEntry[] = [];
  private readonly key = "lumi_leaderboard";

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        this.entries = JSON.parse(raw) as LeaderboardEntry[];
      }
    } catch (err) {
      console.warn("[leaderboard] load failed", err);
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.entries));
    } catch (err) {
      console.warn("[leaderboard] save failed", err);
    }
  }

  async submitScore(entry: Omit<LeaderboardEntry, "playerId" | "displayName" | "at">): Promise<void> {
    this.entries.push({
      ...entry,
      playerId: "local",
      displayName: "Lumi Explorer",
      at: Date.now(),
    });
    this.entries.sort((a, b) => b.score - a.score);
    this.entries = this.entries.slice(0, 50);
    this.save();
  }

  async getTop(limit = 10): Promise<LeaderboardEntry[]> {
    return this.entries.slice(0, limit);
  }
}

// Shared scoring formula for runs.
export function runScore(time: number, kills: number, victory: boolean): number {
  return Math.round(time * 100 + kills * 5 + (victory ? 5000 : 0));
}
