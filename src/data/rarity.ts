import type { Rarity } from "../types";

// Central rarity configuration.
// Probabilities are defined here, never hardcoded around the app.
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 60,
  RARE: 25,
  EPIC: 10,
  LEGENDARY: 4,
  MYTHIC: 1,
};

export const RARITY_COLORS: Record<Rarity, number> = {
  COMMON: 0x9aa4b8,
  RARE: 0x3fa9f5,
  EPIC: 0xa45cff,
  LEGENDARY: 0xffb02e,
  MYTHIC: 0xff4d6d,
};

export const RARITY_LABELS: Record<Rarity, string> = {
  COMMON: "Common",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
  MYTHIC: "Mythic",
};
