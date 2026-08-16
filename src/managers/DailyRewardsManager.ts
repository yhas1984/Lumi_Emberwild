import { DAILY_REWARDS } from "../data/dailyRewards";
import type { DailyRewardDef } from "../types";
import { SaveManager } from "./SaveManager";
import { EconomyManager } from "./EconomyManager";
import { LootManager } from "./LootManager";
import { MockAnalyticsService } from "../services/AnalyticsService";
import { emitEvent } from "../utils/events";

function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function daysBetween(aKey: string, bKey: string): number {
  const a = new Date(aKey + "T00:00:00");
  const b = new Date(bKey + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// Seven-day login calendar with streak protection:
//  - 0 days since last claim  -> already claimed today
//  - 1 day                    -> normal next-day claim
//  - 2 days (1 missed day)    -> grace: chain is preserved, no reset
//  - 3+ days (2+ missed)      -> chain resets to day 1
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
    if (daily.lastClaimDay === today) {
      return null;
    }
    const diff = daily.lastClaimDay === "" ? 99 : daysBetween(daily.lastClaimDay, today);
    if (diff >= 3) {
      daily.streak = 0;
    }
    const def = DAILY_REWARDS[daily.streak % 7];
    if (!def) {
      return null;
    }
    this.grant(def);
    daily.streak += 1;
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
