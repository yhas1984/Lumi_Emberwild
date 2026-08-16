import Phaser from "phaser";
import { emitEvent } from "../utils/events";

// Meta scenes that live on the Phaser canvas (outside the React shell).
const META_SCENES = [
  "Sanctuary",
  "Creatures",
  "Missions",
  "DailyRewards",
  "Shop",
  "Settings",
  "Stats",
  "Victory",
  "Defeat",
  "Pause",
  "LevelUp",
  "EggHatch",
  "Revive",
  "DebugPanel",
  "Placeholder",
];

// Bridges Phaser scenes and the React UI shell.
// The shell shows the menu; gameplay and meta screens run on the canvas.
export class NavigationManager {
  private game: Phaser.Game | null = null;
  private shellVisible = false;

  attach(game: Phaser.Game): void {
    this.game = game;
  }

  isShellVisible(): boolean {
    return this.shellVisible;
  }

  private stopScenes(except?: string): void {
    if (!this.game) {
      return;
    }
    const sm = this.game.scene;
    for (const key of META_SCENES) {
      if (key !== except && sm.isActive(key)) {
        sm.stop(key);
      }
    }
    if (except !== "Game" && sm.isActive("Game")) {
      sm.stop("Game");
    }
  }

  private setShell(visible: boolean): void {
    if (this.shellVisible === visible) {
      return;
    }
    this.shellVisible = visible;
    emitEvent("shell-visible", { visible });
  }

  /** Shows the React menu shell and stops all canvas scenes. */
  showMenu(): void {
    this.stopScenes();
    this.setShell(true);
  }

  /** Starts a run on the canvas and hides the shell. */
  startGame(): void {
    if (!this.game) {
      return;
    }
    this.stopScenes();
    this.setShell(false);
    this.game.scene.start("Game");
  }

  /** Starts a meta scene on the canvas and hides the shell. */
  showScene(key: string, data?: object): void {
    if (!this.game) {
      return;
    }
    this.stopScenes(key);
    this.setShell(false);
    this.game.scene.start(key, data);
  }
}
