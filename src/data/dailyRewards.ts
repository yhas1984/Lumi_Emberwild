import type { DailyRewardDef } from "../types";

// Seven-day login reward calendar (claim flow arrives in Phase 2).
export const DAILY_REWARDS: DailyRewardDef[] = [
  { day: 1, type: "coins", amount: 50 },
  { day: 2, type: "coins", amount: 75 },
  { day: 3, type: "chest", chest: "WOODEN" },
  { day: 4, type: "coins", amount: 100 },
  { day: 5, type: "gems", amount: 5 },
  { day: 6, type: "chest", chest: "SILVER" },
  { day: 7, type: "chest", chest: "GOLD" },
];
