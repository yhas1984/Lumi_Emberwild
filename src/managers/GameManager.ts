import { SaveManager } from "./SaveManager";
import { EconomyManager } from "./EconomyManager";
import { AudioManager } from "./AudioManager";
import { LootManager } from "./LootManager";
import { MissionManager } from "./MissionManager";
import { CreatureManager } from "./CreatureManager";
import { DailyRewardsManager } from "./DailyRewardsManager";
import { AnalyticsManager } from "./AnalyticsManager";
import { NavigationManager } from "./NavigationManager";
import { LocalCloudSaveService } from "../services/CloudSaveService";
import { LocalAuthService } from "../services/AuthService";
import { LocalLeaderboardService, runScore } from "../services/LeaderboardService";
import type { HatchResult } from "./CreatureManager";
import { MockAnalyticsService } from "../services/AnalyticsService";
import { MockAdService } from "../services/AdService";
import { MockPurchaseService } from "../services/PurchaseService";
import type { AbilityId, DifficultyId, RunResult } from "../types";
import { GAME } from "../data/gameConfig";
import { DIFFICULTIES, difficultyById } from "../data/difficulty";
import type { DifficultyDef } from "../data/difficulty";
import { emitEvent } from "../utils/events";

export interface RunState {
  time: number;
  kills: number;
  coinsEarned: number;
  level: number;
  xp: number;
  abilities: Map<AbilityId, number>;
  bossDefeated: boolean;
  pendingEggs: number;
  reviveUsed: boolean;
}

// Central service locator + run state. All managers are singletons here.
export class GameManager {
  private static _instance: GameManager | null = null;

  readonly save: SaveManager;
  readonly economy: EconomyManager;
  readonly audio: AudioManager;
  readonly loot: LootManager;
  readonly missions: MissionManager;
  readonly creatures: CreatureManager;
  readonly daily: DailyRewardsManager;
  readonly analytics: MockAnalyticsService;
  readonly analyticsManager: AnalyticsManager;
  readonly nav: NavigationManager;
  readonly cloud: LocalCloudSaveService;
  readonly auth: LocalAuthService;
  readonly leaderboard: LocalLeaderboardService;
  readonly ads: MockAdService;
  readonly purchases: MockPurchaseService;

  run: RunState | null = null;

  // Dev/QA hook: lets automated tests inspect live entities.
  debug: { golem: unknown; player: unknown } = { golem: null, player: null };

  private constructor() {
    this.save = new SaveManager();
    this.analytics = new MockAnalyticsService();
    this.nav = new NavigationManager();
    this.cloud = new LocalCloudSaveService();
    this.auth = new LocalAuthService();
    this.leaderboard = new LocalLeaderboardService();
    this.analyticsManager = new AnalyticsManager();
    this.analytics.setListener((event) => this.analyticsManager.recordEvent(event));
    this.ads = new MockAdService();
    this.purchases = new MockPurchaseService();
    this.economy = EconomyManager.create(this.save);
    this.audio = new AudioManager();
    this.loot = new LootManager();
    this.missions = MissionManager.create(this.save, this.economy, this.analytics);
    this.creatures = CreatureManager.create(this.save, this.analytics);
    this.daily = DailyRewardsManager.create(this.save, this.economy, this.loot, this.analytics);
  }

  static get instance(): GameManager {
    if (!GameManager._instance) {
      GameManager._instance = new GameManager();
    }
    return GameManager._instance;
  }

