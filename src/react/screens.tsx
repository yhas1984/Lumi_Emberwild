import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onEvent, offEvent } from "../utils/events";
import type { GameEvents } from "../types";
import { GameManager } from "../managers/GameManager";
import { BUILDINGS, buildingCost } from "../data/gameConfig";
import type { BuildingConfig } from "../data/gameConfig";
import type { BuildingId, ChestType } from "../types";
import { SHOP_ITEMS } from "../data/shop";
import type { ShopItemDef } from "../types";
import { DAILY_REWARDS } from "../data/dailyRewards";
import { CREATURE_LIST } from "../data/creatures";
import { RARITY_LABELS } from "../data/rarity";
import { formatTime } from "../utils/math";

// Rarity accent colors (CSS hex mirrors of data/rarity.ts).
const RARITY_HEX: Record<string, string> = {
  COMMON: "#9aa4b8",
  RARE: "#3fa9f5",
  EPIC: "#a45cff",
  LEGENDARY: "#ffb02e",
  MYTHIC: "#ff4d6d",
};

// Re-renders the component whenever any of the bus events fire.
function useBusEvents(keys: string): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = (): void => setTick((t) => t + 1);
    const list = keys.split(",");
    list.forEach((k) => onEvent(k as keyof GameEvents, bump));
    return () => list.forEach((k) => offEvent(k as keyof GameEvents, bump));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);
}

