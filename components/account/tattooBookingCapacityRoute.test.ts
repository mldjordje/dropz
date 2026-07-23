import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createTattooAppointmentWithinCapacity,
  getBookableRequest,
  getSessionUser,
  getSql,
  sql,
} = vi.hoisted(() => {
  const sqlMock = vi.fn();
  return {
    createTattooAppointmentWithinCapacity: vi.fn(),
    getBookableRequest: vi.fn(),
    getSessionUser: vi.fn(),
    getSql: vi.fn(() => sqlMock),
    sql: sqlMock,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql }));
vi.mock("@/lib/auth/user-session", () => ({ getSessionUser }));
vi.mock("@/lib/tattoo", () => ({ getBookableRequest }));
vi.mock("@/lib/staff", () => ({
  getArtistBusyMap: vi.fn().mockResolvedValue({}),
  getOwner: vi.fn().mockResolvedValue(null),
  getStaffById: vi.fn().mockResolvedValue({ id: 2, name: "Artist", role: "staff" }),
  getStaffOverrides: vi.fn().mockResolvedValue([]),
  getStaffWeeklyHours: vi.fn().mockResolvedValue([{ weekday: 0, open_time: "10:00", close_time: "20:00" }]),
  hoursForDate: vi.fn(() => ({ open_time: "10:00", close_time: "20:00" })),
}));
vi.mock("@/lib/schedule", () => ({
  createTattooAppointmentWithinCapacity,
  filterStartsByTattooCapacity: vi.fn((starts: string[]) => starts),
  freeStartTimes: vi.fn(() => ["10:00"]),
  getTattooBusyMap: vi.fn().mockResolvedValue({}),
  isValidTime: vi.fn(() => true),
  minutesToTime: vi.fn(() => "12:00"),
  timeToMinutes: vi.fn(() => 600),
}));

import { POST } from "@/app/api/tattoo-requests/[id]/book/route";

describe("POST tattoo session booking capacity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: 7 });
    getBookableRequest.mockResolvedValue({ artist_id: 2, session_minutes: 120 });
    createTattooAppointmentWithinCapacity.mockResolvedValue(null);
    sql.mockResolvedValueOnce([{ id: 9 }]);
  });

  it("rejects the fourth overlapping tattoo session", async () => {
    const response = await POST(
      new Request("http://localhost/api/tattoo-requests/4/book", {
        method: "POST",
        body: JSON.stringify({ date: "2099-08-10", start: "10:00" }),
      }),
      { params: Promise.resolve({ id: "4" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "studio_full" });
  });
});
