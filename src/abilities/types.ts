import type { Enemy } from "../enemies/Enemy";
import type { Player } from "../entities/Player";

// Everything a runtime ability needs to interact with the run.
export interface AbilityContext {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  playerProjectiles: Phaser.Physics.Arcade.Group;
  time: number;
  delta: number;
  damageEnemy(enemy: Enemy, amount: number, source: string): void;
  floatText(x: number, y: number, text: string, color: number, size?: number): void;
  burst(x: number, y: number, color: number, count?: number, speed?: number, size?: number): void;
}
