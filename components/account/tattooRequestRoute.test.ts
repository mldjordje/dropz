import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSql, getSessionUser, hasCompleteProfile, sql } = vi.hoisted(() => {
  const sqlMock = vi.fn();
  return {
    getSql: vi.fn(() => sqlMock),
    getSessionUser: vi.fn(),
    hasCompleteProfile: vi.fn(),
    sql: sqlMock,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql }));
vi.mock("@/lib/auth/user-session", () => ({ getSessionUser }));
vi.mock("@/lib/auth/profile", () => ({ hasCompleteProfile }));

import { POST } from "@/app/api/tattoo-requests/route";

describe("POST /api/tattoo-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: 42 });
    hasCompleteProfile.mockResolvedValue(true);
  });

  it("rejects a request when size is missing", async () => {
    sql
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ id: 1, description: "Minimalistički cvet", size: null }]);

    const response = await POST(
      new Request("http://localhost/api/tattoo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Minimalistički cvet" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("Veličina"),
    });
    expect(sql).not.toHaveBeenCalled();
  });

  it("ignores a legacy artistId and creates a studio-owned request", async () => {
    sql
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([
        {
          id: 1,
          user_id: 42,
          description: "Minimalistički cvet",
          size: "15cm",
          status: "pending",
        },
      ]);

    const response = await POST(
      new Request("http://localhost/api/tattoo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Minimalistički cvet",
          size: "15cm",
          artistId: 999,
        }),
      }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.request).not.toHaveProperty("artist_id");
    expect(data.request).not.toHaveProperty("artist_name");
  });
});
