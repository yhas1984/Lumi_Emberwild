import { describe, expect, it } from "vitest";
import { ABILITIES, abilityValue, abilityDesc, isAbilityMaxed, ABILITY_MAX_LEVEL } from "../abilities";
import { ENEMIES, enemyHpScale, waveMixFor } from "../enemies";
import { CREATURE_LIST } from "../creatures";
import { MISSIONS } from "../missions";
import { DAILY_REWARDS } from "../dailyRewards";
import { CHEST_LOOT } from "../lootTables";
import { BUILDINGS, buildingCost, GAME } from "../gameConfig";
import type { BuildingId, ChestType, EnemyId } from "../../types";

describe("abilities", () => {
  it("every ability has exactly 5 levels per stat", () => {
    for (const def of Object.values(ABILITIES)) {
      for (const arr of Object.values(def.values)) {
        expect(arr).toHaveLength(5);
      }
    }
  });

  it("abilityValue clamps out-of-range levels", () => {
    expect(abilityValue(ABILITIES.fireOrb, "damage", 9)).toBe(abilityValue(ABILITIES.fireOrb, "damage", 5));
    expect(abilityValue(ABILITIES.fireOrb, "damage", 0)).toBe(abilityValue(ABILITIES.fireOrb, "damage", 1));
  });

  it("description renders placeholders", () => {
    expect(abilityDesc(ABILITIES.fireOrb, 1)).toContain("1");
    expect(abilityDesc(ABILITIES.chainLightning, 2)).toContain("3");
  });

  it("max level constants", () => {
    expect(ABILITY_MAX_LEVEL).toBe(5);
    expect(isAbilityMaxed("fireOrb", 5)).toBe(true);
    expect(isAbilityMaxed("fireOrb", 4)).toBe(false);
  });
});

describe("enemies", () => {
  it("definitions exist for all ids", () => {
    const ids: EnemyId[] = ["slime", "bat", "spider", "wolf", "spitter", "mimic"];
    for (const key of ids) {
      expect(ENEMIES[key]).toBeDefined();
    }
  });

  it("hp scaling grows with minutes", () => {
    expect(enemyHpScale(2)).toBeGreaterThan(enemyHpScale(0));
  });

  it("wave mix always has positive weights", () => {
    for (let m = 0; m < 5; m++) {
      const mix = waveMixFor(m);
      const total = Object.values(mix).reduce((s, v) => s + v, 0);
      expect(total).toBeGreaterThan(0);
    }
  });
});

describe("creatures", () => {
  it("covers all five rarities", () => {
    const rarities = new Set(CREATURE_LIST.map((c) => c.rarity));
    expect(rarities.size).toBe(5);
  });

  it("definitions have passive bonuses", () => {
    for (const c of CREATURE_LIST) {
      expect(c.passiveBonus.value).toBeGreaterThan(0);
      expect(c.passiveBonus.stat.length).toBeGreaterThan(0);
    }
  });
});

describe("missions", () => {
  it("all missions have valid goals and stats", () => {
    const stats = ["totalKills", "bestTime", "totalChests", "totalBosses", "totalCoins", "totalRuns"];
    for (const m of MISSIONS) {
      expect(m.goal).toBeGreaterThan(0);
      expect(stats).toContain(m.stat);
    }
  });
});

describe("daily rewards", () => {
  it("has seven days 1..7", () => {
    expect(DAILY_REWARDS).toHaveLength(7);
    DAILY_REWARDS.forEach((d, i) => expect(d.day).toBe(i + 1));
  });
});

describe("loot tables", () => {
  it("has all chest types with positive weights", () => {
    const types: ChestType[] = ["WOODEN", "SILVER", "GOLD", "MYTHIC"];
    for (const type of types) {
      expect(CHEST_LOOT[type]).toBeDefined();
      for (const entry of CHEST_LOOT[type]) {
        expect(entry.weight).toBeGreaterThan(0);
        expect(entry.max).toBeGreaterThanOrEqual(entry.min);
      }
    }
  });
});

describe("game config", () => {
  it("buildingCost grows with level", () => {
    const base = buildingCost("treeOfLife", 0);
    const next = buildingCost("treeOfLife", 1);
    expect(next).toBeGreaterThan(base);
  });

  it("xp curve grows", () => {
    expect(GAME.xpToNext(3)).toBeGreaterThan(GAME.xpToNext(1));
  });

  it("all four buildings defined", () => {
    const ids: BuildingId[] = ["treeOfLife", "forge", "hatchery", "portal"];
    for (const key of ids) {
      expect(BUILDINGS[key]).toBeDefined();
    }
  });
});