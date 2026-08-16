import Phaser from "phaser";
import type { AbilityId, PlayerStats } from "../types";
import { GAME, BUILDINGS } from "../data/gameConfig";
import { ABILITIES, abilityValue } from "../data/abilities";
import { GameManager } from "../managers/GameManager";
import { emitEvent } from "../utils/events";
import { clamp } from "../utils/math";

export class Player extends Phaser.Physics.Arcade.Image {
  stats: PlayerStats;
  onDeath: (() => void) | null = null;

  private invulnUntil = 0;
  private readonly invulnWindow = 350;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "lumi");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(13, this.width / 2 - 13, this.height / 2 - 13);
    body.setCollideWorldBounds(true);
    this.setDepth(30);
    this.stats = this.buildStats(100);
  }

  /** Recomputes stats from run abilities + sanctuary buildings + creatures. */
  recomputeStats(): void {
    const prevMax = this.stats?.maxHealth ?? GAME.player.maxHealth;
    const prevHealth = this.stats?.health ?? prevMax;
    this.stats = this.buildStats(prevHealth);
    emitEvent("player-health", { current: this.stats.health, max: this.stats.maxHealth });
  }

  private buildStats(prevHealth: number): PlayerStats {
    const gm = GameManager.instance;
    const save = gm.save.get();
    const base = GAME.player;
    const abilities = gm.run?.abilities ?? new Map<AbilityId, number>();

    const pct = (id: AbilityId, key: string): number => {
      const level = abilities.get(id) ?? 0;
      if (level <= 0) {
        return 0;
      }
      return abilityValue(ABILITIES[id], key, level) / 100;
    };
    const flat = (id: AbilityId, key: string): number => {
      const level = abilities.get(id) ?? 0;
      if (level <= 0) {
        return 0;
      }
      return abilityValue(ABILITIES[id], key, level);
    };

    const sanctuary = save.sanctuary;
    // Creature passive bonuses (summed value x level).
    const creatureBonuses = gm.creatures.passiveBonuses();
    const cBonus = (key: string): number => creatureBonuses.get(key) ?? 0;

    const maxHealth = Math.round(
      (base.maxHealth + BUILDINGS.treeOfLife.bonus * (sanctuary.treeOfLife ?? 0)) * (1 + cBonus("maxHealthPct"))
    );
    const damage = base.damage * (1 + BUILDINGS.forge.bonus * (sanctuary.forge ?? 0)) * (1 + cBonus("damagePct"));
    const speed = base.speed * (1 + pct("moveSpeed", "pct")) * (1 + cBonus("moveSpeedPct"));
    const fireRate = base.fireRate * (1 + pct("attackSpeed", "pct"));
    const critChance = clamp(base.critChance + pct("critChance", "pct") + cBonus("critChanceFlat"), 0, 0.9);
    const magnet = base.magnet + flat("magnet", "radius");
    const regen = flat("healing", "hps");
    const xpGain = (1 + BUILDINGS.hatchery.bonus * (sanctuary.hatchery ?? 0)) * (1 + cBonus("xpPct"));
    const coinGain = (1 + BUILDINGS.portal.bonus * (sanctuary.portal ?? 0)) * (1 + cBonus("coinPct"));

    return {
      maxHealth,
      health: Math.min(prevHealth, maxHealth),
      speed,
      damage,
      fireRate,
      projSpeed: base.projSpeed,
      range: base.range,
      critChance,
      critMult: base.critMult,
      magnet,
      regen,
      xpGain,
      coinGain,
    };
  }

  /** Movement input: normalized axis (-1..1). */
  move(ax: number, ay: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const len = Math.sqrt(ax * ax + ay * ay);
    if (len > 1) {
      ax /= len;
      ay /= len;
    }
    body.setVelocity(ax * this.stats.speed, ay * this.stats.speed);
  }

  takeDamage(amount: number, sourceX: number, sourceY: number): void {
    const now = this.scene.time.now;
    if (now < this.invulnUntil || this.stats.health <= 0) {
      return;
    }
    this.stats.health -= amount;
    this.invulnUntil = now + this.invulnWindow;
    this.setAlpha(0.45);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 220,
      yoyo: false,
    });
    emitEvent("player-health", { current: Math.max(0, this.stats.health), max: this.stats.maxHealth });
    if (this.stats.health <= 0) {
      this.stats.health = 0;
      if (this.onDeath) {
        this.onDeath();
      }
    }
  }

  grantInvulnerability(ms: number): void {
    this.invulnUntil = this.scene.time.now + ms;
    this.setAlpha(0.45);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 300,
    });
  }

  /** Revives the player at full health (used by the revive ad flow). */
  revive(): void {
    this.stats.health = this.stats.maxHealth;
    emitEvent("player-health", { current: this.stats.health, max: this.stats.maxHealth });
  }

  heal(amount: number): void {
    if (this.stats.health <= 0) {
      return;
    }
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    emitEvent("player-health", { current: this.stats.health, max: this.stats.maxHealth });
  }

  get isDead(): boolean {
    return this.stats.health <= 0;
  }

  update(_time: number, delta: number): void {
    if (this.stats.health <= 0) {
      return;
    }
    if (this.stats.regen > 0) {
      this.heal((this.stats.regen * delta) / 1000);
    }
  }
}