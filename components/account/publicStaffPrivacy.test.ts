import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/artists/route";

describe("public staff privacy", () => {
  it("does not expose a public staff roster", async () => {
    const response = await GET();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ ok: false, message: "Not found" });
  });
});
