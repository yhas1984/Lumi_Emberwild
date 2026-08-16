import { describe, expect, it } from "vitest";
import { computeDailyClaim, daysBetween, todayKey } from "../dailyLogic";

describe("dailyLogic", () => {
  it("first claim -> day 1, streak 1", () => {
    const o = computeDailyClaim({ lastClaimDay: "", streak: 0 }, "2026-08-16");
    expect(o.alreadyClaimed).toBe(false);
    expect(o.rewardIndex).toBe(0);
    expect(o.nextStreak).toBe(1);
  });

  it("already claimed today returns no-op", () => {
    const o = computeDailyClaim({ lastClaimDay: "2026-08-16", streak: 3 }, "2026-08-16");
    expect(o.alreadyClaimed).toBe(true);
    expect(o.nextStreak).toBe(3);
  });

  it("normal next-day claim advances", () => {
    const o = computeDailyClaim({ lastClaimDay: "2026-08-16", streak: 3 }, "2026-08-17");
    expect(o.rewardIndex).toBe(3);
    expect(o.nextStreak).toBe(4);
  });

  it("grace: one missed day keeps the chain", () => {
    const o = computeDailyClaim({ lastClaimDay: "2026-08-16", streak: 3 }, "2026-08-18");
    expect(o.rewardIndex).toBe(3);
    expect(o.nextStreak).toBe(4);
  });

  it("two or more missed days reset to day 1", () => {
    const o = computeDailyClaim({ lastClaimDay: "2026-08-10", streak: 3 }, "2026-08-16");
    expect(o.rewardIndex).toBe(0);
    expect(o.nextStreak).toBe(1);
  });

  it("cycles after day 7", () => {
    const o = computeDailyClaim({ lastClaimDay: "2026-08-16", streak: 7 }, "2026-08-17");
    expect(o.rewardIndex).toBe(0);
    expect(o.nextStreak).toBe(8);
  });

  it("daysBetween", () => {
    expect(daysBetween("2026-08-16", "2026-08-18")).toBe(2);
  });

  it("todayKey is YYYY-MM-DD", () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
