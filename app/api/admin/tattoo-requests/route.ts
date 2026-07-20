import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  MAX_SESSIONS,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  cleanText,
  isTattooStatus,
  type TattooRequest,
} from "@/lib/tattoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth for /api/admin/* is enforced by middleware.ts.

export type AdminTattooRequest = TattooRequest & {
  user_email: string;
  user_name: string | null;
  artist_name: string | null;
};

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");

  const sql = getSql();
  let rows: AdminTattooRequest[];
  if (status && isTattooStatus(status)) {
    rows = (await sql`
      SELECT r.id, r.user_id, r.description, r.size, r.body_part, r.budget, r.image_urls,
             r.status, r.artist_id, s.name AS artist_name,
             r.session_count, r.session_minutes, r.price, r.admin_note,
             r.sessions_done, r.quoted_at, r.created_at,
             u.email AS user_email, u.name AS user_name
      FROM tattoo_requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN staff s ON s.id = r.artist_id
      WHERE r.status = ${status}
      ORDER BY r.created_at DESC LIMIT 300
    `) as AdminTattooRequest[];
  } else {
    rows = (await sql`
      SELECT r.id, r.user_id, r.description, r.size, r.body_part, r.budget, r.image_urls,
             r.status, r.artist_id, s.name AS artist_name,
             r.session_count, r.session_minutes, r.price, r.admin_note,
             r.sessions_done, r.quoted_at, r.created_at,
             u.email AS user_email, u.name AS user_name
      FROM tattoo_requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN staff s ON s.id = r.artist_id
      ORDER BY r.created_at DESC LIMIT 300
    `) as AdminTattooRequest[];
  }

  return NextResponse.json({ ok: true, requests: rows });
}

// PATCH supports two shapes:
//   { id, sessionCount, sessionMinutes, price, adminNote? } — send an estimate
//     (status -> quoted, notifies the client)
//   { id, status } — plain status change (cancel / reopen / done)
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

  // Artist (re)assignment — alone or together with an estimate. null clears
  // the assignment back to "no preference".
  if (body.artistId !== undefined) {
    let artistId: number | null = null;
    if (body.artistId !== null && body.artistId !== "") {
      const requested = Number(body.artistId);
      if (!Number.isInteger(requested)) {
        return NextResponse.json({ ok: false, message: "Neispravan artist." }, { status: 400 });
      }
      const found = (await sql`SELECT id FROM staff WHERE id = ${requested} AND active`) as { id: number }[];
      if (found.length === 0) {
        return NextResponse.json({ ok: false, message: "Neispravan artist." }, { status: 400 });
      }
      artistId = requested;
    }
    const updated = (await sql`
      UPDATE tattoo_requests SET artist_id = ${artistId} WHERE id = ${id} RETURNING id
    `) as { id: number }[];
    if (updated.length === 0) {
      return NextResponse.json({ ok: false, message: "Zahtev nije nađen." }, { status: 404 });
    }
    // Assignment can come alone — done unless an estimate rides along.
    if (body.sessionCount === undefined && body.sessionMinutes === undefined && body.price === undefined && body.status === undefined) {
      return NextResponse.json({ ok: true });
    }
  }

  // Estimate path.
  if (body.sessionCount !== undefined || body.sessionMinutes !== undefined || body.price !== undefined) {
    const sessionCount = Number(body.sessionCount);
    const sessionMinutes = Number(body.sessionMinutes);
    const price = cleanText(body.price, 120);
    if (
      !Number.isInteger(sessionCount) || sessionCount < 1 || sessionCount > MAX_SESSIONS ||
      !Number.isInteger(sessionMinutes) ||
      sessionMinutes < MIN_SESSION_MINUTES || sessionMinutes > MAX_SESSION_MINUTES
    ) {
      return NextResponse.json({ ok: false, message: "Neispravan broj sesija ili trajanje." }, { status: 400 });
    }
    if (!price) {
      return NextResponse.json({ ok: false, message: "Cena je obavezna." }, { status: 400 });
    }
    let adminNote: string | null = null;
    if (typeof body.adminNote === "string" && body.adminNote.trim() !== "") {
      adminNote = cleanText(body.adminNote, 1000);
      if (!adminNote) {
        return NextResponse.json({ ok: false, message: "Napomena je predugačka." }, { status: 400 });
      }
    }

    const rows = (await sql`
      UPDATE tattoo_requests
      SET session_count = ${sessionCount}, session_minutes = ${sessionMinutes},
          price = ${price}, admin_note = ${adminNote},
          status = 'quoted', quoted_at = now()
      WHERE id = ${id} AND status IN ('pending', 'quoted')
      RETURNING id, user_id, session_count
    `) as { id: number; user_id: number; session_count: number }[];
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, message: "Zahtev nije nađen ili nije u obradi." }, { status: 404 });
    }

    await sql`
      INSERT INTO notifications (user_id, type, title, body, href)
      VALUES (
        ${rows[0].user_id},
        'quote',
        'Stigla je procena za tvoju tetovažu',
        ${`Procena: ${sessionCount} ${sessionCount === 1 ? "termin" : "termina"}, cena ${price}. Pogledaj detalje na svom nalogu.`},
        '/nalog'
      )
    `;

    return NextResponse.json({ ok: true });
  }

  // Plain status change.
  if (!isTattooStatus(body.status)) {
    return NextResponse.json({ ok: false, message: "Invalid status" }, { status: 400 });
  }
  const rows = (await sql`
    UPDATE tattoo_requests SET status = ${body.status}
    WHERE id = ${id}
    RETURNING id
  `) as { id: number }[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: "Zahtev nije nađen." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
