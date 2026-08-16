import Phaser from "phaser";
import { dist } from "../utils/math";

export type PickupKind = "xp" | "coin";

// Small collectible: XP crystal or coin. Magnetic attraction toward the player.
export class Pickup extends Phaser.Physics.Arcade.Image {
  kind: PickupKind;
  value: number;

  private attracted = false;
  private readonly baseY: number;
  private bob = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: PickupKind, value: number) {
    super(scene, x, y, kind === "xp" ? "xp_gem" : "coin");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(Math.max(5, this.width / 2 - 4), 4, 4);
    this.kind = kind;
    this.value = value;
    this.baseY = y;
    this.setDepth(15);
  }

  update(_time: number, delta: number, playerX: number, playerY: number, magnetRadius: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const d = dist(this.x, this.y, playerX, playerY);
    if (d < magnetRadius) {
      this.attracted = true;
    }
    if (this.attracted) {
      const speed = 430;
      const ang = Math.atan2(playerY - this.y, playerX - this.x);
      body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    } else {
      this.bob += delta / 380;
      this.y = this.baseY + Math.sin(this.bob) * 3;
      body.setVelocity(0, 0);
    }
  }
}
