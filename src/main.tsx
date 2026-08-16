import Phaser from "phaser";
import { createRoot } from "react-dom/client";
import { GAME_CONFIG } from "./config";
import { GameManager } from "./managers/GameManager";
import { bootStatus, bootError } from "./utils/bootStatus";
import { emitEvent } from "./utils/events";
import { App } from "./react/App";

function showError(msg: string): void {
  const el = document.getElementById("boot-error");
  if (el) {
    el.style.display = "block";
    el.textContent += msg + "\n";
  }
}

async function boot(): Promise<void> {
  bootStatus("JS cargado — iniciando juego…");
  await GameManager.init();
  const game = new Phaser.Game(GAME_CONFIG);
  // Global handle for QA automation / future debug panel.
  const L = window as unknown as { __LUMI__: { gm: GameManager; game?: Phaser.Game } };
  L.__LUMI__ = { gm: GameManager.instance, game };
  GameManager.instance.nav.attach(game);

  // React UI shell (menus render above the canvas).
  const rootEl = document.getElementById("react-root");
  if (rootEl) {
    createRoot(rootEl).render(<App />);
  }

  // Debug panel toggle (dev builds only). In menus the React shell shows its
  // own panel; during gameplay the Phaser overlay takes over.
  if (import.meta.env.DEV) {
    window.addEventListener("keydown", (e) => {
      if (e.key === "F2") {
        if (GameManager.instance.nav.isShellVisible()) {
          emitEvent("debug-panel-toggle", {});
        } else if (game.scene.isActive("DebugPanel")) {
          game.scene.stop("DebugPanel");
        } else {
          game.scene.run("DebugPanel");
        }
      }
    });
  }
}

window.addEventListener("error", (e) => {
  bootError(e.message);
  showError("JS ERROR: " + e.message + "\n" + (e.filename || "") + ":" + (e.lineno ?? "?"));
});
window.addEventListener("unhandledrejection", (e) => {
  showError("UNHANDLED PROMISE: " + String((e as PromiseRejectionEvent).reason));
});

try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { void boot(); });
  } else {
    void boot();
  }
} catch (err) {
  showError("BOOT ERROR: " + String(err));
}