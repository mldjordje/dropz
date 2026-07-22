import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/user-session";
import { MONTH_RE } from "@/lib/availability";
import { getBookableRequest } from "@/lib/tattoo";
import { filterStartsByTattooCapacity, freeStartTimes, getTattooBusyMap } from "@/lib/schedule";
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

// GET ?month=YYYY-MM — per-day free start times for the request's next
// session (session_minutes long), inside the assigned artist's working hours
// (weekly schedule + date overrides), avoiding that artist's calendar.
// Requests without an assigned artist fall back to the owner.
export async function GET(
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
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "Invalid month" }, { status: 400 });
  }

  const sql = getSql();
  const bookable = await getBookableRequest(sql, requestId, user.uid);
  if (!bookable) {
    return NextResponse.json(
      { ok: false, message: "Zahtev trenutno nije spreman za zakazivanje." },
      { status: 409 },
    );
  }
  const duration = bookable.session_minutes as number;

  const artist = (bookable.artist_id ? await getStaffById(sql, bookable.artist_id) : null) ?? (await getOwner(sql));
  if (!artist) {
    return NextResponse.json({ ok: false, message: "Artist nije podešen." }, { status: 500 });
  }

  const [year, monthNum] = month.split("-").map(Number);
  const daysTotal = new Date(year, monthNum, 0).getDate();
  const first = `${month}-01`;
  const last = `${month}-${String(daysTotal).padStart(2, "0")}`;
  const today = todayIso();

  const [weekly, overrides, busy, studioBusy] = await Promise.all([
    getStaffWeeklyHours(sql, artist.id),
    getStaffOverrides(sql, artist.id, first, last),
    getArtistBusyMap(sql, artist, first, last),
    getTattooBusyMap(sql, first, last),
  ]);

  const days: Record<string, string[]> = {};
  for (let day = 1; day <= daysTotal; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date <= today) continue;
    const wh = hoursForDate(weekly, overrides, date);
    const artistStarts = freeStartTimes(wh, busy[date] ?? [], duration);
    const starts = filterStartsByTattooCapacity(artistStarts, duration, studioBusy[date] ?? []);
    if (starts.length > 0) days[date] = starts;
  }

  return NextResponse.json({ ok: true, days, duration, artist: { id: artist.id, name: artist.name } });
}
