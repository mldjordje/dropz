import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isValidImageUrl } from "@/lib/portfolio";
import { DATE_RE } from "@/lib/availability";

export type EventRow = {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  event_date: string;
  location: string | null;
  sort: number;
  created_at: string;
};

// Admin: list all events, newest event_date first.
export async function GET() {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, body, image_url, event_date::text AS event_date, location, sort, created_at
    FROM events ORDER BY event_date DESC, sort ASC
  `) as EventRow[];
  return NextResponse.json({ ok: true, events: rows });
}

// Admin: create an event. { title, event_date, body?, image_url?, location? }
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) {
    return NextResponse.json({ ok: false, message: "Naslov je obavezan." }, { status: 400 });
  }

  const eventDate = typeof body.event_date === "string" ? body.event_date : "";
  if (!DATE_RE.test(eventDate)) {
    return NextResponse.json({ ok: false, message: "Neispravan datum." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) || null : null;
  const location = typeof body.location === "string" ? body.location.trim().slice(0, 200) || null : null;

  let imageUrl: string | null = null;
  if (body.image_url !== undefined && body.image_url !== null && body.image_url !== "") {
    if (!isValidImageUrl(body.image_url)) {
      return NextResponse.json({ ok: false, message: "Neispravan URL slike." }, { status: 400 });
    }
    imageUrl = body.image_url as string;
  }

  const sql = getSql();
  const inserted = (await sql`
    INSERT INTO events (title, body, image_url, event_date, location)
    VALUES (${title}, ${text}, ${imageUrl}, ${eventDate}, ${location})
    RETURNING id, title, body, image_url, event_date::text AS event_date, location, sort, created_at
  `) as EventRow[];

  return NextResponse.json({ ok: true, event: inserted[0] }, { status: 201 });
}

// Admin: edit an event. Any subset of { id, title?, event_date?, body?, image_url?, location? }
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

  const sql = getSql();
  const existing = (await sql`
    SELECT id, title, body, image_url, event_date::text AS event_date, location
    FROM events WHERE id = ${id}
  `) as EventRow[];
  if (existing.length === 0) {
    return NextResponse.json({ ok: false, message: "Događaj nije nađen." }, { status: 404 });
  }
  const cur = existing[0];

  let title = cur.title;
  if (body.title !== undefined) {
    title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    if (!title) return NextResponse.json({ ok: false, message: "Naslov je obavezan." }, { status: 400 });
  }

  let eventDate = cur.event_date;
  if (body.event_date !== undefined) {
    eventDate = typeof body.event_date === "string" ? body.event_date : "";
    if (!DATE_RE.test(eventDate)) {
      return NextResponse.json({ ok: false, message: "Neispravan datum." }, { status: 400 });
    }
  }

  const text = body.body !== undefined
    ? (typeof body.body === "string" ? body.body.trim().slice(0, 4000) || null : null)
    : cur.body;
  const location = body.location !== undefined
    ? (typeof body.location === "string" ? body.location.trim().slice(0, 200) || null : null)
    : cur.location;

  let imageUrl = cur.image_url;
  if (body.image_url !== undefined) {
    if (body.image_url === null || body.image_url === "") {
      imageUrl = null;
    } else if (isValidImageUrl(body.image_url)) {
      imageUrl = body.image_url as string;
    } else {
      return NextResponse.json({ ok: false, message: "Neispravan URL slike." }, { status: 400 });
    }
  }

  await sql`
    UPDATE events
    SET title = ${title}, body = ${text}, image_url = ${imageUrl},
        event_date = ${eventDate}, location = ${location}
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}

// Admin: delete an event.
export async function DELETE(request: Request) {
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

  const sql = getSql();
  await sql`DELETE FROM events WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
