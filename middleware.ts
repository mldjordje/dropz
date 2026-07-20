import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// Staff (artists) get exactly two pages — their calendar and their
// availability — plus the APIs those pages need (each of which additionally
// scopes data to the caller's own staffId server-side). Everything else in
// the panel is owner-only.
const STAFF_PAGES = ["/admin/kalendar", "/admin/dostupnost", "/admin/moji-radovi"];
const STAFF_APIS = [
  "/api/admin/me",
  "/api/admin/logout",
  "/api/admin/calendar",
  "/api/admin/appointments",
  "/api/admin/working-hours",
  "/api/admin/day-overrides",
  "/api/admin/my-works",
  "/api/admin/upload",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // login page and login API stay public
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  // Legacy tokens were signed as role:"admin" — treat them as the owner.
  const role = session?.role === "admin" ? "owner" : session?.role;
  if (role !== "owner" && role !== "staff") {
    return unauthorized(request);
  }

  if (role === "staff") {
    if (pathname.startsWith("/api/")) {
      if (!STAFF_APIS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
      }
    } else if (!STAFF_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/kalendar";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
