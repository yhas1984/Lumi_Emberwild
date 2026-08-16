import { useState } from "react";
import { GameManager } from "../managers/GameManager";
import { emitEvent } from "../utils/events";

// Dev-only debug panel rendered inside the React shell (used when F2 is
// pressed while a menu is visible).
export function DebugPanel({ onClose }: { onClose: () => void }) {
  const gm = GameManager.instance;
  const [status, setStatus] = useState("");

  const actions: Array<{ label: string; fn: () => void }> = [
    { label: "+1000 Coins", fn: () => gm.economy.addCoins(1000) },
    { label: "+100 Gems", fn: () => gm.economy.addGems(100) },
    { label: "Level Up", fn: () => emitEvent("debug-level-up", {}) },
    { label: "Spawn Boss", fn: () => emitEvent("debug-spawn-boss", {}) },
    { label: "Spawn Chest", fn: () => emitEvent("debug-spawn-chest", {}) },
    {
      label: "Random Creature",
      fn: () => {
        const r = gm.giveRandomCreature();
        const d = gm.creatures.getDef(r.defId);
        setStatus("Got: " + (d ? d.name : r.defId) + " (Lv " + r.level + ")");
      },
    },
    {
      label: "Reset Save",
      fn: () => {
        gm.resetSave();
        gm.nav.showMenu();
        onClose();
      },
    },
  ];

  return (
    <div className="debug-overlay">
      <div className="debug-panel">
        <div className="debug-title">DEBUG PANEL (dev)</div>
        <div className="debug-grid">
          {actions.map((a) => (
            <button key={a.label} className="lumi-btn debug-btn" onClick={a.fn}>
              {a.label}
            </button>
          ))}
        </div>
        {status !== "" && <div className="debug-status">{status}</div>}
        <button className="lumi-btn debug-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
