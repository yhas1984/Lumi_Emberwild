import type { DifficultyId } from "../types";

// Progressive difficulty tiers. Each victory unlocks (and auto-selects)
// the next tier; the player can step back down in the main menu.
export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  emoji: string;
  color: string;
  /** Multipliers applied to enemy stats at spawn time. */
  enemyHp: number;
  enemyDmg: number;
  /** 1 = base cadence; lower = more frequent spawns. */
  spawnInterval: number;
  /** Extra elite chance (added to the base). */
  eliteChanceAdd: number;
  /** Multipliers applied to the Ancient Golem. */
  bossHp: number;
  bossDmg: number;
  /** Run reward multipliers (coins and account XP). */
  rewardMult: number;
  xpMult: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "normal",
    name: "Normal",
    emoji: "🌱",
    color: "#69db7c",
    enemyHp: 1,
    enemyDmg: 1,
    spawnInterval: 1,
    eliteChanceAdd: 0,
    bossHp: 1,
    bossDmg: 1,
    rewardMult: 1,
    xpMult: 1,
  },
  {
    id: "hard",
    name: "Difícil",
    emoji: "🔥",
    color: "#ffb02e",
    enemyHp: 1.5,
    enemyDmg: 1.25,
    spawnInterval: 0.85,
    eliteChanceAdd: 0.04,
    bossHp: 2.2,
    bossDmg: 1.3,
    rewardMult: 1.3,
    xpMult: 1.25,
  },
  {
    id: "nightmare",
    name: "Pesadilla",
    emoji: "🌑",
    color: "#a45cff",
    enemyHp: 2.2,
    enemyDmg: 1.6,
    spawnInterval: 0.72,
    eliteChanceAdd: 0.08,
    bossHp: 3.6,
    bossDmg: 1.7,
    rewardMult: 1.7,
    xpMult: 1.6,
  },
  {
    id: "infernal",
    name: "Infernal",
    emoji: "💀",
    color: "#ff4d6d",
    enemyHp: 3.2,
    enemyDmg: 2.1,
    spawnInterval: 0.6,
    eliteChanceAdd: 0.12,
    bossHp: 5.5,
    bossDmg: 2.2,
    rewardMult: 2.2,
    xpMult: 2,
  },
];

const DEFAULT = DIFFICULTIES[0];

/** Resolves a difficulty id defensively: unknown ids fall back to Normal. */
export function difficultyById(id: string): DifficultyDef {
  const found = DIFFICULTIES.find((d) => d.id === id);
  return found ?? DEFAULT;
}

/** The tier right after the given one, or null when the hardest is active. */
export function nextDifficulty(current: DifficultyDef): DifficultyDef | null {
  const idx = DIFFICULTIES.findIndex((d) => d.id === current.id);
  if (idx < 0 || idx >= DIFFICULTIES.length - 1) {
    return null;
  }
  return DIFFICULTIES[idx + 1];
}
