import { useEffect, useState } from "react";
import { onEvent, offEvent } from "../utils/events";
import { GameManager } from "../managers/GameManager";
import { MainMenu } from "./MainMenu";
import { DebugPanel } from "./DebugPanel";
import "./styles.css";

// React UI shell: renders the meta menus above the Phaser canvas.
// Visibility is driven by the NavigationManager (shell-visible events).
export function App() {
  const [visible, setVisible] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    const onShell = (p: { visible: boolean }): void => setVisible(p.visible);
    const onDebug = (): void => setDebugOpen((v) => !v);
    onEvent("shell-visible", onShell);
    onEvent("debug-panel-toggle", onDebug);
    return () => {
      offEvent("shell-visible", onShell);
      offEvent("debug-panel-toggle", onDebug);
    };
  }, []);

  if (!visible) {
    return null;
  }
  return (
    <div
      id="react-shell"
      className="shell"
      onPointerDown={() => GameManager.instance.audio.unlock()}
    >
      <MainMenu />
      {debugOpen && <DebugPanel onClose={() => setDebugOpen(false)} />}
    </div>
  );
}
