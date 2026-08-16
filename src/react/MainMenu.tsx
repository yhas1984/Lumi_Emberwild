import { useEffect, useState } from "react";
import { onEvent, offEvent } from "../utils/events";
import { GameManager } from "../managers/GameManager";
import { DIFFICULTIES } from "../data/difficulty";

// The main menu (React). Meta screens render in the shell via nav.showScreen.
export function MainMenu() {
  const gm = GameManager.instance;
  const [coins, setCoins] = useState(gm.economy.coins);
  const [gems, setGems] = useState(gm.economy.gems);
  const [level, setLevel] = useState(gm.save.get().account.level);
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = (): void => {
      setCoins(gm.economy.coins);
      setGems(gm.economy.gems);
      setLevel(gm.save.get().account.level);
      setTick((t) => t + 1);
    };
    onEvent("economy-changed", refresh);
    onEvent("save-changed", refresh);
    return () => {
      offEvent("economy-changed", refresh);
      offEvent("save-changed", refresh);
    };
  }, [gm]);

  // Difficulty selector: cycles through the unlocked tiers (persisted).
  const unlockedCount = gm.difficultyUnlockedIndex() + 1;
  const activeDiff = gm.currentDifficulty();
  const cycleDifficulty = (): void => {
    const ids = DIFFICULTIES.slice(0, unlockedCount).map((d) => d.id);
    const i = ids.indexOf(gm.save.get().account.difficulty);
    const next = ids[(i + 1) % ids.length];
    gm.save.update((d) => {
      d.account.difficulty = next;
    });
    gm.audio.play("uiClick");
  };

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
        className="lumi-btn diff-btn"
        data-action="difficulty"
        onClick={cycleDifficulty}
      >
        <span className="diff-emoji">{activeDiff.emoji}</span>
        <span className="diff-name" style={{ color: activeDiff.color }}>
          {activeDiff.name}
        </span>
      </button>
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
              gm.nav.showScreen(n.action);
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
            gm.nav.showScreen("settings");
          }}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
