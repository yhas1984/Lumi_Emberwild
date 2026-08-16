import Phaser from "phaser";
import { roundedRectTexture } from "../../utils/textureFactory";
import { GameManager } from "../../managers/GameManager";

export function shadeColor(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((color & 255) * factor));
  return (r << 16) | (g << 8) | b;
}

export interface ButtonOptions {
  color?: number;
  textColor?: string;
  fontSize?: number;
  emoji?: string;
  radius?: number;
}

// Rounded premium button with press/release tween animation.
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private onClick: () => void;
  private isDown = false;
  private disabled = false;
  private baseW: number;
  private baseH: number;
  private baseRadius: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    opts: ButtonOptions = {}
  ) {
    super(scene, x, y);
    const color = opts.color ?? 0x5b7cfa;
    const radius = opts.radius ?? Math.min(26, h / 2);
    this.baseW = w;
    this.baseH = h;
    this.baseRadius = radius;
    const key = "btn_" + w + "_" + h + "_" + radius + "_" + color;
    roundedRectTexture(scene, key, w, h, radius, shadeColor(color, 1.18), shadeColor(color, 0.62), 0xffffff);
    this.bg = scene.add.image(0, 0, key);
    this.bg.setInteractive({ useHandCursor: true });
    this.onClick = onClick;
    const fontSize = opts.fontSize ?? Math.max(20, Math.round(h * 0.3));
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: fontSize + "px",
        fontStyle: "bold",
        color: opts.textColor ?? "#ffffff",
        stroke: "rgba(0,0,0,0.45)",
        strokeThickness: 4,
        align: "center",
      })
      .setOrigin(0.5);
    const children: Phaser.GameObjects.GameObject[] = [this.bg, this.label];
    if (opts.emoji) {
      const emojiText = scene.add
        .text(-w / 2 + 38, 0, opts.emoji, { fontSize: (fontSize + 8) + "px" })
        .setOrigin(0.5);
      children.push(emojiText);
    }
    this.add(children);
    scene.add.existing(this);
    this.bg.on("pointerdown", () => this.press());
    this.bg.on("pointerup", () => this.release());
    this.bg.on("pointerout", () => this.cancel());
  }

  private press(): void {
    if (this.disabled) {
      return;
    }
    this.isDown = true;
    GameManager.instance.audio.play("uiClick");
    this.scene.tweens.add({ targets: this, scale: 0.94, duration: 55, ease: "Quad.easeOut" });
  }

  private release(): void {
    if (!this.isDown) {
      return;
    }
    this.isDown = false;
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 80,
      ease: "Back.easeOut",
      onComplete: () => {
        if (!this.disabled) {
          this.onClick();
        }
      },
    });
  }

  private cancel(): void {
    this.isDown = false;
    this.scene.tweens.add({ targets: this, scale: 1, duration: 60 });
  }

  setDisabled(v: boolean): void {
    this.disabled = v;
    this.bg.setAlpha(v ? 0.55 : 1);
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  setColor(color: number): void {
    const key = "btn_" + this.baseW + "_" + this.baseH + "_" + this.baseRadius + "_" + color;
    roundedRectTexture(this.scene, key, this.baseW, this.baseH, this.baseRadius, shadeColor(color, 1.18), shadeColor(color, 0.62), 0xffffff);
    this.bg.setTexture(key);
  }
}