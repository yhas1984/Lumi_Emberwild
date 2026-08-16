import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { Button } from "../ui/Button";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("Pause");
  }

  create(): void {
    const W = GAME.width;
    const H = GAME.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x070a18, 0.72).setDepth(-1);
    this.add
      .text(W / 2, 300, "PAUSED", {
        fontSize: "72px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    new Button(this, W / 2, 520, 340, 96, "Resume", () => this.resumeGame(), { color: 0x38b26a, fontSize: 34 });
    new Button(this, W / 2, 660, 340, 96, "Restart", () => this.restartRun(), { color: 0x4a5a8c, fontSize: 34 });
    new Button(this, W / 2, 800, 340, 96, "Abandon Run", () => this.quitRun(), { color: 0x8c4a5a, fontSize: 28 });
  }

  private resumeGame(): void {
    GameManager.instance.audio.play("uiClick");
    this.scene.stop();
    this.scene.resume("Game");
  }

  private restartRun(): void {
    GameManager.instance.abandonRun();
    this.scene.stop();
    GameManager.instance.nav.startGame();
  }

  private quitRun(): void {
    GameManager.instance.abandonRun();
    this.scene.stop();
    GameManager.instance.nav.showMenu();
  }
}