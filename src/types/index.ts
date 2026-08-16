// ============================================================
// Lumi: Wild Realms - shared game types
// ============================================================

export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

export type AbilityId =
  | "fireOrb"
  | "chainLightning"
  | "windBlades"
  | "iceAura"
  | "multiShot"
  | "attackSpeed"
  | "moveSpeed"
  | "critChance"
  | "healing"
  | "magnet";

export type EnemyId = "slime" | "bat" | "spider" | "wolf" | "spitter" | "mimic";

export type BuildingId = "treeOfLife" | "forge" | "hatchery" | "portal";

export type ChestType = "WOODEN" | "SILVER" | "GOLD" | "MYTHIC";

export type LootType = "coins" | "gems" | "egg";

export type MissionStat = "totalKills" | "bestTime" | "totalChests" | "totalBosses" | "totalCoins" | "totalRuns";

export interface AbilityDef {
  id: AbilityId;
  name: string;
  emoji: string;
  color: number;
  rarity: Rarity;
  /** Per-level values keyed by stat name (index 0 = level 1). */
  values: Record<string, number[]>;
  /** Description template with {stat} placeholders. */
  desc: string;
}

export interface AbilityInstance {
  id: AbilityId;
  level: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  color: number;
  radius: number;
  health: number;
  damage: number;
  speed: number;
  xpReward: number;
  behavior: "chase" | "sine" | "burst" | "ranged";
  coins: [number, number];
}

export interface CreatureDef {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  description: string;
  passiveBonus: { stat: string; value: number };
}

export interface CreatureInstance {
  defId: string;
  level: number;
  obtainedAt: number;
}

export interface LootTableEntry {
  type: LootType;
  min: number;
  max: number;
  weight: number;
}

export interface ChestLootResult {
  coins: number;
  gems: number;
  egg: boolean;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  costGrowth: number;
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  goal: number;
  stat: MissionStat;
  reward: { coins?: number; gems?: number };
}

export interface DailyRewardDef {
  day: number;
  type: "coins" | "gems" | "chest";
  amount?: number;
  chest?: ChestType;
}

export interface ShopItemDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  costGems: number;
  kind: "egg" | "coins";
  amount?: number;
}

export interface SaveData {
  saveVersion: number;
  account: { level: number; xp: number };
  currency: { coins: number; gems: number };
  creatures: CreatureInstance[];
  sanctuary: Record<BuildingId, number>;
  missions: { claimed: string[] };
  settings: { sfx: boolean; music: boolean; shake: boolean };
  statistics: {
    totalKills: number;
    totalRuns: number;
    bestTime: number;
    totalCoins: number;
    totalBosses: number;
    totalChests: number;
  };
  daily: { lastClaimDay: string; streak: number };
}

export interface RunResult {
  victory: boolean;
  time: number;
  kills: number;
  coinsEarned: number;
  level: number;
  eggs: number;
}

export interface PlayerStats {
  maxHealth: number;
  health: number;
  speed: number;
  damage: number;
  fireRate: number;
  projSpeed: number;
  range: number;
  critChance: number;
  critMult: number;
  magnet: number;
  regen: number;
  coinGain: number;
  xpGain: number;
}

export interface GameEvents {
  "player-health": { current: number; max: number };
  "player-xp": { level: number; xp: number; toNext: number };
  "run-timer": { seconds: number; total: number };
  "enemy-killed": { enemyId: EnemyId; elite: boolean; x: number; y: number };
  "level-up": { level: number };
  "ability-selected": { abilityId: AbilityId; level: number };
  "boss-start": Record<string, never>;
  "boss-health": { current: number; max: number };
  "boss-defeated": Record<string, never>;
  "run-ended": RunResult;
  "chest-opened": { chest: ChestType };
  "economy-changed": { coins: number; gems: number };
  "save-changed": Record<string, never>;
  "audio-unlocked": Record<string, never>;
  "creature-obtained": { creatureId: string; level: number };
  "mission-claimed": { missionId: string };
  "daily-claimed": { day: number };
  "revive-result": { accepted: boolean };
  "debug-level-up": Record<string, never>;
  "debug-spawn-boss": Record<string, never>;
  "debug-spawn-chest": Record<string, never>;
  "shell-visible": { visible: boolean };
  "screen-change": { screen: string | null };
  "debug-panel-toggle": Record<string, never>;
}