import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";

// Settings: sfx / screen shake toggles, stats link and reset save.
export class SettingsScene extends Phaser.Scene {
  private sfxBtn!: Button;
  private shakeBtn!: Button;
  private resetBtn!: Button;
  private resetArmed = false;

  constructor() {
    super("Settings");
  }

  create(): void {
    const W = GAME.width;
    const gm = GameManager.instance;
    gradientBg(this, 0x1a2440, 0x0d1226);
    softOrb(this, 90, 240, 120, 0x3fa9f5, 0.1);

    this.add
      .text(W / 2, 130, "SETTINGS", {
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

    this.sfxBtn = new Button(this, W / 2, 320, 420, 96, "", () => this.toggleSfx(), { color: 0x3b4a7a, fontSize: 26 });
    this.shakeBtn = new Button(this, W / 2, 450, 420, 96, "", () => this.toggleShake(), { color: 0x3b4a7a, fontSize: 26 });

    new Button(this, W / 2, 590, 420, 96, "📊 View Statistics", () => {
      gm.audio.play("uiClick");
      this.scene.start("Stats");
    }, { color: 0x38b26a, fontSize: 26 });

    this.resetBtn = new Button(this, W / 2, 740, 420, 96, "Reset Save", () => this.resetSave(), { color: 0xc94f4f, fontSize: 26 });

    const user = gm.auth.getUser();
    this.add
      .text(W / 2, 850, "Player ID: " + (user ? user.playerId : "not signed in"), {
        fontSize: "17px",
        color: "#8fa3d9",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 900, "Statistics and retention are stored locally in this browser.", {
        fontSize: "17px",
        color: "#8fa3d9",
      })
      .setOrigin(0.5);

    this.refresh();
  }

  private toggleSfx(): void {
    const gm = GameManager.instance;
    gm.save.update((d) => {
      d.settings.sfx = !d.settings.sfx;
    });
    gm.audio.setSfx(gm.save.get().settings.sfx);
    gm.audio.play("uiClick");
    this.refresh();
  }

  private toggleShake(): void {
    const gm = GameManager.instance;
    gm.save.update((d) => {
      d.settings.shake = !d.settings.shake;
    });
    gm.audio.play("uiClick");
    this.refresh();
  }

  private resetSave(): void {
    const gm = GameManager.instance;
    if (!this.resetArmed) {
      this.resetArmed = true;
      this.resetBtn.setLabel("Tap again to confirm!");
      this.resetBtn.setColor(0xff5f7a);
      gm.audio.play("error");
      this.time.delayedCall(3000, () => {
        this.resetArmed = false;
        this.resetBtn.setLabel("Reset Save");
        this.resetBtn.setColor(0xc94f4f);
      });
      return;
    }
    gm.resetSave();
    gm.analyticsManager.reset();
    this.scene.start("MainMenu");
  }

  private refresh(): void {
    const settings = GameManager.instance.save.get().settings;
    this.sfxBtn.setLabel("Sound effects: " + (settings.sfx ? "ON" : "OFF"));
    this.shakeBtn.setLabel("Screen shake: " + (settings.shake ? "ON" : "OFF"));
    this.sfxBtn.setColor(settings.sfx ? 0x38b26a : 0x5a5a6a);
    this.shakeBtn.setColor(settings.shake ? 0x38b26a : 0x5a5a6a);
  }
}