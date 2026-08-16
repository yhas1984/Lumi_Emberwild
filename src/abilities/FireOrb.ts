import Phaser from "phaser";
import { ABILITIES, abilityValue } from "../data/abilities";
import type { Enemy } from "../enemies/Enemy";
import { dist } from "../utils/math";
import { AbilityBase } from "./AbilityBase";
import type { AbilityContext } from "./types";

// Orbital fireballs around the player that damage enemies on contact.
export class FireOrb extends AbilityBase {
  private orbs: Phaser.GameObjects.Image[] = [];
  private angle = 0;
  private lastLevel = 0;
  private hitCooldowns = new Map<Enemy, number>();

  constructor(level: number) {
    super("fireOrb", level);
  }

  onAcquired(ctx: AbilityContext): void {
    this.syncOrbs(ctx);
  }

  update(ctx: AbilityContext): void {
    if (this.level !== this.lastLevel) {
      this.syncOrbs(ctx);
    }
    const def = ABILITIES.fireOrb;
    const radius = abilityValue(def, "radius", this.level);
    const damage = abilityValue(def, "damage", this.level);
    const now = ctx.scene.time.now;
    this.angle += (2.6 * ctx.delta) / 1000;
    const count = this.orbs.length;
    for (let i = 0; i < count; i++) {
      const orb = this.orbs[i];
      const a = this.angle + (i * Math.PI * 2) / count;
      orb.setPosition(ctx.player.x + Math.cos(a) * radius, ctx.player.y + Math.sin(a) * radius);
    }
    for (const orb of this.orbs) {
      for (const child of ctx.enemies.getChildren()) {
        const enemy = child as Enemy;
        if (!enemy.active) {
          continue;
        }
        const d = dist(orb.x, orb.y, enemy.x, enemy.y);
        if (d < enemy.radius + 18) {
          const last = this.hitCooldowns.get(enemy) ?? 0;
          if (now - last > 450) {
            this.hitCooldowns.set(enemy, now);
            ctx.damageEnemy(enemy, damage, "fireOrb");
            ctx.burst(orb.x, orb.y, 0xff6b35, 4);
          }
        }
      }
    }
  }

  private syncOrbs(ctx: AbilityContext): void {
    const target = abilityValue(ABILITIES.fireOrb, "orbs", this.level);
    while (this.orbs.length < target) {
      const orb = ctx.scene.add.image(ctx.player.x, ctx.player.y, "proj_player");
      orb.setScale(1.25);
      orb.setDepth(22);
      this.orbs.push(orb);
    }
    while (this.orbs.length > target) {
      const orb = this.orbs.pop();
      if (orb) {
        orb.destroy();
      }
    }
    this.lastLevel = this.level;
  }
}
