import type { AbilityId } from "../types";

// Passive abilities modify player stats; applied via Player.recomputeStats().
export const PASSIVE_ABILITY_IDS: AbilityId[] = [
  "attackSpeed",
  "moveSpeed",
  "critChance",
  "healing",
  "magnet",
];
