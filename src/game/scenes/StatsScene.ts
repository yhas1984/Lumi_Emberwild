import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { formatTime } from "../../utils/math";

function retentionLabel(state: string): string {
  if (state === "done") {
    return "✅ returned";
  }
  if (state === "pending") {
    return "⏳ not reached yet";
  }
  return "❌ missed";
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) {
    return seconds + "s";
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + "m " + s + "s";
}

// Statistics + retention/conversion metrics + local leaderboard.
export class StatsScene extends Phaser.Scene {
  constructor() {
    super("Stats");
  }

  create(): void {
    const W = GAME.width;
    const gm = GameManager.instance;
    const save = gm.save.get();
    const metrics = gm.analyticsManager.metrics();
    const stats = save.statistics;

    gradientBg(this, 0x1c2750, 0x0d1226);
    softOrb(this, 90, 240, 120, 0x38d9ff, 0.1);

    this.add
      .text(W / 2, 120, "STATISTICS", {
        fontSize: "50px",
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

    let y = 200;
    const header = (text: string): void => {
      this.add
        .text(W / 2 - 260, y, text, { fontSize: "21px", fontStyle: "bold", color: "#ffd76b" })
        .setOrigin(0, 0.5);
      y += 32;
    };
    const row = (label: string, value: string): void => {
      this.add
        .text(W / 2 - 260, y, label, { fontSize: "18px", color: "#9fb0e0" })
        .setOrigin(0, 0.5);
      this.add
        .text(W / 2 + 260, y, value, { fontSize: "18px", fontStyle: "bold", color: "#ffffff" })
        .setOrigin(1, 0.5);
      y += 28;
    };

    header("ACCOUNT");
    row("Account level", String(save.account.level));
    row("Total runs", String(stats.totalRuns));
    row("Enemies defeated", String(stats.totalKills));
    row("Best time", formatTime(stats.bestTime));
    row("Coins collected", String(stats.totalCoins));
    row("Bosses defeated", String(stats.totalBosses));
    row("Chests opened", String(stats.totalChests));
    y += 4;

    header("RETENTION (day " + metrics.daysSinceFirstLaunch + " of lifetime)");
    row("D1 retention", retentionLabel(metrics.d1));
    row("D7 retention", retentionLabel(metrics.d7));
    row("D30 retention", retentionLabel(metrics.d30));
    y += 4;

    header("SESSIONS");
    row("Sessions", String(metrics.sessionCount));
    row("Total play time", fmtDuration(metrics.totalSeconds));
    row("Avg session", fmtDuration(metrics.avgSessionSeconds));
    row("Active days", String(metrics.activeDayCount));
    y += 4;

    header("CONVERSION");
    row("Runs started", String(metrics.runStarts));
    row("Runs finished", String(metrics.runCompletions));
    row("Completion rate", Math.round(metrics.completionRate * 100) + "%");
    row("Victories", String(metrics.victories));
    y += 4;

    // Leaderboard (local, async populate)
    header("LEADERBOARD (top runs)");
    const leadY = y;
    void gm.leaderboard.getTop(5).then((entries) => {
      if (!this.scene.isActive()) {
        return;
      }
      if (entries.length === 0) {
        this.add
          .text(W / 2 - 260, leadY, "No runs yet — go defeat the Ancient Golem!", {
            fontSize: "17px",
            color: "#7f90c0",
          })
          .setOrigin(0, 0.5);
        return;
      }
      entries.forEach((e, i) => {
        const ry = leadY + i * 26;
        this.add
          .text(W / 2 - 260, ry, "#" + (i + 1) + "  " + formatTime(e.time) + "  ·  " + e.kills + " kills" + (e.victory ? "  🏆" : ""), {
            fontSize: "17px",
            color: i === 0 ? "#ffd76b" : "#9fb0e0",
          })
          .setOrigin(0, 0.5);
        this.add
          .text(W / 2 + 260, ry, String(e.score) + " pts", { fontSize: "17px", fontStyle: "bold", color: "#ffffff" })
          .setOrigin(1, 0.5);
      });
      const eventY = leadY + entries.length * 26 + 8;
      this.renderEvents(eventY);
    });
  }

  private renderEvents(yStart: number): void {
    const W = GAME.width;
    const gm = GameManager.instance;
    this.add
      .text(W / 2 - 260, yStart, "RECENT EVENTS", { fontSize: "21px", fontStyle: "bold", color: "#ffd76b" })
      .setOrigin(0, 0.5);
    const events = gm.analyticsManager.recentEvents(6);
    events.forEach((ev, i) => {
      const t = new Date(ev.at);
      const time = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
      this.add
        .text(W / 2 - 260, yStart + 30 + i * 20, time + "  " + ev.event, { fontSize: "14px", color: "#7f90c0" })
        .setOrigin(0, 0.5);
    });
  }
}
