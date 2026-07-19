import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

function iso(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export type TodayItem = {
  id: string;
  time: string;
  endTime: string | null;
  label: string;
  type: "consult" | "tattoo" | "manual";
  status: string;
};

export async function GET() {
  const sql = getSql();
  const now = new Date();
  const today = iso(now);
  const weekEnd = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

  const [counts] = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM bookings WHERE status = 'new') AS bookings_new,
      (SELECT COUNT(*)::int FROM tattoo_requests WHERE status = 'pending') AS requests_pending,
      (SELECT COUNT(*)::int FROM appointments WHERE date >= ${today} AND date < ${weekEnd} AND status = 'scheduled') AS week_appointments,
      (SELECT COUNT(*)::int FROM bookings WHERE date >= ${today} AND date < ${weekEnd} AND status IN ('new','confirmed')) AS week_bookings
  `) as {
    bookings_new: number;
    requests_pending: number;
    week_appointments: number;
    week_bookings: number;
  }[];

  const appts = (await sql`
    SELECT a.id, a.start_time, a.end_time, a.kind, a.status,
           COALESCE(NULLIF(a.title, ''), u.name, 'Termin') AS label
    FROM appointments a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.date = ${today} AND a.status = 'scheduled'
    ORDER BY a.start_time ASC
  `) as { id: number; start_time: string; end_time: string; kind: string; status: string; label: string }[];

  const consults = (await sql`
    SELECT id, name, slot, status
    FROM bookings
    WHERE date = ${today} AND status IN ('new', 'confirmed')
    ORDER BY slot ASC
  `) as { id: number; name: string; slot: string; status: string }[];

  const todayItems: TodayItem[] = [
    ...appts.map((a) => ({
      id: `a${a.id}`,
      time: a.start_time,
      endTime: a.end_time,
      label: a.label,
      type: (a.kind === "tattoo" ? "tattoo" : a.kind === "consult" ? "consult" : "manual") as TodayItem["type"],
      status: a.status,
    })),
    ...consults.map((b) => ({
      id: `b${b.id}`,
      time: b.slot,
      endTime: null,
      label: b.name,
      type: "consult" as const,
      status: b.status,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return NextResponse.json({
    ok: true,
    counts: {
      bookingsNew: counts.bookings_new,
      requestsPending: counts.requests_pending,
      week: counts.week_appointments + counts.week_bookings,
      today: todayItems.length,
    },
    today: todayItems,
  });
}
