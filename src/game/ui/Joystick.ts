import Phaser from "phaser";

// Virtual joystick (touch only). Vector is normalized -1..1.
export class Joystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private centerX: number;
  private centerY: number;
  private readonly radius = 56;
  private active = false;
  private pointerId = -1;
  private vector = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.centerX = x;
    this.centerY = y;
    const touch = scene.sys.game.device.input.touch;
    this.base = scene.add.image(x, y, "joystick_base").setDepth(120).setScrollFactor(0);
    this.thumb = scene.add.image(x, y, "joystick_thumb").setDepth(121).setScrollFactor(0);
    if (!touch) {
      this.base.setVisible(false);
      this.thumb.setVisible(false);
    }
    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
  }

  getVector(): { x: number; y: number } {
    return this.vector;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!p.wasTouch || this.active) {
      return;
    }
    const dx = p.x - this.centerX;
    const dy = p.y - this.centerY;
    if (dx * dx + dy * dy < 135 * 135) {
      this.active = true;
      this.pointerId = p.id;
      this.move(p);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.active || p.id !== this.pointerId) {
      return;
    }
    this.move(p);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (!this.active || p.id !== this.pointerId) {
      return;
    }
    this.active = false;
    this.pointerId = -1;
    this.vector.x = 0;
    this.vector.y = 0;
    this.thumb.setPosition(this.centerX, this.centerY);
  }

  private move(p: Phaser.Input.Pointer): void {
    let dx = p.x - this.centerX;
    let dy = p.y - this.centerY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > this.radius) {
      dx = (dx / d) * this.radius;
      dy = (dy / d) * this.radius;
    }
    this.thumb.setPosition(this.centerX + dx, this.centerY + dy);
    this.vector.x = dx / this.radius;
    this.vector.y = dy / this.radius;
  }
}