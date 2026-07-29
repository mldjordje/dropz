import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { hasCompleteProfile } from "@/lib/auth/profile";
import { finalizeTattooSlotRequest } from "@/lib/tattoo-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlternativeRow = {
  id: number;
  request_id: number;
  user_id: number;
  proposed_date: string;
  proposed_start: string;
  proposed_end: string;
  assigned_staff_id: number;
};

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
      { ok: false, code: "profile_required", message: "Dopuni profil pre odgovora na termin." },
      { status: 428 },
    );
  }

  const { id } = await params;
  const slotRequestId = Number(id);
  if (!Number.isInteger(slotRequestId)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const sql = getSql();
  if (body.action === "decline") {
    const rows = (await sql`
      UPDATE tattoo_slot_requests sr
      SET status = 'declined', updated_at = now(), decided_at = now()
      FROM tattoo_requests tr
      WHERE sr.id = ${slotRequestId}
        AND sr.request_id = tr.id
        AND tr.user_id = ${user.uid}
        AND sr.status = 'alternative_proposed'
      RETURNING sr.id
    `) as { id: number }[];
    if (rows.length === 0) {
      const existing = (await sql`
        SELECT sr.status
        FROM tattoo_slot_requests sr
        JOIN tattoo_requests tr ON tr.id = sr.request_id
        WHERE sr.id = ${slotRequestId} AND tr.user_id = ${user.uid}
      `) as { status: string }[];
      if (existing[0]?.status === "declined") {
        return NextResponse.json({ ok: true, status: "declined" });
      }
      return NextResponse.json(
        { ok: false, message: "Predlog više nije dostupan." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, status: "declined" });
  }

  if (body.action !== "accept") {
    return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
  }

  const rows = (await sql`
    SELECT sr.id, sr.request_id, tr.user_id,
           sr.proposed_date::text AS proposed_date,
           sr.proposed_start, sr.proposed_end, sr.assigned_staff_id
    FROM tattoo_slot_requests sr
    JOIN tattoo_requests tr ON tr.id = sr.request_id
    WHERE sr.id = ${slotRequestId}
      AND tr.user_id = ${user.uid}
      AND sr.status = 'alternative_proposed'
      AND sr.proposed_date IS NOT NULL
      AND sr.proposed_start IS NOT NULL
      AND sr.proposed_end IS NOT NULL
      AND sr.assigned_staff_id IS NOT NULL
  `) as AlternativeRow[];
  const alternative = rows[0];
  if (!alternative) {
    const existing = (await sql`
      SELECT sr.status
      FROM tattoo_slot_requests sr
      JOIN tattoo_requests tr ON tr.id = sr.request_id
      WHERE sr.id = ${slotRequestId} AND tr.user_id = ${user.uid}
    `) as { status: string }[];
    if (existing[0]?.status === "confirmed") {
      return NextResponse.json({ ok: true, status: "confirmed" });
    }
    return NextResponse.json(
      { ok: false, message: "Predlog više nije dostupan." },
      { status: 409 },
    );
  }

  const appointment = await finalizeTattooSlotRequest(sql, {
    slotRequestId,
    expectedStatus: "alternative_proposed",
    artistId: alternative.assigned_staff_id,
    date: alternative.proposed_date,
    start: alternative.proposed_start,
    end: alternative.proposed_end,
  });
  if (!appointment) {
    return NextResponse.json(
      {
        ok: false,
        code: "slot_taken",
        message: "Termin se u međuvremenu zauzeo. Odbij predlog i izaberi novi slot.",
      },
      { status: 409 },
    );
  }

  await sql`
    INSERT INTO notifications (user_id, type, title, body, href)
    VALUES (
      ${user.uid},
      'appointment-confirmed',
      'Termin je potvrđen',
      ${`Vidimo se ${alternative.proposed_date} u ${alternative.proposed_start}.`},
      '/nalog'
    )
  `;
  return NextResponse.json({ ok: true, status: "confirmed" });
}
