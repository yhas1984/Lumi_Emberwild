import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";

// Generic "coming soon" screen for future systems (Creatures, Missions, Shop, Settings).
export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super("Placeholder");
  }

  create(data: { title?: string }): void {
    const W = GAME.width;
    const H = GAME.height;
    const title = data?.title ?? "Coming Soon";
    gradientBg(this, 0x1a2440, 0x0d1226);
    softOrb(this, 90, 240, 120, 0x3fa9f5, 0.12);
    softOrb(this, W - 90, H - 300, 150, 0xa45cff, 0.1);

    this.add
      .text(W / 2, H * 0.3, "✨", { fontSize: "80px" })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.3 + 90, title, {
        fontSize: "52px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.3 + 160, "Coming soon in a future update!", {
        fontSize: "24px",
        color: "#9fb0e0",
      })
      .setOrigin(0.5);

    new Button(this, W / 2, H * 0.72, 260, 88, "Back", () => {
      GameManager.instance.nav.showMenu();
    }, { color: 0x4a5a8c });
  }
}