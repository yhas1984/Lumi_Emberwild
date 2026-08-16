import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import type { MissionDef } from "../../types";
import { GameManager } from "../../managers/GameManager";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";

interface RowRefs {
  fill: Phaser.GameObjects.Image;
  valueText: Phaser.GameObjects.Text;
  btn: Button;
}

// Data-driven missions: progress from lifetime stats, claim once.
// Two-column grid so the catalog can keep growing.
export class MissionsScene extends Phaser.Scene {
  private rows: RowRefs[] = [];

  constructor() {
    super("Missions");
  }

  create(): void {
    // Scene instances are reused across restarts: reset accumulated state.
    this.rows = [];
    const W = GAME.width;
    const gm = GameManager.instance;
    gradientBg(this, 0x1c2750, 0x0d1226);
    softOrb(this, 90, 240, 120, 0xffd76b, 0.08);
    softOrb(this, W - 90, 900, 150, 0x69db7c, 0.08);

    this.add
      .text(W / 2, 130, "MISSIONS", {
        fontSize: "52px",
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

    roundedRectTexture(this, "mis_bar_s", 240, 16, 8, 0x101733, 0x101733, 0x3b4a7a);
    roundedRectTexture(this, "mis_bar_fill_s", 240, 16, 8, 0xffffff, 0xffffff, null);

    const defs = gm.missions.getDefinitions();
    defs.forEach((def, i) => this.buildCard(i, def));

    this.refresh();
  }

  private buildCard(i: number, def: MissionDef): void {
    const W = GAME.width;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = W / 2 - 160 + col * 320;
    const y = 300 + row * 160;
    const key = "mis_card_" + def.id;
    roundedRectTexture(this, key, 300, 140, 20, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(x, y, key);

    this.add
      .text(x - 130, y - 46, def.title, { fontSize: "20px", fontStyle: "bold", color: "#ffffff" })
      .setOrigin(0, 0.5);
    this.add
      .text(x - 130, y - 20, def.description, { fontSize: "13px", color: "#9fb0e0" })
      .setOrigin(0, 0.5);

    this.add.image(x - 110, y + 26, "mis_bar_s").setOrigin(0, 0.5);
    const fill = this.add
      .image(x - 110, y + 26, "mis_bar_fill_s")
      .setOrigin(0, 0.5)
      .setTint(0xffd76b);
    fill.setDisplaySize(236, 12);

    const valueText = this.add
      .text(x + 130, y + 26, "", { fontSize: "14px", fontStyle: "bold", color: "#ffd76b" })
      .setOrigin(1, 0.5);
    const btn = new Button(this, x, y + 56, 150, 44, "Claim", () => this.claim(def), {
      color: 0x38b26a,
      fontSize: 17,
    });
    this.rows.push({ fill, valueText, btn });
  }

  private claim(def: MissionDef): void {
    const gm = GameManager.instance;
    if (gm.missions.claim(def)) {
      gm.audio.play("chest");
      this.cameras.main.flash(120, 120, 255, 120);
      this.refresh();
    } else {
      gm.audio.play("error");
    }
  }

  private refresh(): void {
    const gm = GameManager.instance;
    const defs = gm.missions.getDefinitions();
    this.rows.forEach((row, i) => {
      const def = defs[i];
      const progress = gm.missions.progressOf(def);
      const value = gm.missions.statValue(def);
      row.fill.setDisplaySize(236 * progress, 12);
      row.fill.setTint(progress >= 1 ? 0x69db7c : 0xffd76b);
      row.valueText.setText(value + " / " + def.goal);
      if (gm.missions.isClaimed(def.id)) {
        row.btn.setLabel("✓");
        row.btn.setDisabled(true);
      } else if (gm.missions.canClaim(def)) {
        row.btn.setLabel("Claim");
        row.btn.setDisabled(false);
      } else {
        row.btn.setLabel("Claim");
        row.btn.setDisabled(true);
      }
    });
  }
}