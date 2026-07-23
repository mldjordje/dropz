import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as schedule from "@/lib/schedule";

describe("tattoo studio capacity", () => {
  it("removes a start time when all three tattoo stations overlap it", () => {
    expect(
      schedule.filterStartsByTattooCapacity(["10:00", "10:30"], 60, [
        { start_time: "09:00", end_time: "11:00" },
        { start_time: "09:30", end_time: "10:30" },
        { start_time: "10:00", end_time: "10:30" },
      ]),
    ).toEqual(["10:30"]);
  });

  it("allows a long session when three existing sessions occur sequentially", () => {
    expect(
      schedule.filterStartsByTattooCapacity(["10:00"], 180, [
        { start_time: "10:00", end_time: "11:00" },
        { start_time: "11:00", end_time: "12:00" },
        { start_time: "12:00", end_time: "13:00" },
      ]),
    ).toEqual(["10:00"]);
  });

  it("loads only tattoo sessions into the studio busy map", async () => {
    const sql = vi.fn().mockResolvedValue([
      { date: "2026-08-10", start_time: "10:00", end_time: "12:00" },
      { date: "2026-08-10", start_time: "11:00", end_time: "13:00" },
    ]);

    await expect(schedule.getTattooBusyMap(sql as never, "2026-08-10", "2026-08-10")).resolves.toEqual({
      "2026-08-10": [
        { start_time: "10:00", end_time: "12:00" },
        { start_time: "11:00", end_time: "13:00" },
      ],
    });
  });

  it("returns a tattoo appointment created by the serialized capacity transaction", async () => {
    const row = {
      id: 9,
      kind: "tattoo",
      title: null,
      request_id: 4,
      user_id: 7,
      artist_id: 2,
      date: "2026-08-10",
      start_time: "10:00",
      end_time: "12:00",
      note: null,
      status: "scheduled",
      created_at: "2026-08-01T10:00:00Z",
    };
    const transaction = vi.fn(async (build: (txn: ReturnType<typeof vi.fn>) => unknown[]) => {
      const txn = vi.fn(() => Promise.resolve([]));
      build(txn);
      expect(txn).toHaveBeenCalledTimes(2);
      return [[], [row]];
    });

    await expect(
      schedule.createTattooAppointmentWithinCapacity({ transaction } as never, {
        requestId: 4,
        userId: 7,
        artistId: 2,
        date: "2026-08-10",
        start: "10:00",
        end: "12:00",
      }),
    ).resolves.toEqual(row);
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("updates a tattoo appointment through the same serialized capacity transaction", async () => {
    const transaction = vi.fn(async (build: (txn: ReturnType<typeof vi.fn>) => unknown[]) => {
      const txn = vi.fn(() => Promise.resolve([]));
      build(txn);
      expect(txn).toHaveBeenCalledTimes(2);
      return [[], [{ id: 9 }]];
    });

    await expect(
      schedule.updateTattooAppointmentWithinCapacity({ transaction } as never, {
        id: 9,
        date: "2026-08-10",
        start: "10:00",
        end: "12:00",
        title: null,
        note: null,
        status: "scheduled",
      }),
    ).resolves.toBe(true);
  });
});
