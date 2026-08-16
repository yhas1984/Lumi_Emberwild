import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { emitEvent } from "../../utils/events";
import { Button } from "../ui/Button";

// Shown when the player dies: watch a (mocked) rewarded ad to revive once.
export class ReviveScene extends Phaser.Scene {
  constructor() {
    super("Revive");
  }

  create(): void {
    const W = GAME.width;
    const H = GAME.height;
    const gm = GameManager.instance;
    this.scene.bringToTop();
    this.add.rectangle(W / 2, H / 2, W, H, 0x14081c, 0.82).setDepth(-1);

    this.add.text(W / 2, 260, "💫", { fontSize: "90px" }).setOrigin(0.5);
    this.add
      .text(W / 2, 380, "LUMI HAS FALLEN", {
        fontSize: "52px",
        fontStyle: "bold",
        color: "#ff8a8a",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 450, "A mysterious light glows...", {
        fontSize: "24px",
        color: "#c6d2ff",
      })
      .setOrigin(0.5);

    const adBtn = new Button(this, W / 2, 640, 400, 110, "WATCH AD — REVIVE", () => this.watchAd(), {
      color: 0x8b5cf6,
      fontSize: 26,
    });
    const giveUpBtn = new Button(this, W / 2, 800, 320, 88, "Give Up", () => this.giveUp(), {
      color: 0x4a4a5a,
      fontSize: 26,
    });

    const note = this.add
      .text(W / 2, 930, "Mock ad (no real ads in the prototype)", {
        fontSize: "16px",
        color: "#7f7fa0",
      })
      .setOrigin(0.5);

    this.adBtn = adBtn;
    this.giveUpBtn = giveUpBtn;
    this.note = note;
  }

  private adBtn!: Button;
  private giveUpBtn!: Button;
  private note!: Phaser.GameObjects.Text;

  private watchAd(): void {
    const gm = GameManager.instance;
    gm.analytics.track("rewarded_ad_requested", { placement: "revive" });
    this.adBtn.setDisabled(true);
    this.giveUpBtn.setDisabled(true);
    this.adBtn.setLabel("Watching ad...");
    gm.audio.play("uiClick");
    gm.ads.watchRewardedAd("revive").then((ok) => {
      if (this.scene.isActive()) {
        emitEvent("revive-result", { accepted: ok });
        this.scene.stop();
        this.scene.resume("Game");
      }
    });
  }

  private giveUp(): void {
    const gm = GameManager.instance;
    gm.audio.play("uiClick");
    emitEvent("revive-result", { accepted: false });
    this.scene.stop();
    this.scene.resume("Game");
  }
}