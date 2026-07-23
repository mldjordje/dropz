import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { DATE_RE, getSlotsForDate } from "@/lib/availability";
import { getActiveArtistById, getArtistConsultSlotsForDate } from "@/lib/consult";

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
  // "svejedno" (the owner takes it). When an artist is chosen the valid slots
  // come from THAT artist's schedule (working hours + exceptions, minus their
  // calendar); no preference falls back to the studio consult-days calendar.
  let artistId: number | null = null;
  if (body.artistId !== undefined && body.artistId !== null && body.artistId !== "") {
    const requested = Number(body.artistId);
    if (!Number.isInteger(requested)) {
      return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
    }
    const artist = await getActiveArtistById(sql, requested);
    if (!artist) {
      return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
    }
    artistId = artist.id;
    const slots = await getArtistConsultSlotsForDate(sql, artist, date);
    if (!slots.includes(slot)) {
      return NextResponse.json({ ok: false, message: "Slot taken", code: "slot_taken" }, { status: 409 });
    }
  } else {
    const slots = await getSlotsForDate(sql, date);
    if (!slots.includes(slot)) {
      return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
    }
  }

  // Slots are unique per (date, slot, artist) — a no-preference consult maps to
  // the owner's bucket. Check the matching bucket, then let the unique index be
  // the final backstop for a concurrent insert.
  const taken = (await sql`
    SELECT id FROM bookings
    WHERE date = ${date} AND slot = ${slot} AND status <> 'canceled'
      AND COALESCE(artist_id, 0) = COALESCE(${artistId}, 0)
    LIMIT 1
  `) as { id: number }[];
  if (taken.length > 0) {
    return NextResponse.json({ ok: false, message: "Slot taken", code: "slot_taken" }, { status: 409 });
  }

  let inserted: { id: number }[];
  try {
    inserted = (await sql`
      INSERT INTO bookings (name, contact, kind, note, date, slot, locale, artist_id)
      VALUES (${name}, ${contact}, 'consult', ${note || null}, ${date}, ${slot}, ${locale}, ${artistId})
      RETURNING id
    `) as { id: number }[];
  } catch (err) {
    // Unique-index violation = someone grabbed this exact slot first.
    if (err instanceof Error && /bookings_active_slot|duplicate key/i.test(err.message)) {
      return NextResponse.json({ ok: false, message: "Slot taken", code: "slot_taken" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, id: inserted[0].id }, { status: 201 });
}
