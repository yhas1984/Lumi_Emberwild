import Phaser from "phaser";

export function toHexColor(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}

// Floating damage/feedback numbers.
export class FloatingText {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  add(x: number, y: number, text: string, color: number, size = 24): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: size + "px",
        fontStyle: "bold",
        color: toHexColor(color),
        stroke: "#101426",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(110);
    this.scene.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      scale: { from: 1.15, to: 1 },
      duration: 750,
      ease: "Cubic.easeOut",
      onComplete: () => {
        t.destroy();
      },
    });
  }
}
