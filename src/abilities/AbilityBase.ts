import type { AbilityId } from "../types";
import type { AbilityContext } from "./types";

export abstract class AbilityBase {
  readonly id: AbilityId;
  level: number;

  protected constructor(id: AbilityId, level: number) {
    this.id = id;
    this.level = level;
  }

  /** Called every frame while the ability is owned. */
  update(_ctx: AbilityContext): void {
    // no per-frame behavior by default
  }

  /** Called when the ability is first acquired. */
  onAcquired?(_ctx: AbilityContext): void;
}
