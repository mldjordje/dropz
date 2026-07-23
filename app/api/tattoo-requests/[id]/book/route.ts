import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { DATE_RE } from "@/lib/availability";
import { getBookableRequest } from "@/lib/tattoo";
import {
  createTattooAppointmentWithinCapacity,
  filterStartsByTattooCapacity,
  freeStartTimes,
  getTattooBusyMap,
  isValidTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/schedule";
import {
  getArtistBusyMap,
  getOwner,
  getStaffById,
  getStaffOverrides,
  getStaffWeeklyHours,
  hoursForDate,
} from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// POST { date, start } — books the request's next session. The start must be
// one of the offered free starts (re-validated here against current state).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { ok: false, message: "Zahtev trenutno nije spreman za zakazivanje." },
      { status: 409 },
    );
  }
  const duration = bookable.session_minutes as number;

  // The session goes on the assigned artist's calendar (owner when the client
  // had no preference), validated against that artist's schedule.
  const artist = (bookable.artist_id ? await getStaffById(sql, bookable.artist_id) : null) ?? (await getOwner(sql));
  if (!artist) {
    return NextResponse.json({ ok: false, message: "Artist nije podešen." }, { status: 500 });
  }

  const [weekly, overrides, busyMap, studioBusyMap] = await Promise.all([
    getStaffWeeklyHours(sql, artist.id),
    getStaffOverrides(sql, artist.id, date, date),
    getArtistBusyMap(sql, artist, date, date),
    getTattooBusyMap(sql, date, date),
  ]);
  const wh = hoursForDate(weekly, overrides, date);
  const artistFree = freeStartTimes(wh, busyMap[date] ?? [], duration);
  const free = filterStartsByTattooCapacity(artistFree, duration, studioBusyMap[date] ?? []);
  if (!free.includes(start)) {
    return NextResponse.json(
      { ok: false, code: "slot_taken", message: "Taj termin više nije slobodan. Izaberi drugi." },
      { status: 409 },
    );
  }

  const end = minutesToTime(timeToMinutes(start) + duration);
  const session = await createTattooAppointmentWithinCapacity(sql, {
    requestId,
    userId: user.uid,
    artistId: artist.id,
    date,
    start,
    end,
  });
  if (!session) {
    return NextResponse.json(
      { ok: false, code: "studio_full", message: "Sva tri tattoo mesta su zauzeta. Izaberi drugi termin." },
      { status: 409 },
    );
  }
  await sql`
    UPDATE tattoo_requests SET status = 'scheduled' WHERE id = ${requestId} AND status = 'quoted'
  `;

  return NextResponse.json({ ok: true, session }, { status: 201 });
}
