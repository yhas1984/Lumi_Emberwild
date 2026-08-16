import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { onEvent, offEvent } from "../../utils/events";
import { roundedRectTexture } from "../../utils/textureFactory";
import { formatTime } from "../../utils/math";
import { Button } from "./Button";

// In-run HUD: hp/xp bars, level, timer, coins, pause and boss bar.
export class Hud {
  onPause: (() => void) | null = null;

  private scene: Phaser.Scene;
  private hpFill: Phaser.GameObjects.Image;
  private xpFill: Phaser.GameObjects.Image;
  private levelText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private coinsText: Phaser.GameObjects.Text;
  private bossBarWrap: Phaser.GameObjects.Container;
  private bossFill: Phaser.GameObjects.Image;
  private pauseBtn: Button | null = null;
  private boundHp: (p: { current: number; max: number }) => void;
  private boundXp: (p: { level: number; xp: number; toNext: number }) => void;
  private boundEco: (p: { coins: number; gems: number }) => void;
  private boundBossStart: () => void;
  private boundBossHp: (p: { current: number; max: number }) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const W = GAME.width;
    roundedRectTexture(scene, "hud_bar_bg", 230, 28, 14, 0x101733, 0x101733, 0x4a5a8c);
    roundedRectTexture(scene, "hud_bar_fill", 230, 28, 14, 0xffffff, 0xffffff, null);

    // HP bar
    const hpX = 196;
    const hpY = 78;
    scene.add.image(hpX, hpY, "hud_bar_bg").setScrollFactor(0).setDepth(60);
    this.hpFill = scene.add
      .image(hpX - 115, hpY, "hud_bar_fill")
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(61)
      .setTint(0x69db7c);
    this.hpFill.setDisplaySize(226, 24);

    // XP bar
    const xpX = 196;
    const xpY = 106;
    scene.add.image(xpX, xpY, "hud_bar_bg").setScrollFactor(0).setDepth(60).setDisplaySize(150, 16);
    this.xpFill = scene.add
      .image(xpX - 75, xpY, "hud_bar_fill")
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(61)
      .setTint(0x38d9ff);
    this.xpFill.setDisplaySize(146, 12);

    // Level badge
    scene.add
      .circle(50, 92, 30, 0x1a2342, 1)
      .setStrokeStyle(3, 0xffffff, 0.85)
      .setScrollFactor(0)
      .setDepth(60);
    this.levelText = scene.add
      .text(50, 92, "Lv 1", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(61);

    // Timer
    this.timerText = scene.add
      .text(W / 2, 60, "5:00", {
        fontSize: "40px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60);

    // Coins
    scene.add.image(W - 148, 72, "coin").setScrollFactor(0).setDepth(60);
    this.coinsText = scene.add
      .text(W - 118, 72, "0", {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffd76b",
        stroke: "#101426",
        strokeThickness: 5,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(61);

    // Pause button
    this.pauseBtn = new Button(scene, W - 44, 62, 60, 60, "❚❚", () => {
      if (this.onPause) {
        this.onPause();
      }
    }, { color: 0x3b4a7a, fontSize: 22, radius: 30 });
    this.pauseBtn.setScrollFactor(0).setDepth(62);

    // Boss bar (hidden until boss)
    this.bossBarWrap = scene.add.container(0, 0).setDepth(58).setVisible(false);
    const bbX = W / 2;
    const bbY = 148;
    const bbBg = scene.add.image(bbX, bbY, "hud_bar_bg").setDisplaySize(520, 30);
    this.bossFill = scene.add
      .image(bbX - 260, bbY, "hud_bar_fill")
      .setOrigin(0, 0.5)
      .setTint(0xff5f7a)
      .setDisplaySize(516, 26);
    const bossName = scene.add
      .text(bbX, bbY - 32, "ANCIENT GOLEM", {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ff8a8a",
        stroke: "#101426",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.bossBarWrap.add([bbBg, this.bossFill, bossName]);
    this.bossBarWrap.setScrollFactor(0);

    this.coinsText.setText(String(GameManager.instance.economy.coins));

    this.boundHp = (p) => this.setHealth(p.current, p.max);
    this.boundXp = (p) => this.setXp(p.level, p.xp, p.toNext);
    this.boundEco = (p) => this.coinsText.setText(String(p.coins));
    this.boundBossStart = () => this.bossBarWrap.setVisible(true);
    this.boundBossHp = (p) => this.setBossHealth(p.current, p.max);
    onEvent("player-health", this.boundHp);
    onEvent("player-xp", this.boundXp);
    onEvent("economy-changed", this.boundEco);
    onEvent("boss-start", this.boundBossStart);
    onEvent("boss-health", this.boundBossHp);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setHealth(current: number, max: number): void {
    const pct = max > 0 ? Math.max(0, current / max) : 0;
    this.hpFill.setDisplaySize(226 * pct, 24);
  }

  setXp(level: number, xp: number, toNext: number): void {
    const pct = toNext > 0 ? Math.min(1, xp / toNext) : 0;
    this.xpFill.setDisplaySize(146 * pct, 12);
    this.levelText.setText("Lv " + level);
  }

  setBossHealth(current: number, max: number): void {
    const pct = max > 0 ? Math.max(0, current / max) : 0;
    this.bossFill.setDisplaySize(516 * pct, 26);
  }

  /** Visual feedback when the pause tap zone triggers. */
  flashPauseButton(): void {
    if (this.pauseBtn) {
      this.scene.tweens.add({ targets: this.pauseBtn, scale: 0.85, duration: 70, yoyo: true });
    }
  }

  setTimer(secondsLeft: number): void {
    this.timerText.setText(formatTime(Math.max(0, secondsLeft)));
  }

  showBossIncoming(): void {
    this.bossBarWrap.setVisible(true);
  }

  destroy(): void {
    offEvent("player-health", this.boundHp);
    offEvent("player-xp", this.boundXp);
    offEvent("economy-changed", this.boundEco);
    offEvent("boss-start", this.boundBossStart);
    offEvent("boss-health", this.boundBossHp);
  }
}
