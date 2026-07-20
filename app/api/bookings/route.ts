import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { DATE_RE, getSlotsForDate } from "@/lib/availability";

function isFutureDate(date: string) {
  if (!DATE_RE.test(date)) return false;
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d > today;
}

// Public: available slots + taken slots for a date, so the form can show/disable them.
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, message: "Invalid date" }, { status: 400 });
  }
  const sql = getSql();
  const slots = await getSlotsForDate(sql, date);
  const rows = (await sql`
    SELECT slot FROM bookings WHERE date = ${date} AND status <> 'canceled'
  `) as { slot: string }[];
  return NextResponse.json({ ok: true, slots, taken: rows.map((r) => r.slot) });
}

// Public: create a free-consultation booking request from the site form.
// Bookings are consultations only — any deposit is agreed and paid in person.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 160) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const date = typeof body.date === "string" ? body.date : "";
  const slot = typeof body.slot === "string" ? body.slot : "";
  const locale = typeof body.locale === "string" ? body.locale.slice(0, 8) : null;

  if (!name || !contact || !isFutureDate(date)) {
    return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
  }

  const sql = getSql();

  // Optional artist preference — must be an active team member; absent means
  // "svejedno" (the owner takes it). Slots stay globally unique either way:
  // the studio runs one consultation at a time.
  let artistId: number | null = null;
  if (body.artistId !== undefined && body.artistId !== null && body.artistId !== "") {
    const requested = Number(body.artistId);
    if (!Number.isInteger(requested)) {
      return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
    }
    const found = (await sql`SELECT id FROM staff WHERE id = ${requested} AND active`) as { id: number }[];
    if (found.length === 0) {
      return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
    }
    artistId = requested;
  }
  const slots = await getSlotsForDate(sql, date);
  if (!slots.includes(slot)) {
    return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
  }

  const taken = (await sql`
    SELECT id FROM bookings WHERE date = ${date} AND slot = ${slot} AND status <> 'canceled' LIMIT 1
  `) as { id: number }[];
  if (taken.length > 0) {
    return NextResponse.json({ ok: false, message: "Slot taken", code: "slot_taken" }, { status: 409 });
  }

  const inserted = (await sql`
    INSERT INTO bookings (name, contact, kind, note, date, slot, locale, artist_id)
    VALUES (${name}, ${contact}, 'consult', ${note || null}, ${date}, ${slot}, ${locale}, ${artistId})
    RETURNING id
  `) as { id: number }[];

  return NextResponse.json({ ok: true, id: inserted[0].id }, { status: 201 });
}
