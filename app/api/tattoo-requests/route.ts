import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { hasCompleteProfile } from "@/lib/auth/profile";
import { cleanImageUrls, cleanText, type TattooRequest } from "@/lib/tattoo";
import { queueQuietly, queueStudioNotice } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OPEN_REQUESTS = 3;

// Client: list own tattoo requests, newest first.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasCompleteProfile(user.uid))) {
    return NextResponse.json(
      { ok: false, code: "profile_required", message: "Dopuni profil pre korišćenja naloga." },
      { status: 428 },
    );
  }

  const sql = getSql();
  const requests = (await sql`
    SELECT r.id, r.user_id, r.description, r.size, r.body_part, r.budget, r.image_urls, r.status,
           r.session_count, r.session_minutes, r.price, r.admin_note, r.sessions_done,
           r.quoted_at, r.quote_revision_note, r.quote_revision_requested_at,
           r.quote_accepted_at, r.created_at,
           (
             SELECT json_build_object('date', a.date::text, 'start', a.start_time, 'end', a.end_time)
             FROM appointments a
             WHERE a.request_id = r.id AND a.status = 'scheduled' AND a.date >= CURRENT_DATE
             ORDER BY a.date, a.start_time
             LIMIT 1
           ) AS next_session,
           (
             SELECT json_build_object(
               'id', sr.id,
               'session_number', sr.session_number,
               'requested_date', sr.requested_date::text,
               'requested_start', sr.requested_start,
               'requested_end', sr.requested_end,
               'proposed_date', sr.proposed_date::text,
               'proposed_start', sr.proposed_start,
               'proposed_end', sr.proposed_end,
               'status', sr.status,
               'owner_note', sr.owner_note,
               'created_at', sr.created_at
             )
             FROM tattoo_slot_requests sr
             WHERE sr.request_id = r.id
             ORDER BY sr.created_at DESC
             LIMIT 1
           ) AS slot_request
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
  const size = cleanText(body.size, 120);
  if (!size) {
    return NextResponse.json(
      { ok: false, message: "Veličina je obavezna (do 120 znakova)." },
      { status: 400 },
    );
  }
  let bodyPart: string | null = null;
  if (typeof body.bodyPart === "string" && body.bodyPart.trim() !== "") {
    bodyPart = cleanText(body.bodyPart, 120);
    if (!bodyPart) {
      return NextResponse.json({ ok: false, message: "Deo tela je predugačak." }, { status: 400 });
    }
  }
  let budget: string | null = null;
  if (typeof body.budget === "string" && body.budget.trim() !== "") {
    budget = cleanText(body.budget, 60);
    if (!budget) {
      return NextResponse.json({ ok: false, message: "Budžet je predugačak." }, { status: 400 });
    }
  }
  const imageUrls = cleanImageUrls(body.imageUrls);
  if (imageUrls === null) {
    return NextResponse.json({ ok: false, message: "Neispravne reference slike." }, { status: 400 });
  }

  if (!(await hasCompleteProfile(user.uid))) {
    return NextResponse.json(
      { ok: false, code: "profile_required", message: "Dopuni profil pre slanja zahteva." },
      { status: 428 },
    );
  }

  const sql = getSql();
  const open = (await sql`
    SELECT count(*)::int AS count FROM tattoo_requests
    WHERE user_id = ${user.uid}
      AND status IN ('pending', 'revision_requested', 'quoted', 'accepted', 'scheduled')
  `) as { count: number }[];
  if (open[0].count >= MAX_OPEN_REQUESTS) {
    return NextResponse.json(
      { ok: false, message: "Već imaš aktivne zahteve u obradi. Sačekaj procenu pre novog zahteva." },
      { status: 409 },
    );
  }

  const rows = (await sql`
    INSERT INTO tattoo_requests (user_id, description, size, body_part, budget, image_urls, artist_id)
    VALUES (${user.uid}, ${description}, ${size}, ${bodyPart}, ${budget}, ${imageUrls}, NULL)
    RETURNING id, user_id, description, size, body_part, budget, image_urls, status,
              session_count, session_minutes, price, admin_note, sessions_done,
              quoted_at, quote_revision_note, quote_revision_requested_at,
              quote_accepted_at, created_at
  `) as TattooRequest[];

  const created = rows[0];
  const greeting = user.name?.trim() ? `Ćao ${user.name.trim()}` : "Zdravo";
  await Promise.all([
    queueQuietly({
      userId: user.uid,
      recipient: user.email,
      templateKey: "tattoo-request-received",
      subject: "Primili smo tvoj tattoo upit",
      body:
        `${greeting},\n\nPrimili smo tvoj tattoo upit #${created.id}. ` +
        "Pregledaćemo detalje i poslati procenu na tvoj nalog.\n\nDropz Tattoo",
      replyTo: process.env.EMAIL_REPLY_TO,
    }),
    queueStudioNotice({
      templateKey: "tattoo-request-studio-notice",
      subject: `Novi tattoo upit #${created.id}`,
      body:
        `Klijent: ${user.name || "—"}\nEmail: ${user.email}\n` +
        `Veličina: ${size}\nDeo tela: ${bodyPart || "—"}\nBudžet: ${budget || "—"}\n\n${description}`,
      replyTo: user.email,
    }),
  ]);

  return NextResponse.json({ ok: true, request: created }, { status: 201 });
}
