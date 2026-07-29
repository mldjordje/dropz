import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  finalizeTattooSlotRequest,
  getAdminSession,
  getSql,
  sql,
} = vi.hoisted(() => {
  const sqlMock = vi.fn();
  return {
    finalizeTattooSlotRequest: vi.fn(),
    getAdminSession: vi.fn(),
    getSql: vi.fn(() => sqlMock),
    sql: sqlMock,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql }));
vi.mock("@/lib/auth/admin", () => ({ getAdminSession }));
vi.mock("@/lib/tattoo-booking", () => ({
  finalizeTattooSlotRequest,
  isArtistAvailableForTattoo: vi.fn(),
}));

import { PATCH } from "@/app/api/admin/tattoo-slot-requests/route";

describe("owner slot decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminSession.mockResolvedValue({ role: "owner", staffId: 1 });
    sql.mockResolvedValueOnce([
      {
        id: 8,
        request_id: 4,
        status: "pending_owner",
        requested_date: "2099-08-10",
        requested_start: "10:00",
        requested_end: "12:00",
        user_id: 7,
        session_minutes: 120,
      },
    ]);
  });

  it("does not partially confirm when capacity or staff availability changed", async () => {
    finalizeTattooSlotRequest.mockResolvedValue(null);
    const response = await PATCH(
      new Request("http://localhost/api/admin/tattoo-slot-requests", {
        method: "PATCH",
        body: JSON.stringify({ id: 8, action: "confirm", artistId: 2 }),
      }),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "slot_taken" });
  });

  it("creates a final appointment only through the atomic finalizer", async () => {
    finalizeTattooSlotRequest.mockResolvedValue({
      id: 19,
      request_id: 4,
      artist_id: 2,
      status: "scheduled",
    });
    sql.mockResolvedValueOnce([]);
    const response = await PATCH(
      new Request("http://localhost/api/admin/tattoo-slot-requests", {
        method: "PATCH",
        body: JSON.stringify({ id: 8, action: "confirm", artistId: 2 }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "confirmed",
      appointment: { id: 19 },
    });
  });
});