function Screen({
  screen,
  title,
  sub,
  stageHeight = 1280,
  children,
}: {
  screen: string;
  title: string;
  sub?: string;
  stageHeight?: number;
  children: ReactNode;
}) {
  const gm = GameManager.instance;
  return (
    <div className="screen" data-screen={screen}>
      <button
        className="back-btn"
        data-action="back"
        onClick={() => {
          gm.audio.play("uiClick");
          gm.nav.showMenu();
        }}
      >
        ←
      </button>
      <div className="screen-header" />
      <div className="screen-title">{title}</div>
      {sub !== undefined && <div className="screen-sub">{sub}</div>}
      <div className="screen-body">
        <div className="screen-stage" style={{ height: stageHeight }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function CurrencyChip({
  x,
  y,
  icon,
  value,
  color,
}: {
  x: number;
  y: number;
  icon: string;
  value: number;
  color: string;
}) {
  return (
    <div className="panel chip-abs" style={{ left: x, top: y, width: 260, height: 64 }}>
      <span style={{ fontSize: 26, marginLeft: 22 }}>{icon}</span>
      <span className="chip-value" style={{ color, marginLeft: 12 }}>
        {value}
      </span>
    </div>
  );
}

// ---------------- Sanctuary ----------------
function SanctuaryScreen() {
  const gm = GameManager.instance;
  useBusEvents("economy-changed,save-changed");
  const save = gm.save.get();
  const owned = gm.creatures.getOwned();
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  const coins = gm.economy.coins;
  const gems = gm.economy.gems;

  const upgrade = (id: BuildingId): void => {
    const level = save.sanctuary[id] ?? 0;
    const cost = buildingCost(id, level);
    if (gm.economy.spendCoins(cost)) {
      gm.save.update((d) => {
        d.sanctuary[id] += 1;
      });
      gm.audio.play("chest");
    } else {
      gm.audio.play("error");
    }
  };

  return (
    <Screen screen="sanctuary" title="SANCTUARY" stageHeight={1240}>
      <CurrencyChip x={80} y={178} icon="🪙" value={coins} color="#ffd76b" />
      <CurrencyChip x={380} y={178} icon="💎" value={gems} color="#5ee0f5" />
      <div style={{ position: "absolute", left: 110, top: 292, fontSize: 44 }}>🐾</div>
      <div className="st-bold" style={{ left: 160, top: 304 }}>
        Account Level {save.account.level}
      </div>
      <div className="st-dim" style={{ left: 160, top: 336 }}>
        Buildings &amp; creatures persist across runs.
      </div>
      <div className="panel" style={{ left: 50, top: 405, width: 620, height: 130 }}>
        <span style={{ fontSize: 40, marginLeft: 24 }}>🐾</span>
        {owned.length === 0 ? (
          <div style={{ marginLeft: 20 }}>
            <div className="st-bold" style={{ fontSize: 22, color: "#ffffff" }}>
              No creatures yet
            </div>
            <div className="st-dim" style={{ fontSize: 15 }}>
              Defeat the Ancient Golem to find Mysterious Eggs!
            </div>
          </div>
        ) : (
          <div style={{ marginLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 40, display: "flex", gap: 16 }}>
              {owned.slice(0, 4).map((inst) => {
                const def = gm.creatures.getDef(inst.defId);
                return def ? <span key={inst.defId}>{def.emoji}</span> : null;
              })}
            </div>
            <div className="st-dim" style={{ fontSize: 15 }}>
              {owned.length} creatures
            </div>
          </div>
        )}
        <button
          className="screen-btn green"
          style={{ position: "absolute", right: 22, top: 37, width: 150, height: 56, fontSize: 18 }}
          data-action="view-all"
          onClick={() => {
            gm.audio.play("uiClick");
            gm.nav.showScreen("creatures");
          }}
        >
          View all
        </button>
      </div>
      <div className="screen-h2" style={{ top: 596 }}>
        BUILDINGS
      </div>
      {ids.map((id, i) => {
        const def: BuildingConfig = BUILDINGS[id];
        const y = 700 + i * 140;
        const level = save.sanctuary[id] ?? 0;
        const cost = buildingCost(id, level);
        return (
          <div key={id} className="panel" style={{ left: 50, top: y - 63, width: 620, height: 126 }}>
            <span style={{ fontSize: 44, marginLeft: 20 }}>{def.emoji}</span>
            <div style={{ marginLeft: 22, flex: 1 }}>
              <div className="st-bold" style={{ fontSize: 24 }}>
                {def.name}
              </div>
              <div className="st-dim" style={{ fontSize: 19 }}>
                Level {level}
              </div>
              <div className="st-dim" style={{ fontSize: 14 }}>
                {def.description}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginRight: 16 }}>
              <button
                className="screen-btn green"
                style={{ width: 176, height: 56, fontSize: 19 }}
                data-action={"upgrade-" + id}
                disabled={coins < cost}
                onClick={() => upgrade(id)}
              >
                Upgrade
              </button>
              <div className="st-bold" style={{ fontSize: 17, color: "#ffd76b" }}>
                {cost} 🪙
              </div>
            </div>
          </div>
        );
      })}
    </Screen>
  );
}

// ---------------- Creatures ----------------
function CreaturesScreen() {
  const gm = GameManager.instance;
  useBusEvents("save-changed,creature-obtained");
  const owned = gm.creatures.getOwned();
  return (
    <Screen screen="creatures" title="CREATURES" sub={owned.length + " / " + CREATURE_LIST.length + " found"} stageHeight={1680}>
      {CREATURE_LIST.map((def, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 200 + col * 320;
        const y = 330 + row * 240;
        const inst = owned.find((c) => c.defId === def.id);
        const color = RARITY_HEX[def.rarity] ?? "#9aa4b8";
        return (
          <div
            key={def.id}
            className="panel"
            style={{
              left: x - 145,
              top: y - 110,
              width: 290,
              height: 220,
              flexDirection: "column",
              justifyContent: "center",
              gap: 6,
              borderColor: color,
            }}
          >
            {inst ? (
              <>
                <div style={{ fontSize: 64, lineHeight: 1 }}>{def.emoji}</div>
                <div className="st-bold" style={{ fontSize: 24, color: "#ffffff" }}>
                  {def.name}
                </div>
                <div className="st-bold" style={{ fontSize: 16, color }}>
                  {RARITY_LABELS[def.rarity].toUpperCase()} · Lv {inst.level}
                </div>
                <div className="st-dim" style={{ fontSize: 15, textAlign: "center", padding: "0 12px" }}>
                  {def.description}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 64, lineHeight: 1, color: "#4a5578" }}>❔</div>
                <div className="st-bold" style={{ fontSize: 24, color: "#4a5578" }}>
                  ???
                </div>
                <div className="st-bold" style={{ fontSize: 15, color: "#4a5578" }}>
                  NOT FOUND YET
                </div>
                <div className="st-dim" style={{ fontSize: 13, textAlign: "center", padding: "0 12px", color: "#4a5578" }}>
                  Defeat the Ancient Golem and open eggs!
                </div>
              </>
            )}
          </div>
        );
      })}
    </Screen>
  );
}

