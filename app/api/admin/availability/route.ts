import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { DATE_RE, MONTH_RE, DEFAULT_CONSULT_SLOTS, normalizeSlots } from "@/lib/availability";

function isMonday(date: string) {
  return new Date(`${date}T12:00:00`).getDay() === 1;
}

// Admin: every day in a month with its effective slots + whether it's a
// default-open Monday or an explicit override.
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "Invalid month" }, { status: 400 });
  }

  const [yearStr, monthStr] = month.split("-");
  const total = new Date(Number(yearStr), Number(monthStr), 0).getDate();

  const sql = getSql();
  const overrides = (await sql`
    SELECT date::text AS date, slots FROM consult_days
    WHERE date >= ${`${month}-01`} AND date < (${`${month}-01`}::date + INTERVAL '1 month')
  `) as { date: string; slots: string[] }[];
  const overrideMap = new Map(overrides.map((r) => [r.date, r.slots]));

  const days = [];
  for (let day = 1; day <= total; day++) {
    const date = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
    const isDefaultOpen = isMonday(date);
    const override = overrideMap.get(date);
    const isOverride = override !== undefined;
    const slots = isOverride ? override : isDefaultOpen ? [...DEFAULT_CONSULT_SLOTS] : [];
    days.push({ date, slots, isOverride, isDefaultOpen });
  }

  return NextResponse.json({ ok: true, days });
}

// Admin: open/extend/close a specific date. Empty slots array closes the day.
export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  const slots = normalizeSlots(body.slots);
  if (!DATE_RE.test(date) || slots === null) {
    return NextResponse.json({ ok: false, message: "Invalid date or slots" }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    INSERT INTO consult_days (date, slots)
    VALUES (${date}, ${slots})
    ON CONFLICT (date) DO UPDATE SET slots = EXCLUDED.slots
  `;

  return NextResponse.json({ ok: true });
}

// Admin: remove an override, reverting the date back to the default rule.
export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, message: "Invalid date" }, { status: 400 });
  }

  const sql = getSql();
  await sql`DELETE FROM consult_days WHERE date = ${date}`;

  return NextResponse.json({ ok: true });
}
