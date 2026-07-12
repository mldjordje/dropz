import { describe, expect, it } from "vitest";
import { chapterProgress, normalizeScroll } from "./scroll";

describe("normalizeScroll", () => {
  it("maps document bounds and midpoint", () => {
    expect(normalizeScroll(0, 2000, 1000)).toBe(0);
    expect(normalizeScroll(500, 2000, 1000)).toBe(0.5);
    expect(normalizeScroll(1000, 2000, 1000)).toBe(1);
  });

  it("clamps overflow and guards short documents", () => {
    expect(normalizeScroll(-100, 2000, 1000)).toBe(0);
    expect(normalizeScroll(1400, 2000, 1000)).toBe(1);
    expect(normalizeScroll(100, 900, 1000)).toBe(0);
  });
});

describe("chapterProgress", () => {
  it("maps a chapter range to zero through one", () => {
    expect(chapterProgress(0.2, 0.2, 0.4)).toBe(0);
    expect(chapterProgress(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(chapterProgress(0.5, 0.2, 0.4)).toBe(1);
  });
});
