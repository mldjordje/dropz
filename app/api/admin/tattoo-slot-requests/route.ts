import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { DATE_RE } from "@/lib/availability";
import { cleanText } from "@/lib/tattoo";
import {
  finalizeTattooSlotRequest,
  isArtistAvailableForTattoo,
} from "@/lib/tattoo-booking";
import { isValidTime, minutesToTime, timeToMinutes } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function forbidden() {
  return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = await getAdminSession();
  if (session?.role !== "owner") return forbidden();
  const rows = await getSql()`
    SELECT sr.id, sr.request_id, sr.session_number,
           sr.requested_date::text AS requested_date,
           sr.requested_start, sr.requested_end,
           sr.proposed_date::text AS proposed_date,
           sr.proposed_start, sr.proposed_end,
           sr.assigned_staff_id, assigned.name AS assigned_staff_name,
           sr.appointment_id, sr.status, sr.owner_note,
           sr.created_at, sr.updated_at, sr.decided_at,
           tr.description, tr.session_minutes, tr.sessions_done,
           tr.status AS request_status,
           u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM tattoo_slot_requests sr
    JOIN tattoo_requests tr ON tr.id = sr.request_id
    JOIN users u ON u.id = tr.user_id
    LEFT JOIN staff assigned ON assigned.id = sr.assigned_staff_id
    ORDER BY
      CASE sr.status
        WHEN 'pending_owner' THEN 0
        WHEN 'alternative_proposed' THEN 1
        ELSE 2
      END,
      sr.created_at DESC
    LIMIT 300
  `;
  return NextResponse.json({ ok: true, slotRequests: rows });
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "owner") return forbidden();

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
  const rows = (await sql`
    SELECT sr.id, sr.request_id, sr.status, sr.appointment_id, sr.assigned_staff_id,
           sr.requested_date::text AS requested_date,
           sr.requested_start, sr.requested_end,
           tr.user_id, tr.session_minutes
    FROM tattoo_slot_requests sr
    JOIN tattoo_requests tr ON tr.id = sr.request_id
    WHERE sr.id = ${id}
  `) as {
    id: number;
    request_id: number;
    status: string;
    appointment_id: number | null;
    assigned_staff_id: number | null;
    requested_date: string;
    requested_start: string;
    requested_end: string;
    user_id: number;
    session_minutes: number;
  }[];
  const slotRequest = rows[0];
  if (!slotRequest) {
    return NextResponse.json({ ok: false, message: "Zahtev termina nije nađen." }, { status: 404 });
  }

  if (body.action === "reject") {
    if (slotRequest.status === "rejected") {
      return NextResponse.json({ ok: true, status: "rejected" });
    }
    const note = body.note === undefined || body.note === ""
      ? null
      : cleanText(body.note, 500);
    if (body.note && !note) {
      return NextResponse.json({ ok: false, message: "Napomena je predugačka." }, { status: 400 });
    }
    const updated = (await sql`
      UPDATE tattoo_slot_requests
      SET status = 'rejected', owner_note = ${note},
          updated_at = now(), decided_at = now()
      WHERE id = ${id}
        AND status IN ('pending_owner', 'alternative_proposed')
      RETURNING id
    `) as { id: number }[];
    if (updated.length === 0) {
      return NextResponse.json({ ok: false, message: "Zahtev je već obrađen." }, { status: 409 });
    }
    await sql`
      INSERT INTO notifications (user_id, type, title, body, href)
      VALUES (
        ${slotRequest.user_id},
        'slot-rejected',
        'Izaberi drugi termin',
        ${note ?? "Traženi termin nije dostupan. Izaberi drugi datum ili vreme."},
        '/nalog'
      )
    `;
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const artistId = Number(body.artistId);
  if (!Number.isInteger(artistId)) {
    return NextResponse.json({ ok: false, message: "Izaberi radnika." }, { status: 400 });
  }

  if (body.action === "confirm") {
    if (
      slotRequest.status === "confirmed" &&
      slotRequest.appointment_id &&
      slotRequest.assigned_staff_id === artistId
    ) {
      return NextResponse.json({
        ok: true,
        status: "confirmed",
        appointment: { id: slotRequest.appointment_id },
      });
    }
    if (slotRequest.status !== "pending_owner") {
      return NextResponse.json({ ok: false, message: "Zahtev nije spreman za potvrdu." }, { status: 409 });
    }
    const appointment = await finalizeTattooSlotRequest(sql, {
      slotRequestId: id,
      expectedStatus: "pending_owner",
      artistId,
      date: slotRequest.requested_date,
      start: slotRequest.requested_start,
      end: slotRequest.requested_end,
    });
    if (!appointment) {
      return NextResponse.json(
        {
          ok: false,
          code: "slot_taken",
          message: "Radnik ili studio više nisu slobodni u tom periodu.",
        },
        { status: 409 },
      );
    }
    await sql`
      INSERT INTO notifications (user_id, type, title, body, href)
      VALUES (
        ${slotRequest.user_id},
        'appointment-confirmed',
        'Termin je potvrđen',
        ${`Vidimo se ${slotRequest.requested_date} u ${slotRequest.requested_start}.`},
        '/nalog'
      )
    `;
    return NextResponse.json({ ok: true, status: "confirmed", appointment });
  }

  if (body.action !== "propose_alternative") {
    return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
  }
  const date = typeof body.date === "string" ? body.date : "";
  const start = body.start;
  if (!DATE_RE.test(date) || date <= todayIso() || !isValidTime(start)) {
    return NextResponse.json({ ok: false, message: "Neispravan datum ili vreme." }, { status: 400 });
  }
  const endMinutes = timeToMinutes(start) + slotRequest.session_minutes;
  if (endMinutes >= 24 * 60) {
    return NextResponse.json({ ok: false, message: "Termin prelazi kraj dana." }, { status: 400 });
  }
  const available = await isArtistAvailableForTattoo(sql, {
    artistId,
    date,
    start,
    durationMinutes: slotRequest.session_minutes,
  });
  if (!available) {
    return NextResponse.json(
      { ok: false, code: "slot_taken", message: "Izabrani radnik nije slobodan u tom periodu." },
      { status: 409 },
    );
  }
  const end = minutesToTime(endMinutes);
  const note = body.note === undefined || body.note === ""
    ? null
    : cleanText(body.note, 500);
  if (body.note && !note) {
    return NextResponse.json({ ok: false, message: "Napomena je predugačka." }, { status: 400 });
  }
  const updated = (await sql`
    UPDATE tattoo_slot_requests
    SET status = 'alternative_proposed',
        proposed_date = ${date},
        proposed_start = ${start},
        proposed_end = ${end},
        assigned_staff_id = ${artistId},
        owner_note = ${note},
        updated_at = now(),
        decided_at = NULL
    WHERE id = ${id}
      AND status IN ('pending_owner', 'alternative_proposed')
    RETURNING id
  `) as { id: number }[];
  if (updated.length === 0) {
    return NextResponse.json({ ok: false, message: "Zahtev je već obrađen." }, { status: 409 });
  }
  await sql`
    INSERT INTO notifications (user_id, type, title, body, href)
    VALUES (
      ${slotRequest.user_id},
      'slot-alternative',
      'Studio predlaže drugo vreme',
      ${`Predlog: ${date} u ${start}. Potvrdi ili odbij na svom nalogu.`},
      '/nalog'
    )
  `;
  return NextResponse.json({ ok: true, status: "alternative_proposed" });
}
