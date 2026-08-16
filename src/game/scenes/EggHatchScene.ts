import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { RARITY_COLORS, RARITY_LABELS } from "../../data/rarity";
import { GameManager } from "../../managers/GameManager";
import type { HatchResult } from "../../managers/CreatureManager";
import { Particles } from "../../systems/Particles";
import { Button } from "../ui/Button";
import { toHexColor } from "../../systems/FloatingText";
import { shadeColor } from "../ui/Button";

// Mystery Egg reveal: tap anywhere -> shake -> glow -> creature (repeat per egg).
export class EggHatchScene extends Phaser.Scene {
  private eggsLeft = 1;
  private hatching = false;
  private revealed = false;
  private hatchStartedAt = 0;
  private hatchResult: HatchResult | null = null;
  private eggImg!: Phaser.GameObjects.Image;
  private hint!: Phaser.GameObjects.Text;
  private continueBtn: Button | null = null;

  constructor() {
    super("EggHatch");
  }

  create(data: { count?: number }): void {
    const W = GAME.width;
    const H = GAME.height;
    // Phaser reuses the scene instance across launches: reset ALL state here.
    this.eggsLeft = Math.max(1, data?.count ?? 1);
    this.hatching = false;
    this.revealed = false;
    this.hatchResult = null;
    this.hatchStartedAt = 0;
    this.continueBtn = null;

    this.scene.bringToTop();
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x070a18, 0.82).setDepth(-1);
    // Tap anywhere hatches the current egg (robust and touch friendly).
    dim.setInteractive();
    dim.on("pointerdown", () => this.hatchOne());

    this.add
      .text(W / 2, 200, "MYSTERIOUS EGG", {
        fontSize: "46px",
        fontStyle: "bold",
        color: "#ffd76b",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.eggImg = this.add.image(W / 2, 430, "egg").setScale(1.5).setDepth(2);
    this.tweens.add({
      targets: this.eggImg,
      y: 430 - 14,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.eggImg.setInteractive({ useHandCursor: true });
    this.eggImg.on("pointerdown", () => this.hatchOne());

    this.hint = this.add
      .text(W / 2, 560, this.eggsLeft > 1 ? "Tap the egg to hatch it! (" + this.eggsLeft + " eggs)" : "Tap the egg to hatch it!", {
        fontSize: "24px",
        color: "#c6d2ff",
      })
      .setOrigin(0.5);
  }

  private hatchOne(): void {
    if (this.hatching) {
      return;
    }
    this.hatching = true;
    this.revealed = false;
    // The reward is granted synchronously: it can never be lost.
    try {
      this.hatchResult = GameManager.instance.creatures.hatchEgg();
    } catch (err) {
      console.error("[eh] hatchEgg failed", err);
      this.hatching = false;
      return;
    }
    this.hatchStartedAt = this.time.now;
    this.eggImg.disableInteractive();
    this.tweens.killTweensOf(this.eggImg);
    // Visual shake (fire and forget).
    this.tweens.add({
      targets: this.eggImg,
      angle: { from: -14, to: 14 },
      scale: { from: 1.5, to: 1.15 },
      duration: 70,
      repeat: 5,
      yoyo: true,
    });
  }

  // Reveal fallback driven by the scene update (proven to tick), so the
  // presentation cannot get stuck even if timers/tweens misbehave.
  update(time: number): void {
    if (this.hatching && !this.revealed && this.hatchResult && time - this.hatchStartedAt > 1200) {
      this.reveal(this.hatchResult);
    }
  }

  private reveal(result: HatchResult): void {
    if (this.revealed) {
      return;
    }
    this.revealed = true;
    const W = GAME.width;
    const gm = GameManager.instance;
    const def = gm.creatures.getDef(result.defId);
    this.cameras.main.flash(180, 255, 235, 160);
    this.eggImg.setScale(1.7);
    const particles = new Particles(this);
    particles.burst(this.eggImg.x, this.eggImg.y, 0xb88fd8, 22, 280);
    particles.burst(this.eggImg.x, this.eggImg.y, 0xffd76b, 12, 200);
    this.eggImg.destroy();
    if (!def) {
      this.finish();
      return;
    }
    const color = RARITY_COLORS[def.rarity];
    const glow = this.add.circle(W / 2, 420, 120, color, 0.25).setDepth(2);
    const emoji = this.add.text(W / 2, 420, def.emoji, { fontSize: "110px" }).setOrigin(0.5).setDepth(3);
    emoji.setScale(0);
    this.tweens.add({ targets: emoji, scale: 1, duration: 420, ease: "Back.easeOut" });
    this.tweens.add({
      targets: glow,
      scale: 1.25,
      alpha: 0.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(W / 2, 560, result.isNew ? "NEW CREATURE!" : "LEVEL UP!", {
        fontSize: "34px",
        fontStyle: "bold",
        color: toHexColor(shadeColor(color, 1.4)),
        stroke: "#101426",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 600, def.name + "  ·  Lv " + result.level, {
        fontSize: "40px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 650, RARITY_LABELS[def.rarity].toUpperCase() + "  ·  " + def.description, {
        fontSize: "20px",
        color: "#c6d2ff",
      })
      .setOrigin(0.5);

    this.eggsLeft -= 1;
    if (this.eggsLeft > 0) {
      // Ready for the next egg: a tap anywhere continues the flow.
      this.hatching = false;
      this.hatchResult = null;
      this.hint.setText("A new egg is waiting! (" + this.eggsLeft + " left)");
      this.continueBtn = new Button(this, W / 2, 880, 320, 88, "HATCH NEXT", () => this.nextEgg(), {
        color: 0xffb02e,
        fontSize: 26,
      });
    } else {
      this.hint.setText("All eggs hatched!");
      this.continueBtn = new Button(this, W / 2, 880, 320, 88, "Continue", () => this.finish(), {
        color: 0x38b26a,
        fontSize: 28,
      });
    }
  }

  private nextEgg(): void {
    if (this.continueBtn) {
      this.continueBtn.destroy();
      this.continueBtn = null;
    }
    const W = GAME.width;
    this.eggImg = this.add.image(W / 2, 430, "egg").setScale(1.5).setDepth(2);
    this.tweens.add({
      targets: this.eggImg,
      y: 430 - 14,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.eggImg.setInteractive({ useHandCursor: true });
    this.eggImg.on("pointerdown", () => this.hatchOne());
    this.hatching = false;
    this.revealed = false;
    this.hatchResult = null;
  }

  private finish(): void {
    GameManager.instance.audio.play("uiClick");
    this.scene.stop();
  }
}