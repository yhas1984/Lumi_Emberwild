import type { EnemyDef, EnemyId } from "../types";

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  slime: {
    id: "slime",
    name: "Slime",
    color: 0x4ecb6f,
    radius: 20,
    health: 18,
    damage: 8,
    speed: 70,
    xpReward: 3,
    behavior: "chase",
    coins: [1, 2],
  },
  bat: {
    id: "bat",
    name: "Bat",
    color: 0x8b5cf6,
    radius: 15,
    health: 14,
    damage: 6,
    speed: 135,
    xpReward: 2,
    behavior: "sine",
    coins: [1, 2],
  },
  spider: {
    id: "spider",
    name: "Spider",
    color: 0x3c3c4d,
    radius: 17,
    health: 30,
    damage: 10,
    speed: 55,
    xpReward: 5,
    behavior: "chase",
    coins: [1, 3],
  },
  wolf: {
    id: "wolf",
    name: "Wolf",
    color: 0x8b8f9e,
    radius: 21,
    health: 26,
    damage: 14,
    speed: 120,
    xpReward: 6,
    behavior: "burst",
    coins: [2, 3],
  },
};

export const ENEMY_IDS: EnemyId[] = ["slime", "bat", "spider", "wolf"];

export function enemyHpScale(minute: number): number {
  return 1 + 0.18 * minute;
}

export function enemyDmgScale(minute: number): number {
  return 1 + 0.1 * minute;
}

// Enemy mix weights per elapsed minute (index 0 = minute 0..1, last = 4+).
export const WAVE_MIX: Array<Record<EnemyId, number>> = [
  { slime: 5, bat: 3, spider: 1, wolf: 0 },
  { slime: 4, bat: 4, spider: 2, wolf: 1 },
  { slime: 3, bat: 4, spider: 3, wolf: 2 },
  { slime: 2, bat: 4, spider: 3, wolf: 3 },
  { slime: 2, bat: 3, spider: 4, wolf: 4 },
];

export function waveMixFor(minute: number): Record<EnemyId, number> {
  return WAVE_MIX[Math.min(Math.floor(minute), WAVE_MIX.length - 1)];
}
