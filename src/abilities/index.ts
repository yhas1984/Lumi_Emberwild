import type { AbilityId } from "../types";
import { AbilityBase } from "./AbilityBase";
import { FireOrb } from "./FireOrb";
import { ChainLightning } from "./ChainLightning";
import { WindBlades } from "./WindBlades";
import { IceAura } from "./IceAura";

// Factory: creates the runtime behavior for an ability. Passive abilities
// return null (they only affect stats through Player.recomputeStats).
export function createAbility(id: AbilityId, level: number): AbilityBase | null {
  switch (id) {
    case "fireOrb":
      return new FireOrb(level);
    case "chainLightning":
      return new ChainLightning(level);
    case "windBlades":
      return new WindBlades(level);
    case "iceAura":
      return new IceAura(level);
    default:
      return null;
  }
}
