import type { ChestLootResult, ChestType } from "../types";
import { CHEST_LOOT } from "../data/lootTables";
import { chance, randInt } from "../utils/rng";

// All chest/random loot rolls go through here. Transparent RNG rules:
// each entry has a weight (0-100 inclusion chance) and min/max amounts.
export class LootManager {
  rollChest(chest: ChestType): ChestLootResult {
    const result: ChestLootResult = { coins: 0, gems: 0, egg: false };
    const entries = CHEST_LOOT[chest];
    for (const entry of entries) {
      if (entry.type === "coins" && chance(entry.weight / 100)) {
        result.coins += randInt(entry.min, entry.max);
      } else if (entry.type === "gems" && chance(entry.weight / 100)) {
        result.gems += randInt(entry.min, entry.max);
      } else if (entry.type === "egg" && chance(entry.weight / 100)) {
        result.egg = true; // consumed by the creature system in Phase 2
      }
    }
    return result;
  }
}
