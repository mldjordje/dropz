import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { DATE_RE, getSlotsForDate } from "@/lib/availability";
import { emailAddressFromContact } from "@/lib/email-payload";
import { queueQuietly, queueStudioNotice } from "@/lib/email";

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

  const slots = await getSlotsForDate(sql, date);
  if (!slots.includes(slot)) {
    return NextResponse.json({ ok: false, message: "Missing or invalid fields" }, { status: 400 });
  }

  // Public consultations are studio-owned. NULL is the private owner bucket;
  // no public request may choose or reveal a team member.
  const taken = (await sql`
    SELECT id FROM bookings
    WHERE date = ${date} AND slot = ${slot} AND status <> 'canceled'
      AND artist_id IS NULL
    LIMIT 1
  `) as { id: number }[];
  if (taken.length > 0) {
    return NextResponse.json({ ok: false, message: "Slot taken", code: "slot_taken" }, { status: 409 });
  }

  let inserted: { id: number }[];
  try {
    inserted = (await sql`
      INSERT INTO bookings (name, contact, kind, note, date, slot, locale, artist_id)
      VALUES (${name}, ${contact}, 'consult', ${note || null}, ${date}, ${slot}, ${locale}, NULL)
      RETURNING id
    `) as { id: number }[];
  } catch (err) {
    // Unique-index violation = someone grabbed this exact slot first.
    if (err instanceof Error && /bookings_active_slot|duplicate key/i.test(err.message)) {
      return NextResponse.json({ ok: false, message: "Slot taken", code: "slot_taken" }, { status: 409 });
    }
    throw err;
  }

  const bookingId = inserted[0].id;
  const customerEmail = emailAddressFromContact(contact);
  const customerBody =
    `Zdravo ${name},\n\nPrimili smo tvoj zahtev za besplatnu konsultaciju ` +
    `${date} u ${slot}. Javićemo ti se uskoro da potvrdimo detalje.\n\nDropz Tattoo`;
  const studioBody =
    `Novi zahtev za konsultaciju #${bookingId}\n\n` +
    `Ime: ${name}\nKontakt: ${contact}\nDatum: ${date}\nVreme: ${slot}\n` +
    `Napomena: ${note || "—"}`;

  await Promise.all([
    customerEmail
      ? queueQuietly({
          userId: null,
          recipient: customerEmail,
          templateKey: "booking-received",
          subject: "Primili smo tvoj zahtev za konsultaciju",
          body: customerBody,
          replyTo: process.env.EMAIL_REPLY_TO,
        })
      : Promise.resolve({ queued: false, sent: false }),
    queueStudioNotice({
      templateKey: "booking-studio-notice",
      subject: `Nova konsultacija: ${name} — ${date} u ${slot}`,
      body: studioBody,
      replyTo: customerEmail ?? undefined,
    }),
  ]);

  return NextResponse.json({ ok: true, id: bookingId }, { status: 201 });
}
