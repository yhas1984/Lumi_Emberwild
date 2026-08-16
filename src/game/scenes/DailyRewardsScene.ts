import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { DAILY_REWARDS } from "../../data/dailyRewards";
import { GameManager } from "../../managers/GameManager";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";
import { toHexColor } from "../../systems/FloatingText";

// Seven-day login calendar with streak protection.
export class DailyRewardsScene extends Phaser.Scene {
  constructor() {
    super("DailyRewards");
  }

  create(): void {
    const W = GAME.width;
    const gm = GameManager.instance;
    gradientBg(this, 0x20304f, 0x0d1226);
    softOrb(this, 90, 240, 130, 0xffd76b, 0.12);
    softOrb(this, W - 90, 860, 160, 0xa45cff, 0.1);

    this.add
      .text(W / 2, 140, "DAILY REWARDS", {
        fontSize: "44px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    new Button(this, 62, 84, 76, 76, "←", () => {
      gm.audio.play("uiClick");
      GameManager.instance.nav.showMenu();
    }, { color: 0x2c3a5e, fontSize: 32, radius: 38 });

    const dayNumber = gm.daily.dayNumber();
    this.add
      .text(W / 2, 210, "Day " + dayNumber + " of 7  ·  login streak protected", {
        fontSize: "22px",
        color: "#b8c4ff",
      })
      .setOrigin(0.5);

    // 7 day slots
    DAILY_REWARDS.forEach((def, i) => {
      const x = W / 2 - 288 + i * 96;
      const y = 380;
      const isClaimed = i + 1 < dayNumber;
      const isCurrent = i + 1 === dayNumber;
      const key = "daily_slot_" + def.day;
      roundedRectTexture(this, key, 84, 120, 16, 0x1a2342, 0x131a33, isCurrent ? 0xffd76b : 0x3b4a7a);
      this.add.image(x, y, key);
      this.add
        .text(x, y - 40, "DAY " + def.day, { fontSize: "14px", fontStyle: "bold", color: isClaimed ? "#7f90c0" : "#e8ecff" })
        .setOrigin(0.5);
      const rewardLabel = this.rewardLabel(def);
      this.add
        .text(x, y + 2, rewardLabel, { fontSize: "17px", fontStyle: "bold", color: isCurrent ? "#ffd76b" : "#c6d2ff" })
        .setOrigin(0.5);
      if (isClaimed) {
        this.add
          .text(x, y + 42, "✓ CLAIMED", { fontSize: "12px", fontStyle: "bold", color: "#69db7c" })
          .setOrigin(0.5);
      } else if (isCurrent) {
        this.add
          .text(x, y + 42, "NEXT", { fontSize: "12px", fontStyle: "bold", color: "#ffd76b" })
          .setOrigin(0.5);
        this.tweens.add({ targets: this.children.getAt(this.children.length - 1), alpha: 0.5, duration: 500, yoyo: true, repeat: -1 });
      }
    });

    const canClaim = gm.daily.canClaim();
    const claimBtn = new Button(this, W / 2, 640, 400, 104, "", () => this.claim(), {
      color: 0xffb02e,
      fontSize: 30,
    });
    if (canClaim) {
      claimBtn.setLabel("CLAIM DAY " + dayNumber);
    } else {
      claimBtn.setLabel("Come back tomorrow!");
      claimBtn.setDisabled(true);
    }

    this.add
      .text(W / 2, 760, "Missing a day doesn't break your chain: one missed day is forgiven.", {
        fontSize: "17px",
        color: "#8fa3d9",
      })
      .setOrigin(0.5);
  }

  private rewardLabel(def: (typeof DAILY_REWARDS)[number]): string {
    if (def.type === "coins") {
      return def.amount + " 🪙";
    }
    if (def.type === "gems") {
      return def.amount + " 💎";
    }
    return "Chest";
  }

  private claim(): void {
    const gm = GameManager.instance;
    const def = gm.daily.claim();
    if (def) {
      gm.audio.play("chest");
      this.cameras.main.flash(160, 255, 220, 120);
      this.scene.restart();
    } else {
      gm.audio.play("error");
    }
  }
}