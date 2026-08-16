// ============================================================
// Analytics - mock implementation. Swap for a real provider later
// (Supabase/GA4/Firebase) without touching game code.
// ============================================================

export type AnalyticsEventName =
  | "game_started"
  | "run_started"
  | "level_up"
  | "ability_selected"
  | "player_died"
  | "boss_started"
  | "boss_defeated"
  | "run_completed"
  | "chest_opened"
  | "creature_obtained"
  | "rewarded_ad_requested"
  | "mission_claimed"
  | "daily_claimed";

export interface AnalyticsEvent {
  event: AnalyticsEventName;
  props: Record<string, unknown>;
  at: number;
}

export interface AnalyticsService {
  track(event: AnalyticsEventName, props?: Record<string, unknown>): void;
  getBuffer(): AnalyticsEvent[];
  setListener(fn: (event: AnalyticsEventName) => void): void;
}

export class MockAnalyticsService implements AnalyticsService {
  private buffer: AnalyticsEvent[] = [];
  private listener: ((event: AnalyticsEventName) => void) | null = null;

  track(event: AnalyticsEventName, props: Record<string, unknown> = {}): void {
    const entry: AnalyticsEvent = { event, props, at: Date.now() };
    this.buffer.push(entry);
    if (this.buffer.length > 300) {
      this.buffer.shift();
    }
    if (this.listener) {
      this.listener(event);
    }
    if (import.meta.env.DEV) {
      console.info("[analytics]", event, props);
    }
  }

  getBuffer(): AnalyticsEvent[] {
    return this.buffer;
  }

  setListener(fn: (event: AnalyticsEventName) => void): void {
    this.listener = fn;
  }
}
