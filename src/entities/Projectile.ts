import Phaser from "phaser";

export class Projectile extends Phaser.Physics.Arcade.Image {
  damage: number;
  isPlayer: boolean;
  crit: boolean;

  private life = 0;
  private readonly maxLife = 2600;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    angle: number,
    speed: number,
    damage: number,
    isPlayer: boolean,
    crit = false
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(Math.max(4, this.width / 2 - 3), 3, 3);
    this.setRotation(angle);
    this.scene.physics.velocityFromRotation(angle, speed, body.velocity);
    this.damage = damage;
    this.isPlayer = isPlayer;
    this.crit = crit;
    this.setDepth(25);
    if (crit) {
      this.setScale(1.35);
      this.setTint(0xffe9a8);
    }
  }

  update(_time: number, delta: number): void {
    this.life += delta;
    if (this.life > this.maxLife) {
      this.destroy();
    }
  }
}
