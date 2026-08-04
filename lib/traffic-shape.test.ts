import { describe, expect, it } from "vitest";
import {
  pickDays,
  rangeFor,
  sumPoints,
  toDaily,
  toLifetime,
  toRows,
} from "./traffic-shape";

describe("traffic response shaping", () => {
  it("allows only supported report ranges", () => {
    expect(pickDays("7")).toBe(7);
    expect(pickDays("90")).toBe(90);
    expect(pickDays("365")).toBe(30);
    expect(pickDays("not-a-number")).toBe(30);
  });

  it("creates an inclusive date range", () => {
    expect(rangeFor(7, new Date("2026-08-04T12:00:00.000Z"))).toEqual({
      since: "2026-07-29",
      until: "2026-08-04",
    });
  });

  it("normalizes and sorts daily points", () => {
    const points = toDaily({
      data: [
        {
          timestamp: "2026-08-04T00:00:00.000Z",
          pageviews: 12,
          visitors: 8,
        },
        {
          timestamp: "2026-08-03T00:00:00.000Z",
          pageviews: 5,
          visitors: 4,
        },
      ],
    });

    expect(points.map((point) => point.date)).toEqual([
      "2026-08-03",
      "2026-08-04",
    ]);
    expect(sumPoints(points)).toEqual({ pageviews: 17, visitors: 12 });
  });

  it("normalizes aggregate rows and lifetime counts", () => {
    expect(
      toRows(
        { data: [{ route: "/kontakt", pageviews: 9, visitors: 6 }] },
        "route",
        "—",
      ),
    ).toEqual([{ label: "/kontakt", pageviews: 9, visitors: 6 }]);

    expect(toLifetime({ data: { pageviews: 100, visitors: 70 } })).toEqual({
      pageviews: 100,
      visitors: 70,
    });
    expect(toLifetime(null)).toBeNull();
  });
});
