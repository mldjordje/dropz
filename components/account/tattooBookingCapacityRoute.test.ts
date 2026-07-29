import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAnonymousTattooMonth,
  getBookableRequest,
  getSessionUser,
  hasCompleteProfile,
  getSql,
  sql,
} = vi.hoisted(() => {
  const sqlMock = vi.fn();
  return {
    getAnonymousTattooMonth: vi.fn(),
    getBookableRequest: vi.fn(),
    getSessionUser: vi.fn(),
    hasCompleteProfile: vi.fn(),
    getSql: vi.fn(() => sqlMock),
    sql: sqlMock,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql }));
vi.mock("@/lib/auth/user-session", () => ({ getSessionUser }));
vi.mock("@/lib/auth/profile", () => ({ hasCompleteProfile }));
vi.mock("@/lib/tattoo", () => ({ getBookableRequest }));
vi.mock("@/lib/tattoo-booking", () => ({ getAnonymousTattooMonth }));
vi.mock("@/lib/schedule", () => ({
  isValidTime: vi.fn(() => true),
  minutesToTime: vi.fn(() => "12:00"),
  timeToMinutes: vi.fn(() => 600),
}));

import { POST } from "@/app/api/tattoo-requests/[id]/book/route";

describe("POST tattoo slot request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: 7 });
    hasCompleteProfile.mockResolvedValue(true);
    getBookableRequest.mockResolvedValue({
      session_minutes: 120,
      sessions_done: 0,
      session_count: 1,
    });
  });

  it("rejects a slot that is no longer anonymously available", async () => {
    getAnonymousTattooMonth.mockResolvedValue({});

    const response = await POST(
      new Request("http://localhost/api/tattoo-requests/4/book", {
        method: "POST",
        body: JSON.stringify({ date: "2099-08-10", start: "10:00" }),
      }),
      { params: Promise.resolve({ id: "4" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "slot_taken" });
    expect(sql).not.toHaveBeenCalled();
  });

  it("creates a pending owner request instead of an appointment", async () => {
    getAnonymousTattooMonth.mockResolvedValue({ "2099-08-10": ["10:00"] });
    sql.mockResolvedValueOnce([
      {
        id: 9,
        request_id: 4,
        session_number: 1,
        requested_date: "2099-08-10",
        requested_start: "10:00",
        requested_end: "12:00",
        status: "pending_owner",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/tattoo-requests/4/book", {
        method: "POST",
        body: JSON.stringify({ date: "2099-08-10", start: "10:00" }),
      }),
      { params: Promise.resolve({ id: "4" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      slotRequest: { status: "pending_owner" },
    });
  });
});
