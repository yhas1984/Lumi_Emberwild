// ============================================================
// Persistent client-side analytics: sessions, active days, event
// counters and retention/conversion metrics (D1/D7/D30).
// No external services; the same data can later be pushed to
// Supabase/GA4 without touching game code.
// ============================================================

const STORE_KEY = "lumi_wild_realms_analytics";
const STORE_VERSION = 1;
const MAX_EVENTS = 120;
const SESSION_GAP_MS = 30 * 60 * 1000;

export interface AnalyticsSession {
  start: number;
  end: number | null;
}

export interface AnalyticsStore {
  version: number;
  firstLaunchDate: string;
  activeDays: string[];
  lastSeen: number;
  sessions: AnalyticsSession[];
  counters: Record<string, number>;
  recentEvents: Array<{ at: number; event: string }>;
}

export type RetentionState = "done" | "pending" | "missed";

export interface AnalyticsMetrics {
  sessionCount: number;
  totalSeconds: number;
  avgSessionSeconds: number;
  activeDayCount: number;
  runStarts: number;
  runCompletions: number;
  completionRate: number;
  victories: number;
  bossKills: number;
  chestsOpened: number;
  creaturesObtained: number;
  adsWatched: number;
  d1: RetentionState;
  d7: RetentionState;
  d30: RetentionState;
  daysSinceFirstLaunch: number;
}

function todayKey(d: Date = new Date()): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function addDaysKey(key: string, days: number): string {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

function daysUntilKey(key: string): number {
  const today = new Date(todayKey() + "T00:00:00").getTime();
  const target = new Date(key + "T00:00:00").getTime();
  return Math.round((target - today) / 86400000);
}

function defaultStore(): AnalyticsStore {
  return {
    version: STORE_VERSION,
    firstLaunchDate: todayKey(),
    activeDays: [],
    lastSeen: 0,
    sessions: [],
    counters: {},
    recentEvents: [],
  };
}

export class AnalyticsManager {
  private store: AnalyticsStore = defaultStore();

  load(): void {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        this.store = defaultStore();
        return;
      }
      const parsed = JSON.parse(raw) as Partial<AnalyticsStore>;
      const base = defaultStore();
      this.store = {
        ...base,
        ...parsed,
        sessions: parsed.sessions ?? [],
        counters: parsed.counters ?? {},
        recentEvents: parsed.recentEvents ?? [],
        activeDays: parsed.activeDays ?? [],
      };
    } catch (err) {
      console.warn("[analytics] corrupt store, resetting", err);
      this.store = defaultStore();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
    } catch (err) {
      console.warn("[analytics] could not persist", err);
    }
  }

  reset(): void {
    this.store = defaultStore();
    this.save();
  }

  /** Call on every app boot. Registers a session and the active day. */
  startSession(): void {
    const now = Date.now();
    const day = todayKey();
    if (!this.store.activeDays.includes(day)) {
      this.store.activeDays.push(day);
    }
    const open = this.store.sessions.find((s) => s.end === null);
    if (!open) {
      this.store.sessions.push({ start: now, end: null });
    }
    this.store.lastSeen = now;
    this.save();
  }

  /** Call on beforeunload / when the page is hidden. */
  endSession(): void {
    const open = this.store.sessions.find((s) => s.end === null);
    if (open) {
      open.end = Date.now();
      this.save();
    }
  }

  /** Call when the page becomes visible again: reopens a session that ended
   *  recently (tab switch) instead of fragmenting into a new one. */
  resumeSession(): void {
    const sessions = this.store.sessions;
    const last = sessions[sessions.length - 1];
    if (last && last.end !== null && Date.now() - last.end < SESSION_GAP_MS) {
      last.end = null;
      this.save();
    } else {
      this.startSession();
    }
  }

  /** Counts every analytics event (persisted counters + recent log). */
  recordEvent(event: string): void {
    this.store.counters[event] = (this.store.counters[event] ?? 0) + 1;
    this.store.recentEvents.push({ at: Date.now(), event });
    if (this.store.recentEvents.length > MAX_EVENTS) {
      this.store.recentEvents.shift();
    }
    this.store.lastSeen = Date.now();
    this.save();
  }

  getStore(): AnalyticsStore {
    return this.store;
  }

  recentEvents(limit = 12): Array<{ at: number; event: string }> {
    return this.store.recentEvents.slice(-limit).reverse();
  }

  metrics(): AnalyticsMetrics {
    const counters = this.store.counters;
    const sessions = this.store.sessions;
    const completed = sessions.filter((s) => s.end !== null);
    const totalSeconds = Math.round(
      sessions.reduce((sum, s) => sum + ((s.end ?? Date.now()) - s.start) / 1000, 0)
    );
    const avgSessionSeconds = completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + ((s.end as number) - s.start) / 1000, 0) / completed.length)
      : sessions.length > 0 ? Math.round(totalSeconds / sessions.length) : 0;

    const runStarts = counters["run_started"] ?? 0;
    const runCompletions = (counters["run_completed"] ?? 0) + (counters["player_died"] ?? 0);
    const retention = (target: number): RetentionState => {
      const targetKey = addDaysKey(this.store.firstLaunchDate, target);
      const left = daysUntilKey(targetKey);
      if (left > 0) {
        return "pending";
      }
      return this.store.activeDays.includes(targetKey) ? "done" : "missed";
    };

    return {
      sessionCount: sessions.length,
      totalSeconds,
      avgSessionSeconds,
      activeDayCount: this.store.activeDays.length,
      runStarts,
      runCompletions,
      completionRate: runStarts > 0 ? runCompletions / runStarts : 0,
      victories: counters["run_completed"] ?? 0,
      bossKills: counters["boss_defeated"] ?? 0,
      chestsOpened: counters["chest_opened"] ?? 0,
      creaturesObtained: counters["creature_obtained"] ?? 0,
      adsWatched: counters["rewarded_ad_requested"] ?? 0,
      d1: retention(1),
      d7: retention(7),
      d30: retention(30),
      daysSinceFirstLaunch: Math.max(0, daysUntilKey(this.store.firstLaunchDate)),
    };
  }
}
