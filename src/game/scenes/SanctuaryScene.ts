import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { BUILDINGS, buildingCost } from "../../data/gameConfig";
import type { BuildingConfig } from "../../data/gameConfig";
import type { BuildingId } from "../../types";
import { GameManager } from "../../managers/GameManager";
import { onEvent, offEvent } from "../../utils/events";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";

interface RowRefs {
  levelText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  btn: Button;
}

export class SanctuaryScene extends Phaser.Scene {
  private rows: RowRefs[] = [];
  private coinsText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  private boundEco: (p: { coins: number; gems: number }) => void = () => this.refresh();

  constructor() {
    super("Sanctuary");
  }

  create(): void {
    const W = GAME.width;
    const gm = GameManager.instance;
    gradientBg(this, 0x20304f, 0x0d1226);
    softOrb(this, 90, 240, 120, 0x38d9ff, 0.1);
    softOrb(this, W - 90, 900, 170, 0x69db7c, 0.08);

    // Header
    this.add
      .text(W / 2, 120, "SANCTUARY", {
        fontSize: "58px",
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

    // Currency
    roundedRectTexture(this, "chip_coins", 260, 64, 32, 0x1a2342, 0x131a33, 0x3b4a7a);
    roundedRectTexture(this, "chip_gems", 260, 64, 32, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(W / 2 - 150, 210, "chip_coins").setDepth(1);
    this.add.image(W / 2 - 234, 210, "coin").setDepth(2);
    this.coinsText = this.add
      .text(W / 2 - 196, 210, "0", { fontSize: "26px", fontStyle: "bold", color: "#ffd76b" })
      .setOrigin(0, 0.5)
      .setDepth(2);
    this.add.image(W / 2 + 150, 210, "chip_gems").setDepth(1);
    this.add.image(W / 2 + 66, 210, "gem").setDepth(2);
    this.gemsText = this.add
      .text(W / 2 + 104, 210, "0", { fontSize: "26px", fontStyle: "bold", color: "#5ee0f5" })
      .setOrigin(0, 0.5)
      .setDepth(2);

    // Lumi + account level
    this.add.image(110, 330, "lumi").setScale(1.15);
    this.lvlText = this.add
      .text(180, 318, "Account Level 1", { fontSize: "24px", fontStyle: "bold", color: "#ffffff" })
      .setOrigin(0, 0.5);
    this.add
      .text(180, 350, "Buildings & creatures persist across runs.", {
        fontSize: "16px",
        color: "#8fa3d9",
      })
      .setOrigin(0, 0.5);

    // Creatures area
    roundedRectTexture(this, "crea_panel", 620, 130, 24, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(W / 2, 470, "crea_panel");
    const owned = gm.creatures.getOwned();
    if (owned.length === 0) {
      this.add.text(W / 2 - 270, 442, "🐾", { fontSize: "40px" }).setOrigin(0, 0.5);
      this.add
        .text(W / 2 - 210, 440, "No creatures yet", { fontSize: "22px", fontStyle: "bold", color: "#ffffff" })
        .setOrigin(0, 0.5);
      this.add
        .text(W / 2 - 210, 472, "Defeat the Ancient Golem to find Mysterious Eggs!", {
          fontSize: "15px",
          color: "#8fa3d9",
        })
        .setOrigin(0, 0.5);
    } else {
      this.add.text(W / 2 - 270, 448, "🐾", { fontSize: "44px" }).setOrigin(0, 0.5);
      owned.slice(0, 4).forEach((inst, i) => {
        const def = gm.creatures.getDef(inst.defId);
        if (def) {
          this.add
            .text(W / 2 - 200 + i * 78, 448, def.emoji, { fontSize: "42px" })
            .setOrigin(0.5);
        }
      });
      this.add
        .text(W / 2 - 200 + Math.min(owned.length, 4) * 78 - 39, 500, owned.length + " creatures", {
          fontSize: "15px",
          color: "#9fb0e0",
        })
        .setOrigin(0.5);
      new Button(this, W / 2 + 225, 470, 150, 56, "View all", () => {
        gm.audio.play("uiClick");
        this.scene.start("Creatures");
      }, { color: 0x38b26a, fontSize: 18 });
    }

    // Buildings
    this.add
      .text(W / 2, 620, "BUILDINGS", {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffd76b",
        stroke: "#101426",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const ids = Object.keys(BUILDINGS) as BuildingId[];
    ids.forEach((id, i) => this.buildBuildingRow(i, BUILDINGS[id]));

    onEvent("economy-changed", this.boundEco);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offEvent("economy-changed", this.boundEco);
    });

    this.refresh();
  }

  private buildBuildingRow(i: number, def: BuildingConfig): void {
    const W = GAME.width;
    const y = 700 + i * 140;
    const panelKey = "bld_" + def.id;
    roundedRectTexture(this, panelKey, 620, 126, 22, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(W / 2, y, panelKey);
    this.add.text(W / 2 - 260, y - 10, def.emoji, { fontSize: "44px" }).setOrigin(0, 0.5);
    this.add
      .text(W / 2 - 190, y - 28, def.name, { fontSize: "24px", fontStyle: "bold", color: "#ffffff" })
      .setOrigin(0, 0.5);
    const levelText = this.add
      .text(W / 2 - 190, y + 6, "Level 0", { fontSize: "19px", color: "#9fb0e0" })
      .setOrigin(0, 0.5);
    this.add
      .text(W / 2 - 190, y + 36, def.description, { fontSize: "14px", color: "#7f90c0" })
      .setOrigin(0, 0.5);
    const costText = this.add
      .text(W / 2 + 232, y + 38, "", { fontSize: "17px", fontStyle: "bold", color: "#ffd76b" })
      .setOrigin(0.5);
    const btn = new Button(this, W / 2 + 232, y - 18, 176, 56, "Upgrade", () => this.upgrade(def.id), {
      color: 0x38b26a,
      fontSize: 19,
    });
    this.rows.push({ levelText, costText, btn });
  }

  private upgrade(id: BuildingId): void {
    const gm = GameManager.instance;
    const level = gm.save.get().sanctuary[id] ?? 0;
    const cost = buildingCost(id, level);
    if (gm.economy.spendCoins(cost)) {
      gm.save.update((d) => {
        d.sanctuary[id] += 1;
      });
      gm.audio.play("chest");
      this.cameras.main.flash(120, 90, 220, 120);
    } else {
      gm.audio.play("error");
    }
    this.refresh();
  }

  private refresh(): void {
    const gm = GameManager.instance;
    const save = gm.save.get();
    this.coinsText.setText(String(gm.economy.coins));
    this.gemsText.setText(String(gm.economy.gems));
    this.lvlText.setText("Account Level " + save.account.level);
    const ids = Object.keys(BUILDINGS) as BuildingId[];
    this.rows.forEach((row, i) => {
      const id = ids[i];
      const level = save.sanctuary[id] ?? 0;
      const cost = buildingCost(id, level);
      row.levelText.setText("Level " + level);
      row.costText.setText(cost + " 🪙");
      row.btn.setDisabled(gm.economy.coins < cost);
    });
  }
}