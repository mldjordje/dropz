import { NextResponse } from "next/server";
import { clearUserSessionCookie } from "@/lib/auth/user-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearUserSessionCookie(response);
  return response;
}
