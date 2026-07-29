import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSql, getSessionUser, sql } = vi.hoisted(() => {
  const sqlMock = vi.fn();
  return {
    getSql: vi.fn(() => sqlMock),
    getSessionUser: vi.fn(),
    sql: sqlMock,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql }));
vi.mock("@/lib/auth/user-session", () => ({ getSessionUser }));

import { PUT } from "@/app/api/me/profile/route";

const incomplete = {
  name: "Mila",
  email: "mila@example.com",
  phone: null,
  birthday: null,
  gender: null,
  city: null,
  birthday_locked_at: null,
  profile_completed_at: null,
  profile_prompt_dismissed_at: null,
};

describe("mandatory customer profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: 42 });
  });

  it("requires one of the supported gender values", async () => {
    sql.mockResolvedValueOnce([incomplete]);
    const response = await PUT(
      new Request("http://localhost/api/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          phone: "060 123 4567",
          birthday: "2000-01-01",
          gender: "other",
        }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining("pol"),
    });
  });

  it("completes the profile with phone, birthday and gender", async () => {
    const complete = {
      ...incomplete,
      phone: "060 123 4567",
      birthday: "2000-01-01",
      gender: "female",
      birthday_locked_at: "2026-01-01T00:00:00Z",
      profile_completed_at: "2026-01-01T00:00:00Z",
    };
    sql
      .mockResolvedValueOnce([incomplete])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([complete]);

    const response = await PUT(
      new Request("http://localhost/api/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          phone: "060 123 4567",
          birthday: "2000-01-01",
          gender: "female",
        }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      profile: { completed: true, gender: "female" },
    });
  });
});
