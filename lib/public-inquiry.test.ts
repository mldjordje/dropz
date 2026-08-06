import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSql, sql, queueQuietly, queueStudioNotice } = vi.hoisted(() => {
  const sqlMock = vi.fn();
  return {
    getSql: vi.fn(() => sqlMock),
    sql: sqlMock,
    queueQuietly: vi.fn().mockResolvedValue({ queued: true, sent: true }),
    queueStudioNotice: vi.fn().mockResolvedValue({ queued: true, sent: true }),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getSql }));
vi.mock("@/lib/email", () => ({ queueQuietly, queueStudioNotice }));

import { POST } from "@/app/api/inquiries/route";

describe("POST /api/inquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid public inquiry without a user session", async () => {
    sql.mockResolvedValueOnce([{ id: 17 }]);
    const response = await POST(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ana Anić",
          contact: "ana@example.com",
          description: "Želim fine-line motiv ruže na podlaktici.",
          size: "12 cm",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ ok: true, id: 17 });
    expect(sql).toHaveBeenCalledTimes(1);
    expect(queueStudioNotice).toHaveBeenCalledTimes(1);
    expect(queueQuietly).toHaveBeenCalledTimes(1);
  });

  it("rejects a short description before touching the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ana",
          contact: "060123456",
          description: "Ruža",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it("quietly ignores honeypot submissions", async () => {
    const response = await POST(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: "https://spam.example" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(sql).not.toHaveBeenCalled();
    expect(queueStudioNotice).not.toHaveBeenCalled();
  });
});
