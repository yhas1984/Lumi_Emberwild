import Phaser from "phaser";

// Pooled particle emitters: avoids creating/destroying an emitter per burst
// (reduces GC churn during combat).
export class Particles {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private next = 0;
  private readonly poolSize = 12;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private acquire(): Phaser.GameObjects.Particles.ParticleEmitter {
    const em = this.pool[this.next];
    if (em) {
      this.next = (this.next + 1) % this.poolSize;
      return em;
    }
    const created = this.scene.add.particles(0, 0, "particle", { emitting: false });
    created.setDepth(95);
    this.pool.push(created);
    this.next = (this.next + 1) % this.poolSize;
    return created;
  }

  burst(x: number, y: number, color: number, count = 8, speed = 170, size = 1): void {
    const em = this.acquire();
    em.setPosition(x, y);
    em.setConfig({
      speed: { min: speed * 0.35, max: speed },
      lifespan: { min: 240, max: 480 },
      scale: { start: size, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [color, 0xffffff],
      emitting: false,
    });
    em.explode(count);
  }

  confetti(x: number, y: number, colors: number[]): void {
    const em = this.acquire();
    em.setPosition(x, y);
    em.setConfig({
      speed: { min: 120, max: 420 },
      lifespan: { min: 500, max: 1300 },
      gravityY: 320,
      scale: { start: 1.4, end: 0.4 },
      alpha: { start: 1, end: 0 },
      tint: colors,
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    em.explode(26);
  }
}
