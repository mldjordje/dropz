import "server-only";
import { cookies } from "next/headers";
import type { JWTPayload } from "jose";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

// Admin-panel session: the owner (password login or Google) or a staff artist
// (Google login, matched by email in the staff table). Legacy tokens signed as
// role:"admin" (before roles existed) are treated as the owner.

export type AdminRole = "owner" | "staff";

export type AdminSession = {
  role: AdminRole;
  staffId: number | null; // null only on legacy owner tokens
  name: string | null;
};

export function toAdminSession(payload: JWTPayload | null): AdminSession | null {
  if (!payload) return null;
  const role = payload.role === "admin" ? "owner" : payload.role;
  if (role !== "owner" && role !== "staff") return null;
  return {
    role,
    staffId: typeof payload.staffId === "number" ? payload.staffId : null,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

// Reads the admin session from request cookies (route handlers, server
// components). Middleware already gates /api/admin/*, but routes that scope
// data per role must call this themselves.
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return toAdminSession(await verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value));
}
