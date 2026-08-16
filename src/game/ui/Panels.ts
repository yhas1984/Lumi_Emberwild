import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";

// Shared UI helpers for premium-looking backgrounds and decorations.
export function gradientBg(scene: Phaser.Scene, top: number, bottom: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(-20);
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, GAME.width, GAME.height);
  return g;
}

export function softOrb(scene: Phaser.Scene, x: number, y: number, r: number, color: number, alpha: number): Phaser.GameObjects.Arc {
  return scene.add.circle(x, y, r, color, alpha).setDepth(-19);
}
