import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { MONTH_RE, getMonthAvailability } from "@/lib/availability";

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Public: which dates in a month are open for consultations, so the calendar
// can enable/disable days without guessing at the weekday rule.
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "Invalid month" }, { status: 400 });
  }

  const sql = getSql();
  const all = await getMonthAvailability(sql, month);
  const today = todayIso();

  const days: Record<string, string[]> = {};
  for (const [date, slots] of Object.entries(all)) {
    if (date > today) days[date] = slots;
  }

  return NextResponse.json({ ok: true, days });
}
