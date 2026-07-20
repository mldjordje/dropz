import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { setSessionCookie, signSessionToken } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { getOwner } from "@/lib/staff";

export const runtime = "nodejs";

function passwordMatches(input: string, expected: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !process.env.AUTH_JWT_SECRET) {
    return NextResponse.json(
      { ok: false, message: "Admin auth is not configured." },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !passwordMatches(password, expected)) {
    return NextResponse.json({ ok: false, message: "Pogrešna lozinka." }, { status: 401 });
  }

  // Password login is the owner's door. staffId ties his session to the staff
  // row so calendars/hours resolve to him; null only if migration hasn't run.
  let owner = null;
  try {
    owner = await getOwner(getSql());
  } catch {
    // staff table missing (pre-migration) — legacy owner session still works.
  }
  const token = await signSessionToken({
    role: "owner",
    staffId: owner?.id ?? null,
    name: owner?.name ?? "Dragan",
  });
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token);
  return response;
}
