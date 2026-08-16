import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { CREATURE_LIST } from "../../data/creatures";
import { RARITY_COLORS, RARITY_LABELS } from "../../data/rarity";
import { GameManager } from "../../managers/GameManager";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";
import { toHexColor } from "../../systems/FloatingText";
import { shadeColor } from "../ui/Button";

// Creature collection gallery: owned creatures vs locked silhouettes.
export class CreaturesScene extends Phaser.Scene {
  constructor() {
    super("Creatures");
  }

  create(): void {
    const W = GAME.width;
    const gm = GameManager.instance;
    gradientBg(this, 0x1c2750, 0x0d1226);
    softOrb(this, 90, 240, 120, 0x38d9ff, 0.1);
    softOrb(this, W - 90, 900, 150, 0xb88fd8, 0.1);

    this.add
      .text(W / 2, 130, "CREATURES", {
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

    const owned = gm.creatures.getOwned();
    this.add
      .text(W / 2, 210, owned.length + " / " + CREATURE_LIST.length + " found", {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#b8c4ff",
      })
      .setOrigin(0.5);

    CREATURE_LIST.forEach((def, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = W / 2 - 160 + col * 320;
      const y = 330 + row * 240;
      const inst = owned.find((c) => c.defId === def.id);
      const color = RARITY_COLORS[def.rarity];
      const key = "crea_card_" + def.id;
      roundedRectTexture(this, key, 290, 220, 24, 0x1a2342, 0x131a33, color);
      this.add.image(x, y, key);

      if (inst) {
        this.add.text(x, y - 62, def.emoji, { fontSize: "64px" }).setOrigin(0.5);
        this.add
          .text(x, y - 8, def.name, { fontSize: "24px", fontStyle: "bold", color: "#ffffff" })
          .setOrigin(0.5);
        this.add
          .text(x, y + 20, RARITY_LABELS[def.rarity].toUpperCase() + " · Lv " + inst.level, {
            fontSize: "16px",
            fontStyle: "bold",
            color: toHexColor(shadeColor(color, 1.4)),
          })
          .setOrigin(0.5);
        this.add
          .text(x, y + 52, def.description, { fontSize: "15px", color: "#9fb0e0" })
          .setOrigin(0.5);
      } else {
        this.add.text(x, y - 62, "❔", { fontSize: "64px", color: "#4a5578" }).setOrigin(0.5);
        this.add
          .text(x, y - 8, "???", { fontSize: "24px", fontStyle: "bold", color: "#4a5578" })
          .setOrigin(0.5);
        this.add
          .text(x, y + 20, "NOT FOUND YET", { fontSize: "15px", fontStyle: "bold", color: "#4a5578" })
          .setOrigin(0.5);
        this.add
          .text(x, y + 52, "Defeat the Ancient Golem and open eggs!", {
            fontSize: "13px",
            color: "#4a5578",
          })
          .setOrigin(0.5);
      }
    });
  }
}