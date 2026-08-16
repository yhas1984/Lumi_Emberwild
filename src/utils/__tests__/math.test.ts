import { describe, expect, it } from "vitest";
import { clamp, dist, lerp, formatTime, romanNumeral } from "../math";

describe("math", () => {
  it("clamp", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it("dist", () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
  });

  it("lerp", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("formatTime", () => {
    expect(formatTime(59)).toBe("0:59");
    expect(formatTime(305)).toBe("5:05");
  });

  it("romanNumeral", () => {
    expect(romanNumeral(1)).toBe("I");
    expect(romanNumeral(3)).toBe("III");
    expect(romanNumeral(5)).toBe("V");
  });
});
