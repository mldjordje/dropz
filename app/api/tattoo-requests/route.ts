import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { cleanImageUrls, cleanText, type TattooRequest } from "@/lib/tattoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OPEN_REQUESTS = 3;

// Client: list own tattoo requests, newest first.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const sql = getSql();
  const requests = (await sql`
    SELECT r.id, r.user_id, r.description, r.size, r.body_part, r.image_urls, r.status,
           r.session_count, r.session_minutes, r.price, r.admin_note, r.sessions_done,
           r.quoted_at, r.created_at,
           (
             SELECT json_build_object('date', a.date::text, 'start', a.start_time, 'end', a.end_time)
             FROM appointments a
             WHERE a.request_id = r.id AND a.status = 'scheduled' AND a.date >= CURRENT_DATE
             ORDER BY a.date, a.start_time
             LIMIT 1
           ) AS next_session
    FROM tattoo_requests r
    WHERE r.user_id = ${user.uid}
    ORDER BY r.created_at DESC
    LIMIT 50
  `) as TattooRequest[];

  return NextResponse.json({ ok: true, requests });
}

// Client: submit a new tattoo request.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const description = cleanText(body.description, 2000, 5);
  if (!description) {
    return NextResponse.json(
      { ok: false, message: "Opis tetovaže je obavezan (5–2000 znakova)." },
      { status: 400 },
    );
  }
  let size: string | null = null;
  if (typeof body.size === "string" && body.size.trim() !== "") {
    size = cleanText(body.size, 120);
    if (!size) {
      return NextResponse.json({ ok: false, message: "Veličina je predugačka." }, { status: 400 });
    }
  }
  let bodyPart: string | null = null;
  if (typeof body.bodyPart === "string" && body.bodyPart.trim() !== "") {
    bodyPart = cleanText(body.bodyPart, 120);
    if (!bodyPart) {
      return NextResponse.json({ ok: false, message: "Deo tela je predugačak." }, { status: 400 });
    }
  }
  const imageUrls = cleanImageUrls(body.imageUrls);
  if (imageUrls === null) {
    return NextResponse.json({ ok: false, message: "Neispravne reference slike." }, { status: 400 });
  }

  const sql = getSql();
  const open = (await sql`
    SELECT count(*)::int AS count FROM tattoo_requests
    WHERE user_id = ${user.uid} AND status IN ('pending', 'quoted')
  `) as { count: number }[];
  if (open[0].count >= MAX_OPEN_REQUESTS) {
    return NextResponse.json(
      { ok: false, message: "Već imaš aktivne zahteve u obradi. Sačekaj procenu pre novog zahteva." },
      { status: 409 },
    );
  }

  const rows = (await sql`
    INSERT INTO tattoo_requests (user_id, description, size, body_part, image_urls)
    VALUES (${user.uid}, ${description}, ${size}, ${bodyPart}, ${imageUrls})
    RETURNING id, user_id, description, size, body_part, image_urls, status,
              session_count, session_minutes, price, admin_note, sessions_done,
              quoted_at, created_at
  `) as TattooRequest[];

  return NextResponse.json({ ok: true, request: rows[0] }, { status: 201 });
}
