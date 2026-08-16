import type { EnemyDef, EnemyId } from "../types";
import { ENEMIES } from "../data/enemies";
import { Enemy } from "./Enemy";

// Factory that creates an enemy instance from its id.
export function createEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  id: EnemyId,
  minute: number,
  elite: boolean
): Enemy {
  const def: EnemyDef = ENEMIES[id];
  return new Enemy(scene, x, y, def, minute, elite);
}
