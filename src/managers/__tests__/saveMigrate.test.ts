import { describe, expect, it } from "vitest";
import { defaultSave, migrateSave, SAVE_VERSION } from "../saveMigrate";

describe("saveMigrate", () => {
  it("default save shape", () => {
    const s = defaultSave();
    expect(s.saveVersion).toBe(3);
    expect(s.currency).toEqual({ coins: 0, gems: 0 });
    expect(s.daily).toEqual({ lastClaimDay: "", streak: 0 });
    expect(s.statistics.totalChests).toBe(0);
  });

  it("migrates v1 numeric lastClaimDay to string", () => {
    const v1 = { ...defaultSave(), saveVersion: 1, daily: { lastClaimDay: 1234567890, streak: 2 } } as unknown as Parameters<typeof migrateSave>[0];
    const m = migrateSave(v1);
    expect(m.daily.lastClaimDay).toBe("");
    expect(m.daily.streak).toBe(2);
    expect(m.saveVersion).toBe(SAVE_VERSION);
  });

  it("fills missing fields with defaults", () => {
    const m = migrateSave({} as unknown as Parameters<typeof migrateSave>[0]);
    expect(m.statistics.totalChests).toBe(0);
    expect(m.sanctuary.treeOfLife).toBe(0);
    expect(m.creatures).toEqual([]);
  });

  it("preserves provided values", () => {
    const m = migrateSave({ currency: { coins: 55, gems: 7 } } as unknown as Parameters<typeof migrateSave>[0]);
    expect(m.currency.coins).toBe(55);
    expect(m.currency.gems).toBe(7);
  });

  it("v3: defaults difficulty fields for older saves", () => {
    const v2 = {
      ...defaultSave(),
      saveVersion: 2,
      account: { level: 3, xp: 10 },
    } as unknown as Parameters<typeof migrateSave>[0];
    const m = migrateSave(v2);
    expect(m.account.difficulty).toBe("normal");
    expect(m.account.difficultyUnlocked).toBe(0);
    expect(m.account.level).toBe(3);
    expect(m.saveVersion).toBe(SAVE_VERSION);
  });

  it("v3: repairs invalid difficulty ids and clamps the unlock index", () => {
    const bad = {
      ...defaultSave(),
      account: { level: 1, xp: 0, difficulty: "ultra", difficultyUnlocked: 99 },
    } as unknown as Parameters<typeof migrateSave>[0];
    const m = migrateSave(bad);
    expect(m.account.difficulty).toBe("normal");
    expect(m.account.difficultyUnlocked).toBe(3);
  });

  it("v3: keeps a valid difficulty selection", () => {
    const good = {
      ...defaultSave(),
      account: { level: 1, xp: 0, difficulty: "nightmare", difficultyUnlocked: 2 },
    } as unknown as Parameters<typeof migrateSave>[0];
    const m = migrateSave(good);
    expect(m.account.difficulty).toBe("nightmare");
    expect(m.account.difficultyUnlocked).toBe(2);
  });
});
