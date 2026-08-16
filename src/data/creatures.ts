import type { CreatureDef } from "../types";

// Creature collection data (data driven).
export const CREATURES: Record<string, CreatureDef> = {
  emberFox: {
    id: "emberFox",
    name: "Ember Fox",
    emoji: "🦊",
    rarity: "RARE",
    description: "Damage +5%.",
    passiveBonus: { stat: "damagePct", value: 0.05 },
  },
  babyDragon: {
    id: "babyDragon",
    name: "Baby Dragon",
    emoji: "🐲",
    rarity: "EPIC",
    description: "Damage +8%.",
    passiveBonus: { stat: "damagePct", value: 0.08 },
  },
  frostWolf: {
    id: "frostWolf",
    name: "Frost Wolf",
    emoji: "🐺",
    rarity: "RARE",
    description: "Movement speed +5%.",
    passiveBonus: { stat: "moveSpeedPct", value: 0.05 },
  },
  moonBunny: {
    id: "moonBunny",
    name: "Moon Bunny",
    emoji: "🐇",
    rarity: "COMMON",
    description: "Coins gained +4%.",
    passiveBonus: { stat: "coinPct", value: 0.04 },
  },
  forestTurtle: {
    id: "forestTurtle",
    name: "Forest Turtle",
    emoji: "🐢",
    rarity: "COMMON",
    description: "Max health +8%.",
    passiveBonus: { stat: "maxHealthPct", value: 0.08 },
  },
  voidCat: {
    id: "voidCat",
    name: "Void Cat",
    emoji: "🐈‍⬛",
    rarity: "LEGENDARY",
    description: "Critical chance +6%.",
    passiveBonus: { stat: "critChanceFlat", value: 0.06 },
  },
  celestialStag: {
    id: "celestialStag",
    name: "Celestial Stag",
    emoji: "🦌",
    rarity: "MYTHIC",
    description: "Damage +10%.",
    passiveBonus: { stat: "damagePct", value: 0.1 },
  },
  forestSprite: {
    id: "forestSprite",
    name: "Forest Sprite",
    emoji: "🧚",
    rarity: "COMMON",
    description: "XP gained +6%.",
    passiveBonus: { stat: "xpPct", value: 0.06 },
  },
};

export const CREATURE_LIST: CreatureDef[] = Object.values(CREATURES);
