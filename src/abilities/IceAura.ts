import Phaser from "phaser";
import { ABILITIES, abilityValue } from "../data/abilities";
import type { Enemy } from "../enemies/Enemy";
import { dist } from "../utils/math";
import { AbilityBase } from "./AbilityBase";
import type { AbilityContext } from "./types";

// Slows enemies inside a radius and deals damage over time.
export class IceAura extends AbilityBase {
  private ring: Phaser.GameObjects.Arc | null = null;
  private tickAcc = 0;

  constructor(level: number) {
    super("iceAura", level);
  }

  onAcquired(ctx: AbilityContext): void {
    this.ring = ctx.scene.add
      .circle(ctx.player.x, ctx.player.y, 90, 0x6bc8ff, 0.1)
      .setStrokeStyle(3, 0x9adfff, 0.55);
    this.ring.setDepth(12);
  }

  update(ctx: AbilityContext): void {
    const def = ABILITIES.iceAura;
    const radius = abilityValue(def, "radius", this.level);
    const slow = abilityValue(def, "slow", this.level) / 100;
    const dps = abilityValue(def, "dps", this.level);
    if (this.ring) {
      this.ring.setPosition(ctx.player.x, ctx.player.y);
      this.ring.setRadius(radius);
    }
    this.tickAcc += ctx.delta;
    const doTick = this.tickAcc >= 500;
    for (const child of ctx.enemies.getChildren()) {
      const e = child as Enemy;
      if (!e.active) {
        continue;
      }
      const d = dist(ctx.player.x, ctx.player.y, e.x, e.y);
      if (d < radius + e.radius) {
        e.applySlow(1 - slow, 180);
        if (doTick) {
          ctx.damageEnemy(e, dps * 0.5, "iceAura");
        }
      }
    }
    if (doTick) {
      this.tickAcc = 0;
    }
  }
}
