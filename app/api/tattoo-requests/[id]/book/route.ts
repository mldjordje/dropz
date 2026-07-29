import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { hasCompleteProfile } from "@/lib/auth/profile";
import { DATE_RE } from "@/lib/availability";
import { getBookableRequest, type TattooSlotRequest } from "@/lib/tattoo";
import { getAnonymousTattooMonth } from "@/lib/tattoo-booking";
import { isValidTime, minutesToTime, timeToMinutes } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// POST { date, start } — sends a preferred slot to the owner. It deliberately
// does not create an appointment or reserve studio capacity.
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
      { ok: false, code: "profile_required", message: "Dopuni profil pre slanja termina." },
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
  const date = typeof body.date === "string" ? body.date : "";
  if (!DATE_RE.test(date) || date <= todayIso()) {
    return NextResponse.json({ ok: false, message: "Neispravan datum." }, { status: 400 });
  }
  if (!isValidTime(body.start)) {
    return NextResponse.json({ ok: false, message: "Neispravno vreme." }, { status: 400 });
  }
  const start = body.start as string;

  const sql = getSql();
  const bookable = await getBookableRequest(sql, requestId, user.uid);
  if (!bookable) {
    const existing = (await sql`
      SELECT sr.id, sr.request_id, sr.session_number,
             sr.requested_date::text AS requested_date,
             sr.requested_start, sr.requested_end,
             sr.proposed_date::text AS proposed_date,
             sr.proposed_start, sr.proposed_end, sr.status, sr.owner_note,
             sr.appointment_id, sr.created_at, sr.updated_at, sr.decided_at
      FROM tattoo_slot_requests sr
      JOIN tattoo_requests tr ON tr.id = sr.request_id
      WHERE sr.request_id = ${requestId}
        AND tr.user_id = ${user.uid}
        AND sr.status IN ('pending_owner', 'alternative_proposed')
        AND sr.requested_date = ${date}
        AND sr.requested_start = ${start}
      LIMIT 1
    `) as TattooSlotRequest[];
    if (existing[0]) {
      return NextResponse.json({ ok: true, slotRequest: existing[0] });
    }
    return NextResponse.json(
      { ok: false, message: "Već postoji zahtev termina ili upit nije spreman." },
      { status: 409 },
    );
  }

  const duration = bookable.session_minutes as number;
  const month = date.slice(0, 7);
  const days = await getAnonymousTattooMonth(sql, month, duration);
  if (!(days[date] ?? []).includes(start)) {
    return NextResponse.json(
      { ok: false, code: "slot_taken", message: "Taj termin više nije dostupan. Izaberi drugi." },
      { status: 409 },
    );
  }

  const end = minutesToTime(timeToMinutes(start) + duration);
  const rows = (await sql`
    INSERT INTO tattoo_slot_requests (
      request_id, session_number, requested_date, requested_start, requested_end
    )
    SELECT id, sessions_done + 1, ${date}, ${start}, ${end}
    FROM tattoo_requests
    WHERE id = ${requestId}
      AND user_id = ${user.uid}
      AND status IN ('accepted', 'scheduled')
      AND sessions_done < session_count
      AND NOT EXISTS (
        SELECT 1 FROM tattoo_slot_requests open_request
        WHERE open_request.request_id = tattoo_requests.id
          AND open_request.status IN ('pending_owner', 'alternative_proposed')
      )
    ON CONFLICT DO NOTHING
    RETURNING id, request_id, session_number, requested_date::text AS requested_date,
              requested_start, requested_end, proposed_date::text AS proposed_date,
              proposed_start, proposed_end, status, owner_note, appointment_id,
              created_at, updated_at, decided_at
  `) as TattooSlotRequest[];
  if (rows.length === 0) {
    const existing = (await sql`
      SELECT id, request_id, session_number,
             requested_date::text AS requested_date,
             requested_start, requested_end,
             proposed_date::text AS proposed_date,
             proposed_start, proposed_end, status, owner_note,
             appointment_id, created_at, updated_at, decided_at
      FROM tattoo_slot_requests
      WHERE request_id = ${requestId}
        AND status IN ('pending_owner', 'alternative_proposed')
        AND requested_date = ${date}
        AND requested_start = ${start}
      LIMIT 1
    `) as TattooSlotRequest[];
    if (existing[0]) {
      return NextResponse.json({ ok: true, slotRequest: existing[0] });
    }
    return NextResponse.json(
      { ok: false, message: "Zahtev termina je već poslat." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, slotRequest: rows[0] }, { status: 201 });
}
