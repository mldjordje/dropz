import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { DATE_RE } from "@/lib/availability";
import type { Appointment, WorkingHours } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth for /api/admin/* is enforced by middleware.ts.

type ConsultRow = {
  id: number;
  name: string;
  contact: string;
  note: string | null;
  date: string;
  slot: string;
  status: string;
};

type AppointmentRow = Appointment & {
  user_name: string | null;
  user_email: string | null;
  request_description: string | null;
};

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — everything the calendar shows in one
// call: appointments (tattoo sessions + manual entries), consult bookings
// (bookings table stays their source of truth), and the weekly working hours.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ ok: false, message: "Invalid range" }, { status: 400 });
  }

  const sql = getSql();
  const [appointmentsRaw, consultsRaw, hoursRaw] = await Promise.all([
    sql`
      SELECT a.id, a.kind, a.title, a.request_id, a.user_id, a.date::text AS date,
             a.start_time, a.end_time, a.note, a.status, a.created_at,
             u.name AS user_name, u.email AS user_email,
             r.description AS request_description
      FROM appointments a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN tattoo_requests r ON r.id = a.request_id
      WHERE a.date >= ${from} AND a.date < ${to}
      ORDER BY a.date, a.start_time
    `,
    sql`
      SELECT id, name, contact, note, date::text AS date, slot, status
      FROM bookings
      WHERE date >= ${from} AND date < ${to} AND status <> 'canceled'
      ORDER BY date, slot
    `,
    sql`
      SELECT weekday, open_time, close_time FROM working_hours ORDER BY weekday
    `,
  ]);
  const appointments = appointmentsRaw as AppointmentRow[];
  const consults = consultsRaw as ConsultRow[];
  const hours = hoursRaw as WorkingHours[];

  return NextResponse.json({ ok: true, appointments, consults, hours });
}
