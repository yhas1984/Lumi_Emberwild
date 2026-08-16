import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import type { RunResult } from "../../types";
import { GameManager } from "../../managers/GameManager";
import { Particles } from "../../systems/Particles";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";
import { formatTime } from "../../utils/math";
import { randInt } from "../../utils/rng";

export class VictoryScene extends Phaser.Scene {
  private result: RunResult;
  private doubleUsed = false;
  private doubleBtn: Button | null = null;

  constructor() {
    super("Victory");
    this.result = { victory: true, time: 0, kills: 0, coinsEarned: 0, level: 1, eggs: 0 };
  }

  create(data: { result?: RunResult }): void {
    const W = GAME.width;
    const H = GAME.height;
    this.doubleUsed = false;
    const gm = GameManager.instance;
    if (data?.result) {
      this.result = data.result;
    }
    const result = this.result;

    gradientBg(this, 0x2a2f5e, 0x141a38);
    softOrb(this, 90, 320, 150, 0xffd76b, 0.14);
    softOrb(this, W - 90, 560, 170, 0xff7a3d, 0.12);

    const particles = new Particles(this);
    const colors = [0xffd76b, 0xff7a3d, 0x38d9ff, 0xa45cff, 0x69db7c];
    this.time.addEvent({
      delay: 380,
      repeat: 8,
      callback: () => particles.confetti(randInt(80, W - 80), randInt(120, 420), colors),
    });

    this.add.text(W / 2, 200, "🏆", { fontSize: "96px" }).setOrigin(0.5);
    this.add
      .text(W / 2, 320, "VICTORY!", {
        fontSize: "76px",
        fontStyle: "bold",
        color: "#ffd76b",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 392, "The Ancient Golem has fallen!", {
        fontSize: "22px",
        color: "#c6d2ff",
      })
      .setOrigin(0.5);

    // Stats panel
    const panelY = 540;
    roundedRectTexture(this, "panel_stats", 560, 300, 28, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(W / 2, panelY, "panel_stats");
    const rows: Array<[string, string]> = [
      ["Time survived", formatTime(result.time)],
      ["Enemies defeated", String(result.kills)],
      ["Run level", String(result.level)],
      ["Coins earned", String(result.coinsEarned)],
    ];
    rows.forEach((row, i) => {
      const y = panelY - 96 + i * 52;
      this.add
        .text(W / 2 - 200, y, row[0], { fontSize: "23px", color: "#9fb0e0" })
        .setOrigin(0, 0.5);
      this.add
        .text(W / 2 + 200, y, row[1], { fontSize: "23px", fontStyle: "bold", color: "#ffffff" })
        .setOrigin(1, 0.5);
    });

    let yCursor = 880;
    if (result.eggs > 0) {
      new Button(this, W / 2, yCursor, 420, 84, "🥚 Open Egg" + (result.eggs > 1 ? "s" : "") + " (" + result.eggs + ")", () => {
        gm.audio.play("uiClick");
        this.scene.launch("EggHatch", { count: result.eggs });
      }, { color: 0x8b5cf6, fontSize: 24 });
      yCursor += 94;
    }

    this.doubleBtn = new Button(this, W / 2, yCursor, 420, 84, "DOUBLE REWARDS — WATCH AD", () => this.doubleRewards(), {
      color: 0xffb02e,
      fontSize: 23,
    });
    yCursor += 94;

    new Button(this, W / 2, yCursor, 340, 82, "Sanctuary", () => {
      gm.audio.play("uiClick");
      GameManager.instance.nav.showScene("Sanctuary");
    }, { color: 0x38b26a, fontSize: 28 });
    yCursor += 92;

    new Button(this, W / 2, yCursor, 340, 78, "Main Menu", () => {
      gm.audio.play("uiClick");
      GameManager.instance.nav.showMenu();
    }, { color: 0x4a5a8c, fontSize: 26 });
  }

  private doubleRewards(): void {
    if (this.doubleUsed) {
      return;
    }
    const gm = GameManager.instance;
    this.doubleUsed = true;
    gm.analytics.track("rewarded_ad_requested", { placement: "double_rewards" });
    if (this.doubleBtn) {
      this.doubleBtn.setDisabled(true);
      this.doubleBtn.setLabel("Watching ad...");
    }
    gm.ads.watchRewardedAd("double_rewards").then((ok) => {
      if (ok && this.scene.isActive()) {
        gm.economy.addCoins(this.result.coinsEarned);
        gm.audio.play("chest");
        this.cameras.main.flash(180, 255, 220, 120);
        if (this.doubleBtn) {
          this.doubleBtn.setLabel("✓ Double claimed");
        }
        this.add
          .text(GAME.width / 2, 300, "+" + this.result.coinsEarned + " coins (doubled!)", {
            fontSize: "26px",
            fontStyle: "bold",
            color: "#ffd76b",
            stroke: "#101426",
            strokeThickness: 6,
          })
          .setOrigin(0.5);
      } else {
        gm.audio.play("error");
        this.doubleUsed = false;
      }
    });
  }
}