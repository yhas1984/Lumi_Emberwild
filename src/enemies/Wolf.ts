import { ENEMIES } from "../data/enemies";
import { Enemy } from "./Enemy";

export class Wolf extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, minute: number, elite: boolean) {
    super(scene, x, y, ENEMIES.wolf, minute, elite);
  }
}
