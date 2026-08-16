import { DAILY_REWARDS } from "../data/dailyRewards";
import type { DailyRewardDef } from "../types";
import { SaveManager } from "./SaveManager";
import { EconomyManager } from "./EconomyManager";
import { LootManager } from "./LootManager";
import { MockAnalyticsService } from "../services/AnalyticsService";
import { emitEvent } from "../utils/events";
import { todayKey, computeDailyClaim } from "./dailyLogic";
export class DailyRewardsManager {
  private save: SaveManager;
  private economy: EconomyManager;
  private loot: LootManager;
  private analytics: MockAnalyticsService;

  private constructor(
    save: SaveManager,
    economy: EconomyManager,
    loot: LootManager,
    analytics: MockAnalyticsService
  ) {
    this.save = save;
    this.economy = economy;
    this.loot = loot;
    this.analytics = analytics;
  }

  static create(
    save: SaveManager,
    economy: EconomyManager,
    loot: LootManager,
    analytics: MockAnalyticsService
  ): DailyRewardsManager {
    return new DailyRewardsManager(save, economy, loot, analytics);
  }

  /** Day of the 7-day cycle the player is currently on (1..7). */
  dayNumber(): number {
    return 1 + (this.save.get().daily.streak % 7);
  }

  alreadyClaimedToday(): boolean {
    return this.save.get().daily.lastClaimDay === todayKey();
  }

  canClaim(): boolean {
    return !this.alreadyClaimedToday();
  }

  claim(): DailyRewardDef | null {
    const daily = this.save.get().daily;
    const today = todayKey();
    const outcome = computeDailyClaim(daily, today);
    if (outcome.alreadyClaimed) {
      return null;
    }
    const def = DAILY_REWARDS[outcome.rewardIndex];
    if (!def) {
      return null;
    }
    this.grant(def);
    daily.streak = outcome.nextStreak;
    daily.lastClaimDay = today;
    this.save.save();
    this.analytics.track("daily_claimed", { day: def.day });
    emitEvent("daily-claimed", { day: def.day });
    return def;
  }

  private grant(def: DailyRewardDef): void {
    if (def.type === "coins" && def.amount) {
      this.economy.addCoins(def.amount);
    } else if (def.type === "gems" && def.amount) {
      this.economy.addGems(def.amount);
    } else if (def.type === "chest" && def.chest) {
      const loot = this.loot.rollChest(def.chest);
      if (loot.coins > 0) {
        this.economy.addCoins(loot.coins);
      }
      if (loot.gems > 0) {
        this.economy.addGems(loot.gems);
      }
    }
  }
}