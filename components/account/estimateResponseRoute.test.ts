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

import { POST } from "@/app/api/tattoo-requests/[id]/estimate/route";

describe("client estimate response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: 7 });
    hasCompleteProfile.mockResolvedValue(true);
  });

  it("accepts only an existing quoted estimate", async () => {
    sql.mockResolvedValueOnce([{ id: 4 }]);
    const response = await POST(
      new Request("http://localhost/api/tattoo-requests/4/estimate", {
        method: "POST",
        body: JSON.stringify({ action: "accept" }),
      }),
      { params: Promise.resolve({ id: "4" }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "accepted" });
  });

  it("requires a useful message for a revised estimate", async () => {
    const response = await POST(
      new Request("http://localhost/api/tattoo-requests/4/estimate", {
        method: "POST",
        body: JSON.stringify({ action: "request_revision", message: "ne" }),
      }),
      { params: Promise.resolve({ id: "4" }) },
    );
    expect(response.status).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });
});
