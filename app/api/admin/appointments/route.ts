import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { DATE_RE } from "@/lib/availability";
import { cleanText } from "@/lib/tattoo";
import { isAppointmentStatus, isValidTime, type Appointment } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth for /api/admin/* is enforced by middleware.ts.

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

// POST — create a calendar entry.
//   { date, start, end, title?, note? }            -> manual entry
//   { date, start, end, requestId, note? }         -> tattoo session (links the
//     quoted request, copies its user, flips request status to 'scheduled')
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const date = typeof body.date === "string" ? body.date : "";
  if (!DATE_RE.test(date)) return badRequest("Neispravan datum.");
  if (!isValidTime(body.start) || !isValidTime(body.end) || body.start >= body.end) {
    return badRequest("Neispravno vreme (početak mora biti pre kraja).");
  }
  const start = body.start as string;
  const end = body.end as string;

  let note: string | null = null;
  if (typeof body.note === "string" && body.note.trim() !== "") {
    note = cleanText(body.note, 500);
    if (!note) return badRequest("Napomena je predugačka.");
  }

  const sql = getSql();

  // Tattoo session path.
  if (body.requestId !== undefined) {
    const requestId = Number(body.requestId);
    if (!Number.isInteger(requestId)) return badRequest("Neispravan zahtev.");
    const reqRows = (await sql`
      SELECT id, user_id, status FROM tattoo_requests WHERE id = ${requestId}
    `) as { id: number; user_id: number; status: string }[];
    if (reqRows.length === 0) return badRequest("Zahtev nije nađen.");
    if (!["quoted", "scheduled"].includes(reqRows[0].status)) {
      return badRequest("Zahtev još nema procenu ili je zatvoren.");
    }

    const rows = (await sql`
      INSERT INTO appointments (kind, request_id, user_id, date, start_time, end_time, note)
      VALUES ('tattoo', ${requestId}, ${reqRows[0].user_id}, ${date}, ${start}, ${end}, ${note})
      RETURNING id, kind, title, request_id, user_id, date::text AS date,
                start_time, end_time, note, status, created_at
    `) as Appointment[];
    await sql`
      UPDATE tattoo_requests SET status = 'scheduled' WHERE id = ${requestId} AND status = 'quoted'
    `;
    return NextResponse.json({ ok: true, appointment: rows[0] }, { status: 201 });
  }

  // Manual entry path.
  let title: string | null = null;
  if (typeof body.title === "string" && body.title.trim() !== "") {
    title = cleanText(body.title, 200);
    if (!title) return badRequest("Naziv je predugačak.");
  }
  if (!title) return badRequest("Naziv je obavezan za ručni unos.");

  const rows = (await sql`
    INSERT INTO appointments (kind, title, date, start_time, end_time, note)
    VALUES ('manual', ${title}, ${date}, ${start}, ${end}, ${note})
    RETURNING id, kind, title, request_id, user_id, date::text AS date,
              start_time, end_time, note, status, created_at
  `) as Appointment[];
  return NextResponse.json({ ok: true, appointment: rows[0] }, { status: 201 });
}

// PATCH { id, date?, start?, end?, title?, note?, status? } — edit an entry.
// Marking a tattoo session 'done' advances the linked request's sessions_done
// (and closes the request when all sessions are finished).
export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) return badRequest("Invalid id");

  const sql = getSql();
  const existing = (await sql`
    SELECT id, kind, title, request_id, user_id, date::text AS date,
           start_time, end_time, note, status, created_at
    FROM appointments WHERE id = ${id}
  `) as Appointment[];
  if (existing.length === 0) {
    return NextResponse.json({ ok: false, message: "Termin nije nađen." }, { status: 404 });
  }
  const current = existing[0];

  const date = body.date === undefined ? current.date : typeof body.date === "string" ? body.date : "";
  if (!DATE_RE.test(date)) return badRequest("Neispravan datum.");
  const start = body.start === undefined ? current.start_time : body.start;
  const end = body.end === undefined ? current.end_time : body.end;
  if (!isValidTime(start) || !isValidTime(end) || start >= end) {
    return badRequest("Neispravno vreme (početak mora biti pre kraja).");
  }

  let title = current.title;
  if (body.title !== undefined) {
    title = typeof body.title === "string" && body.title.trim() !== "" ? cleanText(body.title, 200) : null;
    if (typeof body.title === "string" && body.title.trim() !== "" && !title) {
      return badRequest("Naziv je predugačak.");
    }
  }
  let note = current.note;
  if (body.note !== undefined) {
    note = typeof body.note === "string" && body.note.trim() !== "" ? cleanText(body.note, 500) : null;
    if (typeof body.note === "string" && body.note.trim() !== "" && !note) {
      return badRequest("Napomena je predugačka.");
    }
  }

  let status = current.status;
  if (body.status !== undefined) {
    if (!isAppointmentStatus(body.status)) return badRequest("Invalid status");
    status = body.status;
  }

  await sql`
    UPDATE appointments
    SET date = ${date}, start_time = ${start}, end_time = ${end},
        title = ${title}, note = ${note}, status = ${status}
    WHERE id = ${id}
  `;

  // Tattoo bookkeeping on status transitions.
  if (current.kind === "tattoo" && current.request_id && status !== current.status) {
    if (status === "done") {
      const updated = (await sql`
        UPDATE tattoo_requests
        SET sessions_done = sessions_done + 1
        WHERE id = ${current.request_id}
        RETURNING sessions_done, session_count, user_id
      `) as { sessions_done: number; session_count: number | null; user_id: number }[];
      const req = updated[0];
      if (req && req.session_count !== null && req.sessions_done >= req.session_count) {
        await sql`UPDATE tattoo_requests SET status = 'done' WHERE id = ${current.request_id}`;
      } else if (req) {
        // More sessions to go — nudge the client to book the next one (Faza 4).
        await sql`
          INSERT INTO notifications (user_id, type, title, body, href)
          VALUES (${req.user_id}, 'next-session',
                  'Sesija je završena',
                  ${`Odrađeno ${req.sessions_done}/${req.session_count ?? "?"} sesija. Možeš da zakažeš sledeći termin.`},
                  '/nalog')
        `;
      }
    } else if (current.status === "done") {
      // Un-doing a finished session rolls the counter back.
      await sql`
        UPDATE tattoo_requests
        SET sessions_done = GREATEST(sessions_done - 1, 0),
            status = CASE WHEN status = 'done' THEN 'scheduled' ELSE status END
        WHERE id = ${current.request_id}
      `;
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE { id }
export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const id = Number(body.id);
  if (!Number.isInteger(id)) return badRequest("Invalid id");

  const sql = getSql();
  const rows = (await sql`
    DELETE FROM appointments WHERE id = ${id} RETURNING id
  `) as { id: number }[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: "Termin nije nađen." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