  static async init(): Promise<GameManager> {
    const gm = GameManager.instance;
    gm.save.attachCloud(gm.cloud);
    gm.save.load();
    await gm.save.loadFromCloudIfEmpty();
    gm.analyticsManager.load();
    gm.analyticsManager.startSession();
    gm.analytics.track("game_started");
    // Close the session when the tab is hidden or the page unloads.
    window.addEventListener("beforeunload", () => gm.analyticsManager.endSession());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        gm.analyticsManager.endSession();
      } else {
        gm.analyticsManager.resumeSession();
      }
    });
    // Anonymous guest profile (local auth).
    void gm.auth.signInAnonymously();
    return gm;
  }

  // ---- Run lifecycle ----
  startRun(): void {
    this.run = {
      time: 0,
      kills: 0,
      coinsEarned: 0,
      level: 1,
      xp: 0,
      abilities: new Map(),
      bossDefeated: false,
      pendingEggs: 0,
      reviveUsed: false,
    };
    this.analytics.track("run_started");
  }

  addAbility(id: AbilityId): void {
    if (!this.run) {
      return;
    }
    const cur = this.run.abilities.get(id) ?? 0;
    const next = Math.min(cur + 1, 5);
    this.run.abilities.set(id, next);
    this.analytics.track("ability_selected", { ability: id, level: next });
    emitEvent("ability-selected", { abilityId: id, level: next });
  }

  abilityLevel(id: AbilityId): number {
    return this.run?.abilities.get(id) ?? 0;
  }

  /** Registers a Mysterious Egg found during the run. */
  addEgg(): void {
    if (this.run) {
      this.run.pendingEggs += 1;
    }
  }

  /** The difficulty tier currently selected for runs. */
  currentDifficulty(): DifficultyDef {
    return difficultyById(this.save.get().account.difficulty);
  }

  /** Index of the highest unlocked tier (0 = Normal only). */
  difficultyUnlockedIndex(): number {
    return this.save.get().account.difficultyUnlocked;
  }

  endRun(victory: boolean, time: number): RunResult {
    const run = this.run;
    const diff = this.currentDifficulty();
    if (!run) {
      return {
        victory,
        time: 0,
        kills: 0,
        coinsEarned: 0,
        level: 1,
        eggs: 0,
        difficulty: diff.id,
        unlockedNext: null,
      };
    }
    // Victory on the hardest unlocked tier unlocks (and auto-selects) the next one.
    let unlockedNext: { id: DifficultyId; name: string } | null = null;
    if (victory) {
      const unlocked = this.difficultyUnlockedIndex();
      const activeIdx = DIFFICULTIES.findIndex((d) => d.id === diff.id);
      if (activeIdx === unlocked && unlocked < DIFFICULTIES.length - 1) {
        const next = DIFFICULTIES[unlocked + 1];
        unlockedNext = { id: next.id, name: next.name };
        this.save.update((d) => {
          d.account.difficultyUnlocked = unlocked + 1;
          d.account.difficulty = next.id;
        });
      }
    }
    const baseCoins = (victory ? GAME.runRewards.victoryCoins : GAME.runRewards.defeatCoins) * diff.rewardMult;
    const coinsEarned = run.coinsEarned + baseCoins;
    const result: RunResult = {
      victory,
      time,
      kills: run.kills,
      coinsEarned,
      level: run.level,
      eggs: run.pendingEggs,
      difficulty: diff.id,
      unlockedNext,
    };
    this.economy.addCoins(coinsEarned);
    const xpGain = Math.floor(
      (GAME.runRewards.accountXpPerKill * run.kills +
        GAME.runRewards.accountXpPerSecond * time +
        (victory ? GAME.runRewards.accountXpPerBoss : 0)) *
        diff.xpMult
    );
    this.addAccountXp(xpGain);
    this.save.update((d) => {
      d.statistics.totalRuns += 1;
      if (time > d.statistics.bestTime) {
        d.statistics.bestTime = Math.floor(time);
      }
    });
    this.analytics.track(victory ? "run_completed" : "player_died", { time, kills: run.kills });
    emitEvent("run-ended", result);
    // Submit to the (local) leaderboard.
    void this.leaderboard.submitScore({
      score: runScore(time, run.kills, victory),
      time,
      kills: run.kills,
      victory,
    });
    this.run = null;
    return result;
  }

  // Abandons the current run without granting rewards.
  abandonRun(): void {
    this.run = null;
  }

  addAccountXp(amount: number): void {
    if (amount <= 0) {
      return;
    }
    this.save.update((d) => {
      d.account.xp += amount;
      while (d.account.xp >= GAME.accountXpToNext(d.account.level)) {
        d.account.xp -= GAME.accountXpToNext(d.account.level);
        d.account.level += 1;
        d.currency.gems += GAME.runRewards.accountLevelUpGems;
      }
    });
  }

  // ---- Debug/QA helpers (used by the dev-only Debug Panel and tests) ----
  giveRandomCreature(): HatchResult {
    return this.creatures.hatchEgg();
  }

  resetSave(): void {
    this.save.reset();
    this.run = null;
    emitEvent("economy-changed", { coins: 0, gems: 0 });
  }
}