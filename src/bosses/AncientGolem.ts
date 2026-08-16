import Phaser from "phaser";
import { GAME } from "../data/gameConfig";
import { Projectile } from "../entities/Projectile";
import { GameManager } from "../managers/GameManager";
import { emitEvent } from "../utils/events";
import { shakeCamera } from "../utils/screenFx";

// Ancient Golem: the 5-minute boss. Telegraphs its attacks, has a lot of HP,
// multiple attack patterns and a special reward on death. Its stats scale
// with the active difficulty tier.
export class AncientGolem extends Phaser.Physics.Arcade.Image {
  maxHealth: number;
  health: number;
  onDefeated: (() => void) | null = null;
  onPlayerDamage: ((damage: number) => void) | null = null;
  onSummonMinions: ((x: number, y: number) => void) | null = null;

  private telegraphs: Phaser.GameObjects.Graphics;
  projectiles: Phaser.Physics.Arcade.Group;
  private nextAttack = 0;
  private dashUntil = 0;
  private phase = 0;
  private introDone = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "boss_golem");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(52, this.width / 2 - 52, this.height / 2 - 52);
    body.setCollideWorldBounds(true);
    body.setImmovable(true);
    const diff = GameManager.instance.currentDifficulty();
    this.maxHealth = Math.round(GAME.boss.health * diff.bossHp);
    this.health = this.maxHealth;
    this.projectiles = scene.physics.add.group();
    this.telegraphs = scene.add.graphics();
    this.telegraphs.setDepth(9);
    this.setDepth(28);
    this.setScale(0);
    scene.tweens.add({ targets: this, scale: 1, duration: 520, ease: "Back.easeOut" });
    scene.time.delayedCall(650, () => {
      this.introDone = true;
      this.nextAttack = scene.time.now + 900;
    });
    emitEvent("boss-start", {});
    emitEvent("boss-health", { current: this.health, max: this.maxHealth });
  }

  get damage(): number {
    return Math.round(GAME.boss.damage * GameManager.instance.currentDifficulty().bossDmg);
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) {
      return;
    }
    this.health -= amount;
    this.setTintFill(0xffffff);
    // Hit "pop": a quick scale pulse on top of the current scale.
    this.setScale(this.scaleX * 1.06);
    this.scene.time.delayedCall(70, () => {
      if (this.health > 0) {
        this.clearTint();
        this.setScale(1);
      }
    });
    emitEvent("boss-health", { current: Math.max(0, this.health), max: this.maxHealth });
    const prev = this.phase;
    if (this.health < this.maxHealth * 0.66) {
      this.phase = Math.max(this.phase, 1);
    }
    if (this.health < this.maxHealth * 0.33) {
      this.phase = Math.max(this.phase, 2);
    }
    if (this.phase !== prev) {
      this.scene.cameras.main.flash(220, 255, 60, 60);
    }
    if (this.health <= 0) {
      this.health = 0;
      this.scene.tweens.killTweensOf(this);
      if (this.onDefeated) {
        this.onDefeated();
      }
    }
  }

  update(time: number, delta: number, playerX: number, playerY: number): void {
    if (this.health <= 0) {
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.introDone) {
      if (time >= this.dashUntil) {
        const ang = Math.atan2(playerY - this.y, playerX - this.x);
        body.setVelocity(Math.cos(ang) * GAME.boss.speed, Math.sin(ang) * GAME.boss.speed);
      }
      if (time >= this.nextAttack) {
        this.nextAttack = time + this.attackInterval();
        this.cast(time, playerX, playerY);
      }
    } else {
      body.setVelocity(0, 0);
    }
    for (const child of this.projectiles.getChildren()) {
      const p = child as Projectile;
      if (p.active) {
        p.update(time, delta);
      }
    }
  }

  private attackInterval(): number {
    return this.phase >= 2 ? 2600 : 3400;
  }

  private cast(time: number, px: number, py: number): void {
    const roll = Math.floor(time / 100) % (this.phase >= 1 ? 4 : 2);
    if (roll === 0) {
      this.radialBurst();
    } else if (roll === 1) {
      this.slamAoE(px, py);
    } else if (roll === 2) {
      this.chargeDash(px, py);
    } else {
      this.summonMinions();
    }
  }

  private summonMinions(): void {
    this.flashRing(this.x, this.y, 130, 0xb06bff);
    this.scene.time.delayedCall(500, () => {
      if (this.health > 0 && this.onSummonMinions) {
        this.onSummonMinions(this.x, this.y);
      }
    });
  }

  private radialBurst(): void {
    const count = 14 + this.phase * 2;
    const speed = 205 + this.phase * 20;
    this.flashRing(this.x, this.y, 100, 0xff4d6d);
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count;
      const proj = new Projectile(this.scene, this.x, this.y, "proj_enemy", a, speed, this.damage, false);
      this.projectiles.add(proj);
    }
  }

  private slamAoE(px: number, py: number): void {
    const radius = 135;
    this.telegraphCircle(px, py, radius, 850, () => {
      shakeCamera(this.scene, 200, 0.012);
      this.scene.cameras.main.flash(140, 255, 90, 90);
      if (this.onPlayerDamage) {
        const player = this.scene.children.getByName("player") as Phaser.GameObjects.GameObject & { x: number; y: number };
        const d = Math.sqrt((player.x - px) ** 2 + (player.y - py) ** 2);
        if (d < radius + 30) {
          this.onPlayerDamage(this.damage * 1.4);
        }
      }
    });
  }

  private chargeDash(px: number, py: number): void {
    const ang = Math.atan2(py - this.y, px - this.x);
    const dist = Math.sqrt((px - this.x) ** 2 + (py - this.y) ** 2);
    const len = Math.min(dist, 420);
    const tx = this.x + Math.cos(ang) * len;
    const ty = this.y + Math.sin(ang) * len;
    this.telegraphLine(tx, ty, 750, () => {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(ang) * GAME.boss.speed * 3.2, Math.sin(ang) * GAME.boss.speed * 3.2);
      this.dashUntil = this.scene.time.now + 650;
    });
  }

  private flashRing(x: number, y: number, radius: number, color: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(45);
    let a = 0;
    const ev = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        a += 0.06;
        const r = radius + a * 4;
        g.clear();
        g.lineStyle(5, color, Math.max(0, 0.9 - a * 0.1));
        g.strokeCircle(x, y, r);
        if (a > 8) {
          ev.remove();
          g.destroy();
        }
      },
    });
  }

  private telegraphLine(tx: number, ty: number, durationMs: number, onComplete: () => void): void {
    const g = this.scene.add.graphics();
    g.setDepth(9);
    const start = this.scene.time.now;
    const ev = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = (this.scene.time.now - start) / durationMs;
        if (t >= 1) {
          ev.remove();
          g.destroy();
          onComplete();
          return;
        }
        g.clear();
        g.lineStyle(5, 0xff5f5f, 0.5 + t * 0.4);
        g.lineBetween(this.x, this.y, tx, ty);
      },
    });
  }

  private telegraphCircle(x: number, y: number, radius: number, durationMs: number, onComplete: () => void): void {
    const g = this.scene.add.graphics();
    g.setDepth(9);
    const start = this.scene.time.now;
    const ev = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = (this.scene.time.now - start) / durationMs;
        if (t >= 1) {
          ev.remove();
          g.destroy();
          onComplete();
          return;
        }
        g.clear();
        g.fillStyle(0xff4d4d, 0.06 + t * 0.22);
        g.fillCircle(x, y, radius);
        g.lineStyle(4, 0xff4d4d, 0.9 - t * 0.5);
        g.strokeCircle(x, y, radius);
      },
    });
  }
}
