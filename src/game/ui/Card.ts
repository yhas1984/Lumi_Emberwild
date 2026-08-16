import Phaser from "phaser";
import type { AbilityDef } from "../../types";
import { abilityDesc } from "../../data/abilities";
import { RARITY_COLORS, RARITY_LABELS } from "../../data/rarity";
import { roundedRectTexture } from "../../utils/textureFactory";
import { romanNumeral } from "../../utils/math";
import { toHexColor } from "../../systems/FloatingText";
import { shadeColor } from "./Button";

// Level-up choice card with rarity styling.
export class Card extends Phaser.GameObjects.Container {
  private def: AbilityDef;
  private level: number;
  private onPick: () => void;
  private picked = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: AbilityDef,
    level: number,
    onPick: () => void
  ) {
    super(scene, x, y);
    this.def = def;
    this.level = level;
    this.onPick = onPick;
    const w = 200;
    const h = 300;
    const color = RARITY_COLORS[def.rarity];
    const key = "card_" + def.id + "_" + def.rarity;
    roundedRectTexture(scene, key, w, h, 24, shadeColor(color, 1.35), shadeColor(color, 0.45), null);

    const glow = scene.add.graphics();
    glow.fillStyle(color, 0.26);
    glow.fillRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 30);

    const bg = scene.add.image(0, 0, key);
    const emoji = scene.add.text(0, -96, def.emoji, { fontSize: "62px" }).setOrigin(0.5);
    const name = scene.add
      .text(0, -34, def.name, {
        fontSize: "25px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const rarityText = scene.add
      .text(0, -8, RARITY_LABELS[def.rarity].toUpperCase(), {
        fontSize: "14px",
        fontStyle: "bold",
        color: toHexColor(shadeColor(color, 1.55)),
      })
      .setOrigin(0.5);
    const lvlText = scene.add
      .text(0, 26, romanNumeral(level), {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const desc = scene.add
      .text(0, 84, abilityDesc(def, level), {
        fontSize: "16px",
        color: "#e8ecff",
        align: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
        wordWrap: { width: 168 },
      })
      .setOrigin(0.5);

    this.add([glow, bg, emoji, name, rarityText, lvlText, desc]);
    scene.add.existing(this);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on("pointerdown", () => this.press());
    this.on("pointerup", () => this.release());
    this.on("pointerout", () => this.cancel());
  }

  private press(): void {
    if (this.picked) {
      return;
    }
    this.scene.tweens.add({ targets: this, scale: 0.94, duration: 60 });
  }

  private release(): void {
    if (this.picked) {
      return;
    }
    this.picked = true;
    this.scene.tweens.add({
      targets: this,
      scale: 1.1,
      duration: 80,
      yoyo: true,
      onComplete: () => this.onPick(),
    });
  }

  private cancel(): void {
    if (this.picked) {
      return;
    }
    this.scene.tweens.add({ targets: this, scale: 1, duration: 60 });
  }
}
