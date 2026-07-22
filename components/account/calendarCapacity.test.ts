import { describe, expect, it } from "vitest";

import * as shared from "@/app/admin/shared";

describe("admin tattoo capacity status", () => {
  it("reports two occupied and one free tattoo station for the selected period", () => {
    expect(
      shared.tattooCapacityStatus(
        [
          { id: 1, date: "2026-08-10", start_time: "09:00", end_time: "12:00" },
          { id: 2, date: "2026-08-10", start_time: "10:30", end_time: "13:00" },
          { id: 3, date: "2026-08-11", start_time: "10:00", end_time: "12:00" },
        ],
        "2026-08-10",
        "10:00",
        "11:00",
      ),
    ).toEqual({ occupied: 2, available: 1, full: false });
  });

  it("flags legacy or external overbooking instead of hiding the fourth session", () => {
    const intervals = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      date: "2026-08-10",
      start_time: "10:00",
      end_time: "12:00",
    }));

    expect(shared.tattooCapacityStatus(intervals, "2026-08-10", "10:00", "11:00")).toEqual({
      occupied: 4,
      available: 0,
      full: true,
      overbooked: true,
    });
  });
});
