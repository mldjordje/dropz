import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("accepts local and international forms as typed", () => {
    expect(normalizePhone("060 123 4567")).toBe("060 123 4567");
    expect(normalizePhone("  +381 60 123-4567 ")).toBe("+381 60 123-4567");
    expect(normalizePhone("(011) 123/456")).toBe("(011) 123/456");
  });

  it("rejects emails, handles and anything too short to dial", () => {
    expect(normalizePhone("marko@gmail.com")).toBeNull();
    expect(normalizePhone("@marko.ink")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});