// ---------------- Missions ----------------
function MissionsScreen() {
  const gm = GameManager.instance;
  useBusEvents("save-changed,economy-changed,mission-claimed");
  const defs = gm.missions.getDefinitions();
  const claim = (id: string): void => {
    const def = defs.find((d) => d.id === id);
    if (def && gm.missions.claim(def)) {
      gm.audio.play("chest");
    } else {
      gm.audio.play("error");
    }
  };
  return (
    <Screen screen="missions" title="MISSIONS" stageHeight={1420}>
      {defs.map((def, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 200 + col * 320;
        const y = 300 + row * 160;
        const progress = gm.missions.progressOf(def);
        const value = gm.missions.statValue(def);
        const claimed = gm.missions.isClaimed(def.id);
        const canClaim = gm.missions.canClaim(def);
        const reward = def.reward.coins
          ? def.reward.coins + " 🪙"
          : def.reward.gems + " 💎";
        return (
          <div key={def.id} className="panel" style={{ left: x - 150, top: y - 78, width: 300, height: 156, flexDirection: "column", justifyContent: "center", gap: 4 }}>
            <div className="st-bold" style={{ fontSize: 20 }}>
              {def.title}
            </div>
            <div className="st-dim" style={{ fontSize: 13, textAlign: "center", padding: "0 14px" }}>
              {def.description}
            </div>
            <div className="st-dim" style={{ fontSize: 13 }}>
              Reward: {reward}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 180, height: 12, background: "#101733", borderRadius: 6, overflow: "hidden" }}>
                <div
                  style={{
                    width: Math.round(180 * progress),
                    height: 12,
                    background: progress >= 1 ? "#69db7c" : "#ffd76b",
                    borderRadius: 6,
                  }}
                />
              </div>
              <div className="st-bold" style={{ fontSize: 14, color: "#ffd76b" }}>
                {value} / {def.goal}
              </div>
            </div>
            <button
              className="screen-btn green"
              style={{ position: "absolute", left: 75, top: 112, width: 150, height: 44, fontSize: 17 }}
              data-action={"claim-" + def.id}
              disabled={claimed || !canClaim}
              onClick={() => claim(def.id)}
            >
              {claimed ? "✓" : "Claim"}
            </button>
          </div>
        );
      })}
    </Screen>
  );
}

// ---------------- Daily rewards ----------------
function DailyScreen() {
  const gm = GameManager.instance;
  useBusEvents("save-changed,economy-changed,daily-claimed");
  const dayNumber = gm.daily.dayNumber();
  const canClaim = gm.daily.canClaim();
  const claim = (): void => {
    if (gm.daily.claim()) {
      gm.audio.play("chest");
    } else {
      gm.audio.play("error");
    }
  };
  return (
    <Screen screen="daily" title="DAILY REWARDS" sub={"Day " + dayNumber + " of 7  ·  login streak protected"} stageHeight={900}>
      {DAILY_REWARDS.map((def, i) => {
        const x = 72 + i * 96;
        const isClaimed = i + 1 < dayNumber;
        const isCurrent = i + 1 === dayNumber;
        const label =
          def.type === "coins"
            ? def.amount + " 🪙"
            : def.type === "gems"
              ? def.amount + " 💎"
              : "Chest";
        return (
          <div
            key={def.day}
            className="panel"
            style={{
              left: x - 42,
              top: 320,
              width: 84,
              height: 120,
              flexDirection: "column",
              justifyContent: "center",
              gap: 6,
              borderColor: isCurrent ? "#ffd76b" : "#3b4a7a",
            }}
          >
            <div className="st-bold" style={{ fontSize: 14, color: isClaimed ? "#7f90c0" : "#e8ecff" }}>
              DAY {def.day}
            </div>
            <div className="st-bold" style={{ fontSize: 17, color: isCurrent ? "#ffd76b" : "#c6d2ff" }}>
              {label}
            </div>
            <div className="st-bold" style={{ fontSize: 12, color: isClaimed ? "#69db7c" : isCurrent ? "#ffd76b" : "#7f90c0" }}>
              {isClaimed ? "✓ CLAIMED" : isCurrent ? "NEXT" : ""}
            </div>
          </div>
        );
      })}
      <button
        className="screen-btn orange"
        style={{ position: "absolute", left: 160, top: 588, width: 400, height: 104, fontSize: 30 }}
        data-action="claim-daily"
        disabled={!canClaim}
        onClick={claim}
      >
        {canClaim ? "CLAIM DAY " + dayNumber : "Come back tomorrow!"}
      </button>
      <div className="st-dim" style={{ position: "absolute", left: 0, top: 742, width: 720, textAlign: "center", fontSize: 17 }}>
        Missing a day doesn't break your chain: one missed day is forgiven.
      </div>
    </Screen>
  );
}

