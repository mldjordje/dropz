import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { DATE_RE } from "@/lib/availability";
import { isValidTime } from "@/lib/schedule";
import { getStaffOverrides, resolveArtistId } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-date exceptions to an artist's weekly schedule ("adjust when I work in
// the future"): an override wins for that date; open/close both null = closed.
// Staff manage only their own; the owner can pass staffId.

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const staffId = await resolveArtistId(getSql(), session, params.get("staffId") ?? undefined);
  if (!staffId) {
    return NextResponse.json({ ok: false, message: "Nedostaje staffId." }, { status: 400 });
  }
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ ok: false, message: "Invalid range" }, { status: 400 });
  }

  const overrides = await getStaffOverrides(getSql(), staffId, from, to);
  return NextResponse.json({ ok: true, overrides, staffId });
}

// PUT { staffId?, date, open, close } — upsert an override ("HH:MM" pair, or
// both null = closed that day).
export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const staffId = await resolveArtistId(getSql(), session, body.staffId);
  if (!staffId) {
    return NextResponse.json({ ok: false, message: "Nedostaje staffId." }, { status: 400 });
  }
  const date = typeof body.date === "string" ? body.date : "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, message: "Neispravan datum." }, { status: 400 });
  }

  const closed = body.open === null && body.close === null;
  if (!closed) {
    if (!isValidTime(body.open) || !isValidTime(body.close) || body.open >= body.close) {
      return NextResponse.json(
        { ok: false, message: "Neispravno vreme (početak mora biti pre kraja)." },
        { status: 400 },
      );
    }
  }
  const open = closed ? null : (body.open as string);
  const close = closed ? null : (body.close as string);

  const sql = getSql();
  await sql`
    INSERT INTO staff_day_overrides (staff_id, date, open_time, close_time)
    VALUES (${staffId}, ${date}, ${open}, ${close})
    ON CONFLICT (staff_id, date) DO UPDATE SET open_time = ${open}, close_time = ${close}
  `;
  return NextResponse.json({ ok: true });
}

// DELETE { staffId?, date } — drop the override, weekly schedule applies again.
export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const staffId = await resolveArtistId(getSql(), session, body.staffId);
  if (!staffId) {
    return NextResponse.json({ ok: false, message: "Nedostaje staffId." }, { status: 400 });
  }
  const date = typeof body.date === "string" ? body.date : "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, message: "Neispravan datum." }, { status: 400 });
  }

  const sql = getSql();
  await sql`DELETE FROM staff_day_overrides WHERE staff_id = ${staffId} AND date = ${date}`;
  return NextResponse.json({ ok: true });
}
