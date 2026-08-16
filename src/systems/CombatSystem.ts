import Phaser from "phaser";
import { GameManager } from "../managers/GameManager";
import { multiShotConfig } from "../abilities/MultiShot";
import { ChainLightning } from "../abilities/ChainLightning";
import type { AbilityContext } from "../abilities/types";
import { Projectile } from "../entities/Projectile";
import { Player } from "../entities/Player";
import type { Enemy } from "../enemies/Enemy";
import { dist } from "../utils/math";

// Auto-attack, projectiles and central damage pipeline.
export class CombatSystem {
  ctx: AbilityContext | null = null;
  chainLightning: ChainLightning | null = null;
  onEnemyKilled: ((enemy: Enemy) => void) | null = null;

  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Phaser.Physics.Arcade.Group;
  private playerProjectiles: Phaser.Physics.Arcade.Group;
  private attackTimer = 0;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    playerProjectiles: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.playerProjectiles = playerProjectiles;
  }

  attachContext(ctx: AbilityContext): void {
    this.ctx = ctx;
  }

  setupCollisions(): void {
    this.scene.physics.add.overlap(this.playerProjectiles, this.enemies, (projObj, enemyObj) => {
      const proj = projObj as Projectile;
      const enemy = enemyObj as Enemy;
      if (!proj.active || !enemy.active) {
        return;
      }
      this.hitEnemy(proj, enemy);
    });
  }

  update(_time: number, delta: number): void {
    const st = this.player.stats;
    const cd = 1000 / st.fireRate;
    this.attackTimer += delta;
    if (this.attackTimer >= cd) {
      this.attackTimer -= cd;
      this.fire();
    }
  }

  private fire(): void {
    const st = this.player.stats;
    const target = this.nearestEnemyInRange();
    if (!target) {
      return;
    }
    const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const multiLevel = GameManager.instance.abilityLevel("multiShot");
    const { projectiles, spread } = multiShotConfig(multiLevel);
    for (let i = 0; i < projectiles; i++) {
      const offset = (i - (projectiles - 1) / 2) * spread * (Math.PI / 180);
      const angle = baseAngle + offset;
      const crit = Math.random() < st.critChance;
      const dmg = st.damage * (crit ? st.critMult : 1);
      const proj = new Projectile(this.scene, this.player.x, this.player.y, "proj_player", angle, st.projSpeed, dmg, true, crit);
      this.playerProjectiles.add(proj);
    }
    if (this.ctx) {
      this.ctx.burst(this.player.x, this.player.y, 0xffb02e, 2);
    }
  }

  nearestEnemyInRange(): Enemy | null {
    let best: Enemy | null = null;
    let bestD = this.player.stats.range;
    for (const child of this.enemies.getChildren()) {
      const e = child as Enemy;
      if (!e.active || e.health <= 0) {
        continue;
      }
      const d = dist(this.player.x, this.player.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  hitEnemy(proj: Projectile, enemy: Enemy): void {
    if (this.ctx) {
      this.ctx.burst(proj.x, proj.y, proj.isPlayer ? 0xffb02e : 0xb14dff, 4, 130, 0.8);
    }
    this.damageEnemy(enemy, proj.damage, "attack", proj.crit);
    if (enemy.health > 0 && this.chainLightning && this.ctx) {
      this.chainLightning.trigger(this.ctx, enemy);
    }
    proj.destroy();
  }

  damageEnemy(enemy: Enemy, amount: number, source: string, crit = false): void {
    if (enemy.health <= 0) {
      return;
    }
    const dmg = Math.max(1, Math.round(amount));
    enemy.takeDamage(dmg);
    if (this.ctx) {
      const color =
        crit ? 0xffe066 : source === "chainLightning" ? 0xffd23f : source === "iceAura" ? 0x9adfff : 0xffffff;
      this.ctx.floatText(enemy.x, enemy.y - enemy.radius - 10, String(dmg), color, crit ? 30 : 22);
    }
  }

  registerEnemy(enemy: Enemy): void {
    enemy.onKilled = (e) => {
      if (this.onEnemyKilled) {
        this.onEnemyKilled(e);
      }
    };
  }
}
