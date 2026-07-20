import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { DATE_RE } from "@/lib/availability";
import type { Appointment, WorkingHours } from "@/lib/schedule";
import { getActiveArtists, getStaffWeeklyHours, resolveArtistId } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth for /api/admin/* is enforced by middleware.ts; per-role data scoping
// happens here: staff see only their own appointments, never consult bookings
// (those are the owner's) and never finance fields.

type ConsultRow = {
  id: number;
  name: string;
  contact: string;
  note: string | null;
  date: string;
  slot: string;
  status: string;
};

type AppointmentRow = Appointment & {
  artist_id: number | null;
  artist_name: string | null;
  price?: number | null;
  deposit?: number | null;
  deposit_paid?: boolean;
  paid?: boolean;
  payment_method?: string | null;
  user_name: string | null;
  user_email: string | null;
  request_description: string | null;
};

// GET ?from&to[&artistId] — everything the calendar shows in one call.
// Owner: artistId empty/0 = all artists; otherwise that artist only.
// Staff: always pinned to themselves.
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ ok: false, message: "Invalid range" }, { status: 400 });
  }

  const sql = getSql();

  const artistParam = params.get("artistId");
  const allArtists = session.role === "owner" && (!artistParam || artistParam === "0");
  const artistId = allArtists ? null : await resolveArtistId(sql, session, artistParam ?? undefined);
  if (!allArtists && !artistId) {
    return NextResponse.json({ ok: false, message: "Nedostaje artist." }, { status: 400 });
  }

  const appointmentsRaw = session.role === "owner"
    ? await sql`
        SELECT a.id, a.kind, a.title, a.request_id, a.user_id, a.artist_id, a.date::text AS date,
               a.start_time, a.end_time, a.note, a.status, a.created_at,
               a.price::float8 AS price, a.deposit::float8 AS deposit,
               a.deposit_paid, a.paid, a.payment_method,
               u.name AS user_name, u.email AS user_email,
               s.name AS artist_name,
               r.description AS request_description
        FROM appointments a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN staff s ON s.id = a.artist_id
        LEFT JOIN tattoo_requests r ON r.id = a.request_id
        WHERE a.date >= ${from} AND a.date < ${to}
          AND (${allArtists} OR a.artist_id = ${artistId})
        ORDER BY a.date, a.start_time
      `
    : await sql`
        SELECT a.id, a.kind, a.title, a.request_id, a.user_id, a.artist_id, a.date::text AS date,
               a.start_time, a.end_time, a.note, a.status, a.created_at,
               u.name AS user_name, u.email AS user_email,
               s.name AS artist_name,
               r.description AS request_description
        FROM appointments a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN staff s ON s.id = a.artist_id
        LEFT JOIN tattoo_requests r ON r.id = a.request_id
        WHERE a.date >= ${from} AND a.date < ${to} AND a.artist_id = ${artistId}
        ORDER BY a.date, a.start_time
      `;
  const appointments = appointmentsRaw as AppointmentRow[];

  // Consult bookings are the owner's time — staff calendars skip them.
  const consults = session.role === "owner"
    ? ((await sql`
        SELECT id, name, contact, note, date::text AS date, slot, status
        FROM bookings
        WHERE date >= ${from} AND date < ${to} AND status <> 'canceled'
        ORDER BY date, slot
      `) as ConsultRow[])
    : [];

  // Weekly hours for the calendar's business-hours shading: the selected
  // artist's schedule; in "all" view the owner's own.
  const hoursArtist = artistId ?? (await resolveArtistId(sql, session, undefined));
  const hours: WorkingHours[] = hoursArtist ? await getStaffWeeklyHours(sql, hoursArtist) : [];

  // Owner also gets the team roster for the calendar switcher.
  const artists = session.role === "owner" ? await getActiveArtists(sql) : [];

  return NextResponse.json({
    ok: true,
    role: session.role,
    staffId: session.staffId,
    artistId: artistId ?? 0,
    appointments,
    consults,
    hours,
    artists: artists.map((a) => ({ id: a.id, name: a.name, role: a.role, avatar_url: a.avatar_url })),
  });
}
