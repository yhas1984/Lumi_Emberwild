import { describe, expect, it } from "vitest";
import { DIFFICULTIES, difficultyById, nextDifficulty } from "../difficulty";

describe("difficulty", () => {
  it("catalog: 4 tiers with strictly increasing modifiers", () => {
    expect(DIFFICULTIES.map((d) => d.id)).toEqual(["normal", "hard", "nightmare", "infernal"]);
    for (let i = 1; i < DIFFICULTIES.length; i++) {
      const prev = DIFFICULTIES[i - 1];
      const cur = DIFFICULTIES[i];
      expect(cur.enemyHp).toBeGreaterThan(prev.enemyHp);
      expect(cur.enemyDmg).toBeGreaterThan(prev.enemyDmg);
      expect(cur.bossHp).toBeGreaterThan(prev.bossHp);
      expect(cur.bossDmg).toBeGreaterThan(prev.bossDmg);
      expect(cur.spawnInterval).toBeLessThan(prev.spawnInterval);
      expect(cur.rewardMult).toBeGreaterThan(prev.rewardMult);
    }
  });

  it("difficultyById resolves valid ids and falls back to Normal", () => {
    expect(difficultyById("hard").id).toBe("hard");
    expect(difficultyById("nightmare").id).toBe("nightmare");
    expect(difficultyById("bogus" as never).id).toBe("normal");
    expect(difficultyById("" as never).id).toBe("normal");
  });

  it("nextDifficulty advances within bounds", () => {
    expect(nextDifficulty(difficultyById("normal"))?.id).toBe("hard");
    expect(nextDifficulty(difficultyById("hard"))?.id).toBe("nightmare");
    expect(nextDifficulty(difficultyById("nightmare"))?.id).toBe("infernal");
    expect(nextDifficulty(difficultyById("infernal"))).toBeNull();
  });
});
