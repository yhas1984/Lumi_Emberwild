import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { emitEvent } from "../../utils/events";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";

// Dev-only overlay (F2). Only registered when import.meta.env.DEV is true.
export class DebugPanelScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super("DebugPanel");
  }

  create(): void {
    const W = GAME.width;
    const H = GAME.height;
    const gm = GameManager.instance;
    this.scene.bringToTop();
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setDepth(-1).setInteractive();

    roundedRectTexture(this, "dbg_panel", 520, 880, 28, 0x141b38, 0x0d1226, 0x3b4a7a);
    this.add.image(W / 2, H / 2, "dbg_panel");

    this.add
      .text(W / 2, 200, "DEBUG PANEL (dev)", {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#ffd76b",
        stroke: "#101426",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const items: Array<[string, () => void, number?]> = [
      ["+1000 Coins", () => gm.economy.addCoins(1000), 0x38b26a],
      ["+100 Gems", () => gm.economy.addGems(100), 0x3fa9f5],
      ["Level Up", () => emitEvent("debug-level-up", {}), 0xffb02e],
      ["Spawn Boss", () => emitEvent("debug-spawn-boss", {}), 0xff5f7a],
      ["Spawn Chest", () => emitEvent("debug-spawn-chest", {}), 0xb06bff],
      ["Random Creature", () => this.randomCreature(), 0xa45cff],
      ["Reset Save", () => this.resetSave(), 0xc94f4f],
    ];

    items.forEach(([label, fn, color], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = W / 2 - 125 + col * 250;
      const y = 320 + row * 120;
      new Button(this, x, y, 230, 88, label, fn, { color: color ?? 0x4a5a8c, fontSize: 20 });
    });

    this.status = this.add
      .text(W / 2, 880, "", { fontSize: "18px", color: "#b8c4ff" })
      .setOrigin(0.5);

    new Button(this, W / 2, 1040, 220, 80, "Close", () => this.scene.stop(), { color: 0x4a5a8c, fontSize: 24 });
  }

  private randomCreature(): void {
    const result = GameManager.instance.giveRandomCreature();
    const def = GameManager.instance.creatures.getDef(result.defId);
    this.status.setText("Got: " + (def ? def.name : result.defId) + " (Lv " + result.level + ")");
  }

  private resetSave(): void {
    GameManager.instance.resetSave();
    this.scene.stop();
    this.scene.stop("Game");
    GameManager.instance.nav.showMenu();
  }
}