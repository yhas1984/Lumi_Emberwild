import { RARITY_WEIGHTS, RARITY_COLORS } from "../data/rarity";
import type { Rarity } from "../types";
import { weightedPick } from "./rng";

// Central rarity roll. All rarity rolls across the game go through here.
export function rollRarity(weights: Record<Rarity, number> = RARITY_WEIGHTS): Rarity {
  const keys = Object.keys(weights) as Rarity[];
  return weightedPick(keys, (k) => weights[k]);
}

export function rarityColor(r: Rarity): number {
  return RARITY_COLORS[r];
}