// ---------------- Shop ----------------
function ShopScreen() {
  const gm = GameManager.instance;
  useBusEvents("economy-changed,save-changed");
  const [adState, setAdState] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const buy = (item: ShopItemDef): void => {
    if (!gm.economy.spendGems(item.costGems)) {
      gm.audio.play("error");
      return;
    }
    gm.audio.play("chest");
    if (item.kind === "egg") {
      gm.nav.showOverlay("EggHatch", { count: 1 }, "shop");
    } else if (item.kind === "coins" && item.amount) {
      gm.economy.addCoins(item.amount);
      setToast("+" + item.amount + " 🪙");
    }
  };

  const bonusChest = (): void => {
    gm.analytics.track("rewarded_ad_requested", { placement: "bonus_chest" });
    setAdState("Watching ad...");
    void gm.ads.watchRewardedAd("bonus_chest").then((ok) => {
      if (!ok) {
        setAdState(null);
        return;
      }
      const types: Array<{ type: ChestType; weight: number }> = [
        { type: "WOODEN", weight: 50 },
        { type: "SILVER", weight: 30 },
        { type: "GOLD", weight: 15 },
        { type: "MYTHIC", weight: 5 },
      ];
      const total = types.reduce((s, t) => s + t.weight, 0);
      let roll = Math.random() * total;
      let chest: ChestType = "WOODEN";
      for (const t of types) {
        roll -= t.weight;
        if (roll <= 0) {
          chest = t.type;
          break;
        }
      }
      const loot = gm.loot.rollChest(chest);
      gm.economy.addCoins(loot.coins);
      gm.economy.addGems(loot.gems);
      gm.audio.play("chest");
      setToast("Bonus chest: +" + loot.coins + " 🪙  +" + loot.gems + " 💎");
      setAdState(null);
    });
  };

  return (
    <Screen screen="shop" title="SHOP" stageHeight={920}>
      <div className="panel chip-abs" style={{ left: 240, top: 190, width: 240, height: 60 }}>
        <span style={{ fontSize: 26, marginLeft: 20 }}>💎</span>
        <span className="chip-value" style={{ color: "#5ee0f5", marginLeft: 12 }}>
          {gm.economy.gems}
        </span>
      </div>
      {SHOP_ITEMS.map((item, i) => {
        const y = 360 + i * 190;
        return (
          <div key={item.id} className="panel" style={{ left: 50, top: y - 80, width: 620, height: 160 }}>
            <span style={{ fontSize: 58, marginLeft: 20 }}>{item.emoji}</span>
            <div style={{ marginLeft: 24, flex: 1 }}>
              <div className="st-bold" style={{ fontSize: 26 }}>
                {item.name}
              </div>
              <div className="st-dim" style={{ fontSize: 17 }}>
                {item.description}
              </div>
              <div className="st-bold" style={{ fontSize: 19, color: "#5ee0f5" }}>
                {item.costGems} 💎
              </div>
            </div>
            <button
              className="screen-btn green"
              style={{ position: "absolute", right: 28, top: 49, width: 170, height: 62, fontSize: 22 }}
              data-action={"buy-" + item.id}
              disabled={gm.economy.gems < item.costGems}
              onClick={() => buy(item)}
            >
              Buy
            </button>
          </div>
        );
      })}
      <div className="panel" style={{ left: 50, top: 710, width: 620, height: 140, borderColor: "#ffb02e" }}>
        <span style={{ fontSize: 48, marginLeft: 20 }}>🎁</span>
        <div style={{ marginLeft: 24, flex: 1 }}>
          <div className="st-bold" style={{ fontSize: 24, color: "#ffd76b" }}>
            BONUS CHEST
          </div>
          <div className="st-dim" style={{ fontSize: 15 }}>
            Watch a rewarded ad (mock) to earn a free chest!
          </div>
        </div>
        <button
          className="screen-btn orange"
          style={{ position: "absolute", right: 24, top: 37, width: 190, height: 66, fontSize: 19 }}
          data-action="bonus-chest"
          disabled={adState !== null}
          onClick={bonusChest}
        >
          {adState ?? "WATCH AD"}
        </button>
      </div>
      {toast && (
        <div className="st-bold" style={{ position: "absolute", left: 0, top: 664, width: 720, textAlign: "center", fontSize: 24, color: "#ffd76b" }}>
          {toast}
        </div>
      )}
    </Screen>
  );
}

