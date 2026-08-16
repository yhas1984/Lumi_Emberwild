import { describe, expect, it } from "vitest";
import { randInt, weightedPick, shuffle, chance } from "../rng";
import { rollRarity } from "../rarity";
import { RARITY_WEIGHTS } from "../../data/rarity";

describe("rng", () => {
  it("randInt stays within bounds", () => {
    for (let i = 0; i < 500; i++) {
      const v = randInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it("weightedPick never returns a zero-weight item", () => {
    const items = [{ w: 0 }, { w: 1 }];
    for (let i = 0; i < 100; i++) {
      expect(weightedPick(items, (x) => x.w).w).toBe(1);
    }
  });

  it("weightedPick throws on empty items", () => {
    expect(() => weightedPick([], () => 1)).toThrow();
  });

  it("shuffle preserves elements", () => {
    const a = [1, 2, 3, 4, 5];
    expect([...shuffle(a)].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("chance is boolean", () => {
    expect(typeof chance(0.5)).toBe("boolean");
  });

  it("rollRarity returns a configured rarity", () => {
    for (let i = 0; i < 200; i++) {
      expect(Object.keys(RARITY_WEIGHTS)).toContain(rollRarity());
    }
  });
});
