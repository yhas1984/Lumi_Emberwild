import { useEffect, useState } from "react";
import { onEvent, offEvent } from "../utils/events";
import { GameManager } from "../managers/GameManager";
import { MainMenu } from "./MainMenu";
import { DebugPanel } from "./DebugPanel";
import { ScreenRouter } from "./screens";
import "./styles.css";

// Design space of the UI (mirrors GAME.width/height). The shell is scaled
// with FIT (like the Phaser canvas) so every screen fits any phone.
const DESIGN_W = 720;
const DESIGN_H = 1280;

function useFitScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const onResize = (): void => {
      setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

// React UI shell: renders the meta menus above the Phaser canvas.
// Visibility is driven by the NavigationManager (shell-visible events).
export function App() {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const scale = useFitScale();

  useEffect(() => {
    const onShell = (p: { visible: boolean }): void => setVisible(p.visible);
    const onScreen = (p: { screen: string | null }): void => setScreen(p.screen);
    const onDebug = (): void => setDebugOpen((v) => !v);
    onEvent("shell-visible", onShell);
    onEvent("screen-change", onScreen);
    onEvent("debug-panel-toggle", onDebug);
    return () => {
      offEvent("shell-visible", onShell);
      offEvent("screen-change", onScreen);
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
      <div className="shell-stage" style={{ transform: "scale(" + scale + ")" }}>
        {screen === null ? <MainMenu /> : <ScreenRouter screen={screen} />}
      </div>
      {debugOpen && <DebugPanel onClose={() => setDebugOpen(false)} />}
    </div>
  );
}
