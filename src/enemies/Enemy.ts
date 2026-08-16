import Phaser from "phaser";
import type { EnemyDef } from "../types";
import { enemyDmgScale, enemyHpScale } from "../data/enemies";

// Data-driven enemy: behavior comes from EnemyDef (chase | sine | burst).
export class Enemy extends Phaser.Physics.Arcade.Image {
  def: EnemyDef;
  maxHealth: number;
  health: number;
  elite: boolean;
  damage: number;
  xpReward: number;
  onKilled: ((enemy: Enemy) => void) | null = null;

  slowFactor = 1;
  slowUntil = 0;

  private sinePhase = Math.random() * Math.PI * 2;
  private burstUntil = 0;
  private flashTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef, minute: number, elite: boolean) {
    super(scene, x, y, "enemy_" + def.id + (elite ? "_elite" : ""));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const scale = elite ? 1.35 : 1;
    this.setScale(scale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const r = Math.max(7, def.radius * scale);
    body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    body.setCollideWorldBounds(true);
    this.def = def;
    this.elite = elite;
    this.maxHealth = Math.round(def.health * enemyHpScale(minute) * (elite ? 4 : 1));
    this.health = this.maxHealth;
    this.damage = Math.round(def.damage * enemyDmgScale(minute) * (elite ? 1.5 : 1));
    this.xpReward = def.xpReward * (elite ? 6 : 1);
    this.setDepth(10);
  }

  get speed(): number {
    return this.def.speed * (this.elite ? 0.85 : 1);
  }

  get radius(): number {
    return this.def.radius * (this.elite ? 1.35 : 1);
  }

  applySlow(factor: number, durationMs: number): void {
    if (factor < this.slowFactor) {
      this.slowFactor = factor;
      this.slowUntil = this.scene.time.now + durationMs;
      this.setTintFill(0xa8dcff);
    }
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) {
      return;
    }
    this.health -= amount;
    this.setTintFill(0xffffff);
    if (this.flashTween) {
      this.flashTween.destroy();
    }
    this.flashTween = this.scene.tweens.add({
      targets: this,
      duration: 70,
      onComplete: () => {
        if (this.health <= 0) {
          return;
        }
        if (this.scene.time.now < this.slowUntil) {
          this.setTintFill(0xa8dcff);
        } else {
          this.clearTint();
        }
      },
    });
    if (this.health <= 0) {
      this.health = 0;
      if (this.onKilled) {
        this.onKilled(this);
      }
    }
  }

  update(time: number, delta: number, playerX: number, playerY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.health <= 0) {
      body.setVelocity(0, 0);
      return;
    }
    if (this.slowUntil && time > this.slowUntil) {
      this.slowFactor = 1;
      this.slowUntil = 0;
      this.clearTint();
    }
    const effSpeed = this.speed * this.slowFactor;
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (this.def.behavior === "sine") {
      this.sinePhase += delta / 800;
      const perp = Math.sin(this.sinePhase) * 0.75;
      const nx = dx / d;
      const ny = dy / d;
      body.setVelocity((nx - ny * perp) * effSpeed, (ny + nx * perp) * effSpeed);
    } else if (this.def.behavior === "burst") {
      const ang = Math.atan2(dy, dx);
      if (time > this.burstUntil) {
        this.burstUntil = time + 950;
        body.setVelocity(Math.cos(ang) * effSpeed * 1.9, Math.sin(ang) * effSpeed * 1.9);
      } else {
        body.setVelocity(Math.cos(ang) * effSpeed * 0.4, Math.sin(ang) * effSpeed * 0.4);
      }
    } else {
      const ang = Math.atan2(dy, dx);
      body.setVelocity(Math.cos(ang) * effSpeed, Math.sin(ang) * effSpeed);
    }
  }
}