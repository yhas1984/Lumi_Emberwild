import { ENEMIES } from "../data/enemies";
import { Enemy } from "./Enemy";

export class Bat extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, minute: number, elite: boolean) {
    super(scene, x, y, ENEMIES.bat, minute, elite);
  }
}
