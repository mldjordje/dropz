import { NextResponse } from "next/server";
import { getSql, type Booking } from "@/lib/db";
import { DATE_RE, getSlotsForDate } from "@/lib/availability";

const STATUSES = ["new", "confirmed", "done", "canceled"] as const;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const from = params.get("from");

  const sql = getSql();
  let rows: Booking[];
  if (status && (STATUSES as readonly string[]).includes(status)) {
    rows = (await sql`
      SELECT * FROM bookings WHERE status = ${status} ORDER BY date ASC, slot ASC
    `) as Booking[];
  } else if (from) {
    rows = (await sql`
      SELECT * FROM bookings WHERE date >= ${from} ORDER BY date ASC, slot ASC
    `) as Booking[];
  } else {
    rows = (await sql`
      SELECT * FROM bookings ORDER BY date DESC, slot ASC LIMIT 300
    `) as Booking[];
  }
  return NextResponse.json({ ok: true, bookings: rows });
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
