import { NextResponse } from "next/server";
import { getSql, type Booking } from "@/lib/db";
import { DATE_RE, getSlotsForDate } from "@/lib/availability";
import { getAdminSession } from "@/lib/auth/admin";

const STATUSES = ["new", "confirmed", "done", "canceled"] as const;

// Appointments created straight from the calendar (manual entries + tattoo
// sessions) live in a separate table and don't share the bookings id space —
// map them onto the Booking shape so they show up in the Termini list too.
const APPT_STATUS: Record<string, Booking["status"]> = {
  scheduled: "confirmed",
  done: "done",
  canceled: "canceled",
};

type ApptRow = {
  id: number;
  kind: "manual" | "tattoo";
  title: string | null;
  note: string | null;
  date: string;
  start_time: string;
  status: string;
  artist_name: string | null;
  user_name: string | null;
  user_email: string | null;
};

async function loadAppointmentBookings(fromDate?: string): Promise<Booking[]> {
  const session = await getAdminSession();
  if (!session) return [];
  const sql = getSql();
  const selectFrom = `
    SELECT a.id, a.kind, a.title, a.note, a.date::text AS date, a.start_time, a.status,
           art.name AS artist_name, u.name AS user_name, u.email AS user_email
    FROM appointments a
    LEFT JOIN staff art ON art.id = a.artist_id
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.kind IN ('manual', 'tattoo')`;
  let rows: ApptRow[];
  if (session.role === "owner" && fromDate) {
    rows = (await sql.query(
      `${selectFrom} AND a.date >= $1 ORDER BY a.date DESC, a.start_time ASC LIMIT 300`,
      [fromDate],
    )) as ApptRow[];
  } else if (session.role === "owner") {
    rows = (await sql.query(`${selectFrom} ORDER BY a.date DESC, a.start_time ASC LIMIT 300`)) as ApptRow[];
  } else if (fromDate) {
    rows = (await sql.query(
      `${selectFrom} AND a.artist_id = $1 AND a.date >= $2 ORDER BY a.date DESC, a.start_time ASC LIMIT 300`,
      [session.staffId, fromDate],
    )) as ApptRow[];
  } else {
    rows = (await sql.query(
      `${selectFrom} AND a.artist_id = $1 ORDER BY a.date DESC, a.start_time ASC LIMIT 300`,
      [session.staffId],
    )) as ApptRow[];
  }

  return rows.map((a) => ({
    id: a.id,
    name:
      a.kind === "tattoo"
        ? `Tattoo — ${a.user_name ?? a.user_email ?? "?"}`
        : (a.title ?? "Ručni unos"),
    contact: "",
    phone: null,
    kind: a.kind === "tattoo" ? "session" : "manual",
    note: a.artist_name ? `${a.artist_name}${a.note ? " · " + a.note : ""}` : a.note,
    date: a.date,
    slot: a.start_time,
    status: APPT_STATUS[a.status] ?? "confirmed",
    created_at: a.date,
    source: "appointment",
  })) as unknown as Booking[];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const from = params.get("from");

  const sql = getSql();
  let rows: Booking[];
  if (status && (STATUSES as readonly string[]).includes(status)) {
    rows = (await sql`
      SELECT id, name, contact, phone, kind, note, date::text AS date, slot, status, locale, created_at
      FROM bookings WHERE status = ${status} ORDER BY date ASC, slot ASC
    `) as Booking[];
  } else if (from) {
    rows = (await sql`
      SELECT id, name, contact, phone, kind, note, date::text AS date, slot, status, locale, created_at
      FROM bookings WHERE date >= ${from} ORDER BY date ASC, slot ASC
    `) as Booking[];
  } else {
    rows = (await sql`
      SELECT id, name, contact, phone, kind, note, date::text AS date, slot, status, locale, created_at
      FROM bookings ORDER BY date DESC, slot ASC LIMIT 300
    `) as Booking[];
  }

  const apptRows = await loadAppointmentBookings(from ?? undefined);
  const filteredAppts = status ? apptRows.filter((a) => a.status === status) : apptRows;
  const merged = [...rows, ...filteredAppts].sort((a, b) => (b.date + b.slot).localeCompare(a.date + a.slot));

  return NextResponse.json({ ok: true, bookings: merged });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  // Reschedule: move a booking to a different date/slot.
  if (typeof body.date === "string" || typeof body.slot === "string") {
    const date = typeof body.date === "string" ? body.date : "";
    const slot = typeof body.slot === "string" ? body.slot : "";
    if (!DATE_RE.test(date) || !slot) {
      return NextResponse.json({ ok: false, message: "Invalid date or slot" }, { status: 400 });
    }

    const sql = getSql();
    const available = await getSlotsForDate(sql, date);
    if (!available.includes(slot)) {
      return NextResponse.json({ ok: false, message: "Slot not available" }, { status: 400 });
    }

    const taken = (await sql`
      SELECT id FROM bookings WHERE date = ${date} AND slot = ${slot} AND status <> 'canceled' AND id <> ${id} LIMIT 1
    `) as { id: number }[];
    if (taken.length > 0) {
      return NextResponse.json({ ok: false, message: "Slot taken", code: "slot_taken" }, { status: 409 });
    }

    const updated = (await sql`
      UPDATE bookings SET date = ${date}, slot = ${slot} WHERE id = ${id} RETURNING id
    `) as { id: number }[];
    if (updated.length === 0) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const status = typeof body.status === "string" ? body.status : "";
  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, message: "Invalid status" }, { status: 400 });
  }

  const sql = getSql();
  const updated = (await sql`
    UPDATE bookings SET status = ${status} WHERE id = ${id} RETURNING id
  `) as { id: number }[];
  if (updated.length === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
