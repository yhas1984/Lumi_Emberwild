import Phaser from "phaser";
import type { ChestLootResult, ChestType } from "../types";
import { CHEST_COLORS } from "../data/lootTables";
import { GameManager } from "../managers/GameManager";

// Chest entity: shake -> glow -> reveal sequence, then reward callback.
export class Chest extends Phaser.Physics.Arcade.Image {
  chestType: ChestType;
  opened = false;
  onOpened: ((loot: ChestLootResult) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, chestType: ChestType) {
    super(scene, x, y, "chest_" + chestType.toLowerCase());
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(24, this.width / 2 - 24, this.height / 2 - 18);
    this.chestType = chestType;
    this.setDepth(18);
    this.setScale(1.1);
    this.setTint(CHEST_COLORS[chestType]);
    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  open(): void {
    if (this.opened) {
      return;
    }
    this.opened = true;
    const loot = GameManager.instance.loot.rollChest(this.chestType);
    this.scene.tweens.killTweensOf(this);
    // shake
    this.scene.tweens.add({
      targets: this,
      angle: { from: -14, to: 14 },
      scale: { from: 1.25, to: 1.0 },
      duration: 70,
      repeat: 5,
      yoyo: true,
      onComplete: () => {
        // glow
        this.scene.tweens.add({
          targets: this,
          alpha: 0.35,
          scale: 1.5,
          duration: 180,
          yoyo: true,
          onComplete: () => {
            // reveal
            this.scene.cameras.main.flash(160, 255, 235, 160);
            this.scene.tweens.add({
              targets: this,
              scale: 0,
              alpha: 0,
              duration: 200,
              onComplete: () => {
                if (this.onOpened) {
                  this.onOpened(loot);
                }
                this.destroy();
              },
            });
          },
        });
      },
    });
  }
}