// ---------------- Settings ----------------
function SettingsScreen() {
  const gm = GameManager.instance;
  useBusEvents("save-changed");
  const [resetArmed, setResetArmed] = useState(false);
  const settings = gm.save.get().settings;

  const toggle = (key: "sfx" | "music" | "shake"): void => {
    gm.save.update((d) => {
      d.settings[key] = !d.settings[key];
    });
    if (key === "sfx") gm.audio.setSfx(gm.save.get().settings.sfx);
    if (key === "music") gm.audio.setMusic(gm.save.get().settings.music);
    gm.audio.play("uiClick");
  };

  const resetSave = (): void => {
    if (!resetArmed) {
      setResetArmed(true);
      gm.audio.play("error");
      window.setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    gm.resetSave();
    gm.analyticsManager.reset();
    gm.nav.showMenu();
  };

  const rows: Array<{ key: "sfx" | "music" | "shake"; label: string; y: number }> = [
    { key: "sfx", label: "Sound effects: " + (settings.sfx ? "ON" : "OFF"), y: 300 },
    { key: "music", label: "Music: " + (settings.music ? "ON" : "OFF"), y: 410 },
    { key: "shake", label: "Screen shake: " + (settings.shake ? "ON" : "OFF"), y: 520 },
  ];
  const user = gm.auth.getUser();
  return (
    <Screen screen="settings" title="SETTINGS" stageHeight={980}>
      {rows.map((r) => (
        <button
          key={r.key}
          className="screen-btn blue"
          style={{ position: "absolute", left: 150, top: r.y - 44, width: 420, height: 88, fontSize: 26 }}
          data-action={r.key}
          onClick={() => toggle(r.key)}
        >
          {r.label}
        </button>
      ))}
      <button
        className="screen-btn green"
        style={{ position: "absolute", left: 150, top: 606, width: 420, height: 88, fontSize: 26 }}
        data-action="stats"
        onClick={() => {
          gm.audio.play("uiClick");
          gm.nav.showScreen("stats");
        }}
      >
        📊 View Statistics
      </button>
      <button
        className="screen-btn red"
        style={{ position: "absolute", left: 150, top: 692, width: 420, height: 96, fontSize: 26 }}
        data-action="reset-save"
        onClick={resetSave}
      >
        {resetArmed ? "Tap again to confirm!" : "Reset Save"}
      </button>
      <div className="st-dim" style={{ position: "absolute", left: 0, top: 830, width: 720, textAlign: "center", fontSize: 17 }}>
        Player ID: {user ? user.playerId : "not signed in"}
      </div>
      <div className="st-dim" style={{ position: "absolute", left: 0, top: 878, width: 720, textAlign: "center", fontSize: 17 }}>
        Statistics and retention are stored locally in this browser.
      </div>
    </Screen>
  );
}

// ---------------- Stats ----------------
function StatsScreen() {
  const gm = GameManager.instance;
  const [lb, setLb] = useState<Array<{ time: number; kills: number; victory: boolean; score: number }>>([]);
  useEffect(() => {
    let live = true;
    void gm.leaderboard.getTop(5).then((entries) => {
      if (live) setLb(entries as Array<{ time: number; kills: number; victory: boolean; score: number }>);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = gm.save.get();
  const stats = save.statistics;
  const metrics = gm.analyticsManager.metrics();
  const events = gm.analyticsManager.recentEvents(6);

  const retention = (state: string): string =>
    state === "done" ? "✅ returned" : state === "pending" ? "⏳ not reached yet" : "❌ missed";
  const fmt = (seconds: number): string => {
    if (seconds < 60) return seconds + "s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + "m " + s + "s";
  };

  const rows: Array<[string, string]> = [
    ["Account level", String(save.account.level)],
    ["Total runs", String(stats.totalRuns)],
    ["Enemies defeated", String(stats.totalKills)],
    ["Best time", formatTime(stats.bestTime)],
    ["Coins collected", String(stats.totalCoins)],
    ["Bosses defeated", String(stats.totalBosses)],
    ["Chests opened", String(stats.totalChests)],
    ["Retention (day " + metrics.daysSinceFirstLaunch + ")", ""],
    ["D1 retention", retention(metrics.d1)],
    ["D7 retention", retention(metrics.d7)],
    ["D30 retention", retention(metrics.d30)],
    ["Sessions", String(metrics.sessionCount)],
    ["Total play time", fmt(metrics.totalSeconds)],
    ["Avg session", fmt(metrics.avgSessionSeconds)],
    ["Active days", String(metrics.activeDayCount)],
    ["Runs started", String(metrics.runStarts)],
    ["Runs finished", String(metrics.runCompletions)],
    ["Completion rate", Math.round(metrics.completionRate * 100) + "%"],
    ["Victories", String(metrics.victories)],
  ];

  return (
    <Screen screen="stats" title="STATISTICS">
      <div className="screen-scroll">
        {rows.map(([label, value]) => (
          <div key={label} className="stat-row">
            <span className="st-dim">{label}</span>
            <span className="st-bold" style={{ color: "#ffffff" }}>
              {value}
            </span>
          </div>
        ))}
        <div className="st-bold" style={{ color: "#ffd76b", fontSize: 21, marginTop: 14 }}>
          LEADERBOARD (top runs)
        </div>
        {lb.length === 0 ? (
          <div className="st-dim" style={{ marginTop: 8 }}>
            No runs yet — go defeat the Ancient Golem!
          </div>
        ) : (
          lb.map((e, i) => (
            <div key={i} className="stat-row">
              <span className="st-dim" style={i === 0 ? { color: "#ffd76b" } : undefined}>
                #{i + 1}  {formatTime(e.time)}  ·  {e.kills} kills{e.victory ? "  🏆" : ""}
              </span>
              <span className="st-bold" style={{ color: "#ffffff" }}>
                {e.score} pts
              </span>
            </div>
          ))
        )}
        <div className="st-bold" style={{ color: "#ffd76b", fontSize: 21, marginTop: 14 }}>
          RECENT EVENTS
        </div>
        {events.map((ev, i) => {
          const t = new Date(ev.at);
          const hh = String(t.getHours()).padStart(2, "0");
          const mm = String(t.getMinutes()).padStart(2, "0");
          return (
            <div key={i} className="st-dim" style={{ fontSize: 14, marginTop: 4 }}>
              {hh}:{mm}  {ev.event}
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

// ---------------- Router ----------------
const SCREENS: Record<string, () => ReactNode> = {
  sanctuary: SanctuaryScreen,
  creatures: CreaturesScreen,
  missions: MissionsScreen,
  daily: DailyScreen,
  shop: ShopScreen,
  settings: SettingsScreen,
  stats: StatsScreen,
};

export function ScreenRouter({ screen }: { screen: string }) {
  const Comp = SCREENS[screen];
  if (!Comp) {
    return <div className="screen" data-screen={screen} />;
  }
  return <Comp />;
}
