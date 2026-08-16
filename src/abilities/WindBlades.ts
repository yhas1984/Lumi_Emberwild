import { ABILITIES, abilityValue } from "../data/abilities";
import { Projectile } from "../entities/Projectile";
import { AbilityBase } from "./AbilityBase";
import type { AbilityContext } from "./types";

// Periodically launches blades in all directions around the player.
export class WindBlades extends AbilityBase {
  private nextFire = 0;
  private lastLevel = 0;

  constructor(level: number) {
    super("windBlades", level);
  }

  update(ctx: AbilityContext): void {
    if (this.level !== this.lastLevel) {
      this.lastLevel = this.level;
      this.nextFire = 0;
    }
    if (ctx.time < this.nextFire) {
      return;
    }
    const def = ABILITIES.windBlades;
    const blades = abilityValue(def, "blades", this.level);
    const damage = abilityValue(def, "damage", this.level);
    this.nextFire = ctx.time + 2500;
    const step = (Math.PI * 2) / blades;
    const start = Math.random() * Math.PI * 2;
    for (let i = 0; i < blades; i++) {
      const angle = start + i * step;
      const proj = new Projectile(ctx.scene, ctx.player.x, ctx.player.y, "blade", angle, 360, damage, true);
      ctx.playerProjectiles.add(proj);
    }
  }
}
