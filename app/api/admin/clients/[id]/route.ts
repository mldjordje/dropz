import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const sql = getSql();
  const users = (await sql`
    SELECT id, name, email, avatar_url, admin_note, created_at, last_login_at
    FROM users WHERE id = ${id}
  `) as Record<string, unknown>[];
  if (users.length === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const requests = await sql`
    SELECT id, description, size, body_part, image_urls, status, session_count, session_minutes,
           price, admin_note, sessions_done, created_at
    FROM tattoo_requests WHERE user_id = ${id} ORDER BY created_at DESC
  `;

  const appointments = await sql`
    SELECT id, kind, title, request_id, date::text AS date, start_time, end_time, note, status, created_at
    FROM appointments WHERE user_id = ${id} ORDER BY date DESC, start_time DESC
  `;

  return NextResponse.json({ ok: true, client: users[0], requests, appointments });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.admin_note !== "string") {
    return NextResponse.json({ ok: false, message: "admin_note required" }, { status: 400 });
  }

  const sql = getSql();
  const updated = (await sql`
    UPDATE users SET admin_note = ${body.admin_note.trim() || null} WHERE id = ${id} RETURNING id
  `) as { id: number }[];
  if (updated.length === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
