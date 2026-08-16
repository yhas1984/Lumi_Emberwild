import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { gradientBg } from "../ui/Panels";
import { bootStatus } from "../../utils/bootStatus";

export class SplashScene extends Phaser.Scene {
  constructor() {
    super("Splash");
  }

  create(): void {
    bootStatus("Bienvenido a Lumi…");
    const W = GAME.width;
    const H = GAME.height;
    gradientBg(this, 0x1c2750, 0x0b1026);

    const orb = this.add.image(W / 2, H * 0.4, "lumi").setScale(1.5).setAlpha(0);
    this.tweens.add({
      targets: orb,
      scale: 1.8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const title = this.add
      .text(W / 2, H * 0.4 + 130, "LUMI", {
        fontSize: "96px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const sub = this.add
      .text(W / 2, H * 0.4 + 210, "EMBERWILD", {
        fontSize: "34px",
        fontStyle: "bold",
        color: "#ffd76b",
        stroke: "#101426",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const tag = this.add
      .text(W / 2, H * 0.78, "A survivor roguelite prototype", {
        fontSize: "20px",
        color: "#8fa3d9",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: [orb, title, sub, tag], alpha: 1, duration: 600, delay: 150 });

    this.time.delayedCall(1900, () => {
      this.scene.stop();
      GameManager.instance.nav.showMenu();
    });
  }
}