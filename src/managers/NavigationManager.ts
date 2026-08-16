import Phaser from "phaser";
import { emitEvent } from "../utils/events";

// Overlay scenes that still live on the Phaser canvas (gameplay + prompts).
// Meta screens (menu, sanctuary, shop, ...) now render in the React shell.
const OVERLAY_SCENES = [
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
// The shell renders the menu AND the meta screens; gameplay and overlay
// prompts run on the canvas.
export class NavigationManager {
  private game: Phaser.Game | null = null;
  private shellVisible = false;
  screen: string | null = null;
  private overlayReturn: string | null = null;

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
    for (const key of OVERLAY_SCENES) {
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

  private setScreen(screen: string | null): void {
    if (this.screen === screen) {
      return;
    }
    this.screen = screen;
    emitEvent("screen-change", { screen });
  }

  /** Shows the React shell at the main menu and stops all canvas scenes. */
  showMenu(): void {
    this.stopScenes();
    this.setShell(true);
    this.setScreen(null);
  }

  /** Starts a run on the canvas and hides the shell. */
  startGame(): void {
    if (!this.game) {
      return;
    }
    this.stopScenes();
    this.setShell(false);
    this.setScreen(null);
    this.game.scene.start("Game");
  }

  /** Shows a React meta screen inside the shell. */
  showScreen(name: string): void {
    this.stopScenes();
    this.setShell(true);
    this.setScreen(name);
  }

  /** Starts a Phaser scene on the canvas and hides the shell. */
  showScene(key: string, data?: object): void {
    if (!this.game) {
      return;
    }
    this.stopScenes(key);
    this.setShell(false);
    this.setScreen(null);
    this.game.scene.start(key, data);
  }

  /** Shows a canvas overlay; when it finishes it may return to a React screen. */
  showOverlay(key: string, data?: object, returnScreen?: string): void {
    if (!this.game) {
      return;
    }
    this.stopScenes(key);
    this.setShell(false);
    this.overlayReturn = returnScreen ?? null;
    this.game.scene.start(key, data);
  }

  /** Consumed by overlay scenes on finish: returns to a React screen if set. */
  consumeOverlayReturn(): string | null {
    const ret = this.overlayReturn;
    this.overlayReturn = null;
    return ret;
  }
}
