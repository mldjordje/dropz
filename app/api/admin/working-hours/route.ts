import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { isValidTime, type WorkingHours } from "@/lib/schedule";
import { getStaffWeeklyHours, resolveArtistId } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-artist weekly hours. Staff can only read/write their own schedule; the
// owner can pass ?staffId= / body.staffId to manage anyone's.

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const staffId = await resolveArtistId(getSql(), session, new URL(request.url).searchParams.get("staffId") ?? undefined);
  if (!staffId) {
    return NextResponse.json({ ok: false, message: "Nedostaje staffId." }, { status: 400 });
  }

  const rows = await getStaffWeeklyHours(getSql(), staffId);
  return NextResponse.json({ ok: true, hours: rows as WorkingHours[], staffId });
}

// PUT { staffId?, weekday, open, close } — open/close both "HH:MM", or both null = closed.
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

  const weekday = Number(body.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ ok: false, message: "Invalid weekday" }, { status: 400 });
  }

  const closed = body.open === null && body.close === null;
  if (!closed) {
    if (!isValidTime(body.open) || !isValidTime(body.close) || body.open >= body.close) {
      return NextResponse.json(
        { ok: false, message: "Neispravno radno vreme (početak mora biti pre kraja)." },
        { status: 400 },
      );
    }
  }
  const open = closed ? null : (body.open as string);
  const close = closed ? null : (body.close as string);

  const sql = getSql();
  await sql`
    INSERT INTO staff_working_hours (staff_id, weekday, open_time, close_time)
    VALUES (${staffId}, ${weekday}, ${open}, ${close})
    ON CONFLICT (staff_id, weekday) DO UPDATE SET open_time = ${open}, close_time = ${close}
  `;
  return NextResponse.json({ ok: true });
}
