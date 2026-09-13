import { describe, expect, it } from "vitest";
import { ownerShareEur, splitSession } from "./earnings";

describe("ownerShareEur", () => {
  it("splits 50/50 below 200 €", () => {
    expect(ownerShareEur(100)).toBe(50);
    expect(ownerShareEur(199)).toBe(99.5);
  });

  it("gives the owner a flat 80 € from 200 € up to 250 €", () => {
    expect(ownerShareEur(200)).toBe(80);
    expect(ownerShareEur(249)).toBe(80);
  });

  it("gives the owner a flat 100 € from 250 € up", () => {
    expect(ownerShareEur(250)).toBe(100);
    expect(ownerShareEur(300)).toBe(100);
    expect(ownerShareEur(900)).toBe(100);
  });

  it("returns 0 for missing or non-positive prices", () => {
    expect(ownerShareEur(0)).toBe(0);
    expect(ownerShareEur(-5)).toBe(0);
  });
});

describe("splitSession", () => {
  const rate = 100; // round numbers: 1 € = 100 RSD

  it("converts RSD prices through the EUR rules", () => {
    expect(splitSession(10_000, rate, false)).toEqual({ owner: 5_000, artist: 5_000 });
    expect(splitSession(20_000, rate, false)).toEqual({ owner: 8_000, artist: 12_000 });
    expect(splitSession(30_000, rate, false)).toEqual({ owner: 10_000, artist: 20_000 });
  });

  it("keeps the owner's own sessions entirely his", () => {
    expect(splitSession(30_000, rate, true)).toEqual({ owner: 30_000, artist: 0 });
  });

  it("treats a missing price as nothing to split", () => {
    expect(splitSession(null, rate, false)).toEqual({ owner: 0, artist: 0 });
  });
});
