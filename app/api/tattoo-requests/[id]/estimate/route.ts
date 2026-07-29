import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { hasCompleteProfile } from "@/lib/auth/profile";
import { cleanText } from "@/lib/tattoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasCompleteProfile(user.uid))) {
    return NextResponse.json(
      { ok: false, code: "profile_required", message: "Dopuni profil pre odgovora na procenu." },
      { status: 428 },
    );
  }

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const sql = getSql();
  if (body.action === "accept") {
    const rows = (await sql`
      UPDATE tattoo_requests
      SET status = 'accepted', quote_accepted_at = now()
      WHERE id = ${requestId}
        AND user_id = ${user.uid}
        AND status = 'quoted'
        AND session_count IS NOT NULL
        AND session_minutes IS NOT NULL
        AND price IS NOT NULL
      RETURNING id
    `) as { id: number }[];
    if (rows.length === 0) {
      const existing = (await sql`
        SELECT status FROM tattoo_requests
        WHERE id = ${requestId} AND user_id = ${user.uid}
      `) as { status: string }[];
      if (existing[0]?.status === "accepted") {
        return NextResponse.json({ ok: true, status: "accepted" });
      }
      return NextResponse.json(
        { ok: false, message: "Procena više nije dostupna za prihvatanje." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  if (body.action === "request_revision") {
    const message = cleanText(body.message, 500, 5);
    if (!message) {
      return NextResponse.json(
        { ok: false, message: "Napiši kratko šta želiš da promenimo u proceni." },
        { status: 400 },
      );
    }
    const rows = (await sql`
      UPDATE tattoo_requests
      SET status = 'revision_requested',
          quote_revision_note = ${message},
          quote_revision_requested_at = now(),
          quote_accepted_at = NULL
      WHERE id = ${requestId}
        AND user_id = ${user.uid}
        AND status IN ('quoted', 'revision_requested')
      RETURNING id
    `) as { id: number }[];
    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Procena više nije dostupna za izmenu." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, status: "revision_requested" });
  }

  return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
}
