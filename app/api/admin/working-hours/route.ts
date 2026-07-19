import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isValidTime, type WorkingHours } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth for /api/admin/* is enforced by middleware.ts.

export async function GET() {
  const sql = getSql();
  const rows = (await sql`
    SELECT weekday, open_time, close_time FROM working_hours ORDER BY weekday
  `) as WorkingHours[];
  return NextResponse.json({ ok: true, hours: rows });
}

// PUT { weekday, open, close } — open/close both "HH:MM", or both null = closed.
export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
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
    INSERT INTO working_hours (weekday, open_time, close_time)
    VALUES (${weekday}, ${open}, ${close})
    ON CONFLICT (weekday) DO UPDATE SET open_time = ${open}, close_time = ${close}
  `;
  return NextResponse.json({ ok: true });
}
