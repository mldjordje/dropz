import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const sql = getSql();
  const like = `%${q}%`;

  const rows = q
    ? await sql`
        SELECT u.id, u.name, u.email, u.avatar_url, u.admin_note, u.created_at, u.last_login_at,
          (SELECT COUNT(*)::int FROM tattoo_requests tr WHERE tr.user_id = u.id) AS requests_count,
          (SELECT COUNT(*)::int FROM appointments a WHERE a.user_id = u.id AND a.status = 'done') AS sessions_done,
          (SELECT MAX(a.date)::text FROM appointments a WHERE a.user_id = u.id AND a.status = 'done') AS last_visit,
          (SELECT MIN(a.date)::text FROM appointments a WHERE a.user_id = u.id AND a.date >= CURRENT_DATE AND a.status = 'scheduled') AS next_visit
        FROM users u
        WHERE u.name ILIKE ${like} OR u.email ILIKE ${like}
        ORDER BY u.last_login_at DESC
        LIMIT 200
      `
    : await sql`
        SELECT u.id, u.name, u.email, u.avatar_url, u.admin_note, u.created_at, u.last_login_at,
          (SELECT COUNT(*)::int FROM tattoo_requests tr WHERE tr.user_id = u.id) AS requests_count,
          (SELECT COUNT(*)::int FROM appointments a WHERE a.user_id = u.id AND a.status = 'done') AS sessions_done,
          (SELECT MAX(a.date)::text FROM appointments a WHERE a.user_id = u.id AND a.status = 'done') AS last_visit,
          (SELECT MIN(a.date)::text FROM appointments a WHERE a.user_id = u.id AND a.date >= CURRENT_DATE AND a.status = 'scheduled') AS next_visit
        FROM users u
        ORDER BY u.last_login_at DESC
        LIMIT 200
      `;

  return NextResponse.json({ ok: true, clients: rows });
}
