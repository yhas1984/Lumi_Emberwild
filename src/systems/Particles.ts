import Phaser from "phaser";

// Simple particle bursts (one-off emitters, self cleaning).
export class Particles {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  burst(x: number, y: number, color: number, count = 8, speed = 170, size = 1): void {
    const em = this.scene.add.particles(x, y, "particle", {
      speed: { min: speed * 0.35, max: speed },
      lifespan: { min: 240, max: 480 },
      scale: { start: size, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [color, 0xffffff],
      emitting: false,
    });
    em.setDepth(95);
    em.explode(count);
    this.scene.time.delayedCall(560, () => {
      em.destroy();
    });
  }

  confetti(x: number, y: number, colors: number[]): void {
    const em = this.scene.add.particles(x, y, "ui_dot", {
      speed: { min: 120, max: 420 },
      lifespan: { min: 500, max: 1300 },
      gravityY: 320,
      scale: { start: 1.4, end: 0.4 },
      alpha: { start: 1, end: 0 },
      tint: colors,
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    em.setDepth(95);
    em.explode(26);
    this.scene.time.delayedCall(1400, () => {
      em.destroy();
    });
  }
}
