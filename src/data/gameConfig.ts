import type { BuildingId } from "../types";

// Central game balance configuration.
export const GAME = {
  width: 720,
  height: 1280,
  worldWidth: 900,
  worldHeight: 1600,
  runDuration: 300,
  bossAt: 300,
  player: {
    maxHealth: 100,
    speed: 230,
    damage: 12,
    fireRate: 1.4,
    projSpeed: 520,
    range: 300,
    critChance: 0.05,
    critMult: 1.6,
    magnet: 90,
    regen: 0,
  },
  xpToNext(level: number): number {
    return Math.round(10 * Math.pow(1.16, level - 1));
  },
  accountXpToNext(level: number): number {
    return Math.round(100 * Math.pow(1.25, level - 1));
  },
  waves: {
    startInterval: 1.4,
    endInterval: 0.55,
    maxEnemies: 40,
    eliteChance: 0.08,
    bossIncomingSeconds: 8,
  },
  boss: {
    // Base boss stats; multiplied by the active difficulty tier.
    health: 5500,
    damage: 16,
    speed: 95,
  },
  runRewards: {
    victoryCoins: 100,
    defeatCoins: 15,
    victoryXp: 60,
    defeatXp: 20,
    accountXpPerKill: 2,
    accountXpPerSecond: 1,
    accountXpPerBoss: 40,
    accountLevelUpGems: 10,
  },
  chests: {
    eliteChestChance: 0.22,
    bossChest: "GOLD" as const,
    bossChestMythicChance: 0.25,
  },
  eggs: {
    bossEggChance: 0.12,
    creatureMaxLevel: 5,
  },
};

export interface BuildingConfig {
  id: BuildingId;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  bonus: number;
  bonusType: "maxHealthFlat" | "damagePct" | "xpPct" | "coinPct";
}

export const BUILDINGS: Record<BuildingId, BuildingConfig> = {
  treeOfLife: {
    id: "treeOfLife",
    name: "Tree of Life",
    emoji: "🌳",
    description: "Adds max health to every expedition.",
    baseCost: 50,
    costGrowth: 1.7,
    bonus: 5,
    bonusType: "maxHealthFlat",
  },
  forge: {
    id: "forge",
    name: "Forge",
    emoji: "⚒️",
    description: "Increases damage in every expedition.",
    baseCost: 60,
    costGrowth: 1.7,
    bonus: 0.05,
    bonusType: "damagePct",
  },
  hatchery: {
    id: "hatchery",
    name: "Hatchery",
    emoji: "🥚",
    description: "Increases XP gained during runs.",
    baseCost: 60,
    costGrowth: 1.7,
    bonus: 0.05,
    bonusType: "xpPct",
  },
  portal: {
    id: "portal",
    name: "Portal",
    emoji: "🌀",
    description: "Increases coins earned during runs.",
    baseCost: 80,
    costGrowth: 1.7,
    bonus: 0.05,
    bonusType: "coinPct",
  },
};

export function buildingCost(bId: BuildingId, currentLevel: number): number {
  const def = BUILDINGS[bId];
  if (!def) {
    console.warn("[config] unknown building id:", bId);
    return 0;
  }
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}
