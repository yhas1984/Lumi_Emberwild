import Phaser from "phaser";
import { GAME } from "../data/gameConfig";
import { waveMixFor } from "../data/enemies";
import { createEnemy } from "../enemies";
import type { Enemy } from "../enemies/Enemy";
import { Player } from "../entities/Player";
import { GameManager } from "../managers/GameManager";
import { weightedPick } from "../utils/rng";
import { clamp, lerp } from "../utils/math";
import type { EnemyId } from "../types";

// Spawns enemies around the camera view with an escalating cadence.
export class WaveSpawner {
  onEnemySpawned: ((enemy: Enemy) => void) | null = null;

  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private player: Player;
  private nextSpawn = 0;
  private stopped = false;

  constructor(scene: Phaser.Scene, enemies: Phaser.Physics.Arcade.Group, player: Player) {
    this.scene = scene;
    this.enemies = enemies;
    this.player = player;
  }

  start(): void {
    this.nextSpawn = this.scene.time.now + 900;
    this.stopped = false;
  }

  stop(): void {
    this.stopped = true;
  }

  update(time: number, minute: number): void {
    if (this.stopped || time < this.nextSpawn) {
      return;
    }
    const diff = GameManager.instance.currentDifficulty();
    const interval =
      lerp(GAME.waves.startInterval, GAME.waves.endInterval, Math.min(1, minute / 4)) * 1000 * diff.spawnInterval;
    this.nextSpawn = time + interval;
    if (this.enemies.countActive(true) >= GAME.waves.maxEnemies) {
      return;
    }
    const mix = waveMixFor(minute);
    const id = weightedPick(Object.keys(mix) as EnemyId[], (k) => mix[k]);
    const elite = Math.random() < GAME.waves.eliteChance + diff.eliteChanceAdd;
    const pos = this.edgePosition();
    const enemy = createEnemy(this.scene, pos.x, pos.y, id, minute, elite);
    this.enemies.add(enemy);
    const targetScale = elite ? 1.35 : 1;
    enemy.setScale(0);
    this.scene.tweens.add({
      targets: enemy,
      scale: targetScale,
      duration: 240,
      ease: "Back.easeOut",
    });
    if (this.onEnemySpawned) {
      this.onEnemySpawned(enemy);
    }
  }

  private edgePosition(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const vw = cam.width;
    const vh = cam.height;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const side = Math.floor(Math.random() * 4);
    const margin = 70;
    let x = cx;
    let y = cy;
    if (side === 0) {
      x = cx + (Math.random() - 0.5) * vw;
      y = cy - vh / 2 - margin;
    } else if (side === 1) {
      x = cx + (Math.random() - 0.5) * vw;
      y = cy + vh / 2 + margin;
    } else if (side === 2) {
      x = cx - vw / 2 - margin;
      y = cy + (Math.random() - 0.5) * vh;
    } else {
      x = cx + vw / 2 + margin;
      y = cy + (Math.random() - 0.5) * vh;
    }
    x = clamp(x, 60, GAME.worldWidth - 60);
    y = clamp(y, 60, GAME.worldHeight - 60);
    return { x, y };
  }
}
