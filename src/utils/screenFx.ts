import Phaser from "phaser";
import { GameManager } from "../managers/GameManager";

// Screen shake that respects the settings.shake toggle.
export function shakeCamera(scene: Phaser.Scene, duration = 100, intensity = 0.005): void {
  if (!GameManager.instance.save.get().settings.shake) {
    return;
  }
  scene.cameras.main.shake(duration, intensity);
}
