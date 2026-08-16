import { useEffect, useState } from "react";
import { onEvent, offEvent } from "../utils/events";
import { GameManager } from "../managers/GameManager";

const TARGETS: Record<string, string> = {
  sanctuary: "Sanctuary",
  creatures: "Creatures",
  missions: "Missions",
  daily: "DailyRewards",
  shop: "Shop",
  settings: "Settings",
};

// The main menu (React). First screen of the UI migration pattern:
// reads managers directly, subscribes to bus events, navigates via GameManager.nav.
export function MainMenu() {
  const gm = GameManager.instance;
  const [coins, setCoins] = useState(gm.economy.coins);
  const [gems, setGems] = useState(gm.economy.gems);
  const [level, setLevel] = useState(gm.save.get().account.level);

  useEffect(() => {
    const refresh = (): void => {
      setCoins(gm.economy.coins);
      setGems(gm.economy.gems);
      setLevel(gm.save.get().account.level);
    };
    onEvent("economy-changed", refresh);
    onEvent("save-changed", refresh);
    return () => {
      offEvent("economy-changed", refresh);
      offEvent("save-changed", refresh);
    };
  }, [gm]);

  const nav = [
    { action: "sanctuary", label: "Sanctuary", emoji: "🏡" },
    { action: "creatures", label: "Creatures", emoji: "🐾" },
    { action: "missions", label: "Missions", emoji: "📜" },
    { action: "daily", label: "Daily", emoji: "🎁" },
    { action: "shop", label: "Shop", emoji: "🛒" },
  ];

  return (
    <div className="menu">
      <div className="menu-title">LUMI</div>
      <div className="menu-sub">EMBERWILD</div>
      <div className="menu-orb" />
      <div className="menu-level">Account Level {level}</div>
      <div className="menu-currency">
        <div className="chip">
          <span className="chip-icon">🪙</span>
          <span className="chip-value">{coins}</span>
        </div>
        <div className="chip">
          <span className="chip-icon">💎</span>
          <span className="chip-value">{gems}</span>
        </div>
      </div>
      <button
        className="lumi-btn play-btn"
        data-action="play"
        onClick={() => {
          gm.audio.play("uiClick");
          gm.nav.startGame();
        }}
      >
        ⚔️ PLAY
      </button>
      <div className="menu-nav">
        {nav.map((n) => (
          <button
            key={n.action}
            className="lumi-btn nav-btn"
            data-action={n.action}
            onClick={() => {
              gm.audio.play("uiClick");
              gm.nav.showScene(TARGETS[n.action]);
            }}
          >
            <span className="nav-emoji">{n.emoji}</span>
            {n.label}
          </button>
        ))}
      </div>
      <div className="menu-topbar">
        <button
          className="icon-btn"
          data-action="settings"
          onClick={() => {
            gm.audio.play("uiClick");
            gm.nav.showScene("Settings");
          }}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
