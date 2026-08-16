import type { MissionDef } from "../types";
import { MISSIONS } from "../data/missions";
import { SaveManager } from "./SaveManager";
import { EconomyManager } from "./EconomyManager";
import { MockAnalyticsService } from "../services/AnalyticsService";
import { emitEvent } from "../utils/events";

// Data-driven missions. Progress derives from lifetime statistics;
// claiming grants the reward once and marks the id as claimed.
export class MissionManager {
  private save: SaveManager;
  private economy: EconomyManager;
  private analytics: MockAnalyticsService;

  private constructor(save: SaveManager, economy: EconomyManager, analytics: MockAnalyticsService) {
    this.save = save;
    this.economy = economy;
    this.analytics = analytics;
  }

  static create(save: SaveManager, economy: EconomyManager, analytics: MockAnalyticsService): MissionManager {
    return new MissionManager(save, economy, analytics);
  }

  getDefinitions(): MissionDef[] {
    return MISSIONS;
  }

  statValue(def: MissionDef): number {
    return this.save.get().statistics[def.stat];
  }

  progressOf(def: MissionDef): number {
    return Math.min(1, this.statValue(def) / def.goal);
  }

  isClaimed(id: string): boolean {
    return this.save.get().missions.claimed.includes(id);
  }

  canClaim(def: MissionDef): boolean {
    return this.progressOf(def) >= 1 && !this.isClaimed(def.id);
  }

  claim(def: MissionDef): boolean {
    if (!this.canClaim(def)) {
      return false;
    }
    this.save.update((d) => {
      d.missions.claimed.push(def.id);
    });
    const reward = def.reward;
    if (reward.coins) {
      this.economy.addCoins(reward.coins);
    }
    if (reward.gems) {
      this.economy.addGems(reward.gems);
    }
    this.analytics.track("mission_claimed", { mission: def.id });
    emitEvent("mission-claimed", { missionId: def.id });
    return true;
  }
}
