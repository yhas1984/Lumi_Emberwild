import type { ChestType, LootTableEntry } from "../types";

export const CHEST_LOOT: Record<ChestType, LootTableEntry[]> = {
  WOODEN: [{ type: "coins", min: 15, max: 30, weight: 100 }],
  SILVER: [
    { type: "coins", min: 30, max: 60, weight: 90 },
    { type: "gems", min: 2, max: 5, weight: 30 },
  ],
  GOLD: [
    { type: "coins", min: 60, max: 120, weight: 95 },
    { type: "gems", min: 5, max: 10, weight: 45 },
  ],
  MYTHIC: [
    { type: "coins", min: 150, max: 250, weight: 100 },
    { type: "gems", min: 15, max: 25, weight: 75 },
    { type: "egg", min: 0, max: 0, weight: 60 },
  ],
};

export const CHEST_NAMES: Record<ChestType, string> = {
  WOODEN: "Wooden Chest",
  SILVER: "Silver Chest",
  GOLD: "Gold Chest",
  MYTHIC: "Mythic Chest",
};

export const CHEST_COLORS: Record<ChestType, number> = {
  WOODEN: 0xa06a3c,
  SILVER: 0xb6bfd1,
  GOLD: 0xf0b73f,
  MYTHIC: 0x9a5fe0,
};
