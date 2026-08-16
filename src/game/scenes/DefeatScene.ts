import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import type { RunResult } from "../../types";
import { GameManager } from "../../managers/GameManager";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";
import { formatTime } from "../../utils/math";

export class DefeatScene extends Phaser.Scene {
  private result: RunResult;
  private doubleUsed = false;
  private doubleBtn: Button | null = null;

  constructor() {
    super("Defeat");
    this.result = { victory: false, time: 0, kills: 0, coinsEarned: 0, level: 1, eggs: 0, difficulty: "normal", unlockedNext: null };
  }

  create(data: { result?: RunResult }): void {
    const W = GAME.width;
    this.doubleUsed = false;
    const gm = GameManager.instance;
    if (data?.result) {
      this.result = data.result;
    }
    const result = this.result;

    gradientBg(this, 0x35203a, 0x141024);
    softOrb(this, 90, 300, 140, 0xff5f7a, 0.12);
    softOrb(this, W - 90, 540, 160, 0x8b5cf6, 0.1);

    this.add.text(W / 2, 210, "💔", { fontSize: "88px" }).setOrigin(0.5);
    this.add
      .text(W / 2, 320, "RUN ENDED", {
        fontSize: "70px",
        fontStyle: "bold",
        color: "#ff8a8a",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 390, "Lumi has fallen... but the realm remembers.", {
        fontSize: "20px",
        color: "#c6c2ff",
      })
      .setOrigin(0.5);

    const panelY = 520;
    roundedRectTexture(this, "panel_stats", 560, 280, 28, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(W / 2, panelY, "panel_stats");
    const rows: Array<[string, string]> = [
      ["Time survived", formatTime(result.time)],
      ["Enemies defeated", String(result.kills)],
      ["Run level", String(result.level)],
      ["Coins earned", String(result.coinsEarned)],
    ];
    rows.forEach((row, i) => {
      const y = panelY - 90 + i * 50;
      this.add
        .text(W / 2 - 200, y, row[0], { fontSize: "22px", color: "#9fb0e0" })
        .setOrigin(0, 0.5);
      this.add
        .text(W / 2 + 200, y, row[1], { fontSize: "22px", fontStyle: "bold", color: "#ffffff" })
        .setOrigin(1, 0.5);
    });

    let yCursor = 830;
    if (result.eggs > 0) {
      new Button(this, W / 2, yCursor, 420, 80, "🥚 Open Egg" + (result.eggs > 1 ? "s" : "") + " (" + result.eggs + ")", () => {
        gm.audio.play("uiClick");
        this.scene.launch("EggHatch", { count: result.eggs });
      }, { color: 0x8b5cf6, fontSize: 23 });
      yCursor += 90;
    }

    this.doubleBtn = new Button(this, W / 2, yCursor, 420, 80, "DOUBLE REWARDS — WATCH AD", () => this.doubleRewards(), {
      color: 0xffb02e,
      fontSize: 22,
    });
    yCursor += 90;

    new Button(this, W / 2, yCursor, 340, 78, "Try Again", () => {
      gm.audio.play("uiClick");
      GameManager.instance.nav.startGame();
    }, { color: 0x38b26a, fontSize: 28 });
    yCursor += 86;

    new Button(this, W / 2, yCursor, 340, 74, "Sanctuary", () => {
      gm.audio.play("uiClick");
      GameManager.instance.nav.showScreen("sanctuary");
    }, { color: 0x4a5a8c, fontSize: 26 });
    yCursor += 82;

    new Button(this, W / 2, yCursor, 340, 70, "Main Menu", () => {
      gm.audio.play("uiClick");
      GameManager.instance.nav.showMenu();
    }, { color: 0x2c3a5e, fontSize: 24 });
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
      } else {
        gm.audio.play("error");
        this.doubleUsed = false;
      }
    });
  }
}