import { ABILITIES, abilityValue } from "../data/abilities";

export interface MultiShotConfig {
  projectiles: number;
  spread: number;
}

// Multi Shot modifies the attack pattern of the combat system.
export function multiShotConfig(level: number): MultiShotConfig {
  const def = ABILITIES.multiShot;
  return {
    projectiles: abilityValue(def, "projectiles", level),
    spread: abilityValue(def, "spread", level),
  };
}
