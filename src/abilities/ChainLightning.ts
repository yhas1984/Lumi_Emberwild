import Phaser from "phaser";
import { ABILITIES, abilityValue } from "../data/abilities";
import type { Enemy } from "../enemies/Enemy";
import { dist } from "../utils/math";
import { AbilityBase } from "./AbilityBase";
import type { AbilityContext } from "./types";

// Attacks can jump between nearby enemies, dealing lightning damage.
export class ChainLightning extends AbilityBase {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private boltsActive = 0;

  constructor(level: number) {
    super("chainLightning", level);
  }

  onAcquired(ctx: AbilityContext): void {
    this.graphics = ctx.scene.add.graphics();
    this.graphics.setDepth(45);
  }

  /** Called by the combat system when a projectile hits an enemy. */
  trigger(ctx: AbilityContext, origin: Enemy): void {
    if (!this.graphics) {
      return;
    }
    const def = ABILITIES.chainLightning;
    const jumps = abilityValue(def, "jumps", this.level);
    const damage = abilityValue(def, "damage", this.level);
    const range = abilityValue(def, "range", this.level);

    const visited = new Set<Enemy>([origin]);
    let current = origin;
    for (let i = 0; i < jumps; i++) {
      let best: Enemy | null = null;
      let bestD = range;
      for (const child of ctx.enemies.getChildren()) {
        const e = child as Enemy;
        if (!e.active || visited.has(e)) {
          continue;
        }
        const d = dist(current.x, current.y, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) {
        break;
      }
      visited.add(best);
      ctx.damageEnemy(best, damage, "chainLightning");
      this.drawBolt(ctx, current.x, current.y, best.x, best.y);
      current = best;
    }
  }

  private drawBolt(ctx: AbilityContext, x1: number, y1: number, x2: number, y2: number): void {
    if (!this.graphics) {
      return;
    }
    this.boltsActive++;
    const g = this.graphics;
    const segments = 7;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const jitter = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 26;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const nx = -(y2 - y1);
      const ny = x2 - x1;
      const nl = Math.sqrt(nx * nx + ny * ny) || 1;
      pts.push({ x: px + (nx / nl) * jitter, y: py + (ny / nl) * jitter });
    }
    g.lineStyle(3, 0xffd23f, 0.95);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.strokePath();
    g.lineStyle(6, 0xffffff, 0.45);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.strokePath();
    ctx.scene.time.delayedCall(110, () => {
      this.boltsActive--;
      if (this.boltsActive <= 0) {
        g.clear();
      }
    });
  }
}
