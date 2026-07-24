import { describe, expect, it, vi } from "vitest";

// SITE.hours is the single source of truth for opening hours; these lock the
// derived strings so a drifting footer can't silently reappear.
async function withHours(hours: { days: string[]; opens: string; closes: string }[]) {
  vi.resetModules();
  vi.doMock("@/lib/site", () => ({ SITE: { hours } }));
  return import("./hours");
}

describe("weekHours", () => {
  it("returns all seven days in week order, closed days without times", async () => {
    const { weekHours, isOpenDay } = await withHours([
      { days: ["Tuesday", "Wednesday"], opens: "11:00", closes: "15:00" },
    ]);
    const week = weekHours();
    expect(week).toHaveLength(7);
    expect(week[0].day).toBe("Monday");
    expect(week[6].day).toBe("Sunday");
    expect(week.filter(isOpenDay).map((d) => d.day)).toEqual(["Tuesday", "Wednesday"]);
    expect(week[0].opens).toBeUndefined();
  });
});

describe("shortHours", () => {
  it("collapses a contiguous, uniform week to a range", async () => {
    const { shortHours } = await withHours([
      { days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "11:00", closes: "15:00" },
    ]);
    expect(shortHours()).toBe("Uto–Sub · 11–15h");
  });

  it("drops the closing time when it varies across open days", async () => {
    const { shortHours } = await withHours([
      { days: ["Tuesday", "Thursday", "Friday", "Saturday"], opens: "11:00", closes: "15:00" },
      { days: ["Wednesday"], opens: "11:00", closes: "01:00" },
    ]);
    expect(shortHours()).toBe("Uto–Sub · od 11h");
  });

  it("lists days when the open days aren't contiguous", async () => {
    const { shortHours } = await withHours([
      { days: ["Monday", "Friday"], opens: "11:00", closes: "15:00" },
    ]);
    expect(shortHours()).toBe("Pon, Pet · 11–15h");
  });

  it("falls back when nothing is open", async () => {
    const { shortHours } = await withHours([]);
    expect(shortHours()).toBe("Po dogovoru");
  });

  it("keeps non-zero minutes", async () => {
    const { shortHours } = await withHours([
      { days: ["Tuesday"], opens: "11:30", closes: "15:00" },
    ]);
    expect(shortHours()).toBe("Uto · 11:30–15h");
  });
});
