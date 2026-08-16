import type { CreatureDef, CreatureInstance, Rarity } from "../types";
import { CREATURES, CREATURE_LIST } from "../data/creatures";
import { GAME } from "../data/gameConfig";
import { rollRarity } from "../utils/rarity";
import { pick } from "../utils/rng";
import { emitEvent } from "../utils/events";
import { SaveManager } from "./SaveManager";
import { MockAnalyticsService } from "../services/AnalyticsService";

export interface HatchResult {
  defId: string;
  level: number;
  isNew: boolean;
}

// Creature collection: hatching, adding, and passive bonus aggregation.
export class CreatureManager {
  private save: SaveManager;
  private analytics: MockAnalyticsService;

  private constructor(save: SaveManager, analytics: MockAnalyticsService) {
    this.save = save;
    this.analytics = analytics;
  }

  static create(save: SaveManager, analytics: MockAnalyticsService): CreatureManager {
    return new CreatureManager(save, analytics);
  }

  getOwned(): CreatureInstance[] {
    return this.save.get().creatures.slice();
  }

  count(): number {
    return this.save.get().creatures.length;
  }

  getDef(defId: string): CreatureDef | null {
    return CREATURES[defId] ?? null;
  }

  has(defId: string): boolean {
    return this.save.get().creatures.some((c) => c.defId === defId);
  }

  // Rolls a creature id using the central rarity distribution.
  rollCreatureId(): string {
    const rarity = rollRarity();
    const order: Rarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
    let pool = CREATURE_LIST.filter((c) => c.rarity === rarity);
    if (pool.length === 0) {
      const idx = order.indexOf(rarity);
      for (let i = idx - 1; i >= 0; i--) {
        pool = CREATURE_LIST.filter((c) => c.rarity === order[i]);
        if (pool.length > 0) {
          break;
        }
      }
    }
    if (pool.length === 0) {
      pool = CREATURE_LIST;
    }
    return pick(pool).id;
  }

  // Adds a creature (or levels it up if already owned). Persists immediately.
  addCreature(defId: string): HatchResult {
    const maxLevel = GAME.eggs.creatureMaxLevel;
    const creatures = this.save.get().creatures;
    const existing = creatures.find((c) => c.defId === defId);
    let level: number;
    let isNew = false;
    if (existing) {
      level = Math.min(existing.level + 1, maxLevel);
      existing.level = level;
    } else {
      isNew = true;
      level = 1;
      creatures.push({ defId, level, obtainedAt: Date.now() });
    }
    this.save.save();
    this.analytics.track("creature_obtained", { creature: defId, level });
    emitEvent("creature-obtained", { creatureId: defId, level });
    return { defId, level, isNew };
  }

  hatchEgg(): HatchResult {
    return this.addCreature(this.rollCreatureId());
  }

  // Aggregates passive bonuses: stat -> total (value * level summed).
  passiveBonuses(): Map<string, number> {
    const totals = new Map<string, number>();
    for (const inst of this.save.get().creatures) {
      const def = CREATURES[inst.defId];
      if (!def) {
        continue;
      }
      const key = def.passiveBonus.stat;
      totals.set(key, (totals.get(key) ?? 0) + def.passiveBonus.value * inst.level);
    }
    return totals;
  }
}
