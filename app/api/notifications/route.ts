import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

// Client: latest notifications + unread count. 401 when not logged in, so the
// nav badge can treat that as "logged out".
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const sql = getSql();
  const notifications = (await sql`
    SELECT id, type, title, body, href, read_at, created_at
    FROM notifications
    WHERE user_id = ${user.uid}
    ORDER BY created_at DESC
    LIMIT 20
  `) as Notification[];
  const unread = (await sql`
    SELECT count(*)::int AS count FROM notifications
    WHERE user_id = ${user.uid} AND read_at IS NULL
  `) as { count: number }[];

  return NextResponse.json(
    { ok: true, notifications, unread: unread[0].count },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Client: mark all own notifications as read.
export async function PATCH() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const sql = getSql();
  await sql`
    UPDATE notifications SET read_at = now()
    WHERE user_id = ${user.uid} AND read_at IS NULL
  `;
  return NextResponse.json({ ok: true });
}
