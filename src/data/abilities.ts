import type { AbilityDef, AbilityId, AbilityInstance } from "../types";

export const ABILITY_MAX_LEVEL = 5;

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  fireOrb: {
    id: "fireOrb",
    name: "Fire Orb",
    emoji: "🔥",
    color: 0xff6b35,
    rarity: "RARE",
    values: { orbs: [1, 1, 2, 2, 3], damage: [8, 10, 12, 15, 18], radius: [64, 66, 68, 72, 76] },
    desc: "Summons {orbs} orbital fire orb(s) dealing {damage} damage.",
  },
  chainLightning: {
    id: "chainLightning",
    name: "Chain Lightning",
    emoji: "⚡",
    color: 0xffd23f,
    rarity: "EPIC",
    values: { jumps: [2, 3, 4, 5, 6], damage: [10, 13, 16, 20, 25], range: [140, 150, 160, 170, 180] },
    desc: "Attacks chain to {jumps} enemies dealing {damage} lightning damage.",
  },
  windBlades: {
    id: "windBlades",
    name: "Wind Blades",
    emoji: "🌀",
    color: 0x38d9ff,
    rarity: "RARE",
    values: { blades: [4, 6, 8, 10, 12], damage: [12, 14, 17, 20, 24] },
    desc: "Launches {blades} wind blades around you dealing {damage} damage.",
  },
  iceAura: {
    id: "iceAura",
    name: "Ice Aura",
    emoji: "❄️",
    color: 0x6bc8ff,
    rarity: "COMMON",
    values: { radius: [90, 100, 110, 125, 140], slow: [20, 25, 30, 35, 40], dps: [3, 4, 5, 7, 9] },
    desc: "Chills enemies in a {radius} radius: {slow}% slow and {dps} DPS.",
  },
  multiShot: {
    id: "multiShot",
    name: "Multi Shot",
    emoji: "🎯",
    color: 0xffa94d,
    rarity: "COMMON",
    values: { projectiles: [2, 2, 3, 3, 4], spread: [10, 14, 12, 14, 12] },
    desc: "Fires {projectiles} projectiles in a spread.",
  },
  attackSpeed: {
    id: "attackSpeed",
    name: "Attack Speed",
    emoji: "⚔️",
    color: 0xff8787,
    rarity: "COMMON",
    values: { pct: [8, 16, 24, 32, 40] },
    desc: "Attack speed +{pct}%.",
  },
  moveSpeed: {
    id: "moveSpeed",
    name: "Movement Speed",
    emoji: "👟",
    color: 0x74c0fc,
    rarity: "COMMON",
    values: { pct: [6, 12, 18, 25, 32] },
    desc: "Movement speed +{pct}%.",
  },
  critChance: {
    id: "critChance",
    name: "Critical Chance",
    emoji: "💢",
    color: 0xffc94d,
    rarity: "RARE",
    values: { pct: [5, 9, 13, 18, 24] },
    desc: "Critical chance +{pct}%.",
  },
  healing: {
    id: "healing",
    name: "Healing",
    emoji: "💚",
    color: 0x69db7c,
    rarity: "COMMON",
    values: { hps: [1, 2, 3, 4, 6] },
    desc: "Regenerate {hps} HP per second.",
  },
  magnet: {
    id: "magnet",
    name: "Magnet",
    emoji: "🧲",
    color: 0x9775fa,
    rarity: "COMMON",
    values: { radius: [60, 120, 180, 260, 360] },
    desc: "XP pickup radius +{radius}.",
  },
};

export function abilityDef(id: AbilityId): AbilityDef {
  return ABILITIES[id];
}

export function abilityValue(def: AbilityDef, key: string, level: number): number {
  const arr = def.values[key];
  if (!arr) {
    return 0;
  }
  return arr[Math.min(Math.max(level, 1), arr.length) - 1];
}

export function abilityDesc(def: AbilityDef, level: number): string {
  return def.desc.replace(/\{(\w+)\}/g, (_m, key: string) =>
    String(abilityValue(def, key, level))
  );
}

export function abilityInstance(id: AbilityId, level: number): AbilityInstance {
  return { id, level };
}

export function isAbilityMaxed(id: AbilityId, level: number): boolean {
  return level >= ABILITY_MAX_LEVEL;
}

/** True when every ability in the catalog is at max level (per the given level reader). */
export function allAbilitiesMaxed(levelOf: (id: AbilityId) => number): boolean {
  return Object.values(ABILITIES).every((d) => isAbilityMaxed(d.id, levelOf(d.id)));
}