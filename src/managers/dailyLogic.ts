// Pure daily-reward streak logic (testable without Phaser).

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

export function daysBetween(aKey: string, bKey: string): number {
  const a = new Date(aKey + "T00:00:00");
  const b = new Date(bKey + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export interface DailyState {
  lastClaimDay: string;
  streak: number;
}

export interface DailyClaimOutcome {
  rewardIndex: number;
  nextStreak: number;
  alreadyClaimed: boolean;
}

// Seven-day login calendar with streak protection:
//  - 0 days since last claim  -> already claimed today
//  - 1 day                    -> normal next-day claim
//  - 2 days (1 missed day)    -> grace: chain is preserved, no reset
//  - 3+ days (2+ missed)      -> chain resets to day 1
export function computeDailyClaim(state: DailyState, today: string): DailyClaimOutcome {
  if (state.lastClaimDay === today) {
    return { rewardIndex: state.streak % 7, nextStreak: state.streak, alreadyClaimed: true };
  }
  const diff = state.lastClaimDay === "" ? 99 : daysBetween(state.lastClaimDay, today);
  let streak = state.streak;
  if (diff >= 3) {
    streak = 0;
  }
  return { rewardIndex: streak % 7, nextStreak: streak + 1, alreadyClaimed: false };
}
