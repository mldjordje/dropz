import "server-only";
import type { getSql } from "@/lib/db";
import type { WorkingHours } from "@/lib/schedule";
import { minutesToTime, timeToMinutes, weekdayIndex } from "@/lib/schedule";

type Sql = ReturnType<typeof getSql>;

// Staff = everyone who works in the studio: the owner (Dragan) plus artists
// added by him. Customers pick an artist on their tattoo request; each
// appointment belongs to exactly one artist.

export const STAFF_ROLES = ["owner", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffMember = {
  id: number;
  email: string;
  name: string;
  role: StaffRole;
  active: boolean;
  avatar_url: string | null;
  created_at: string;
};

export type DayOverride = {
  date: string; // YYYY-MM-DD
  open_time: string | null; // both null = closed that day
  close_time: string | null;
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

// Owner first (he's the headliner), then artists alphabetically.
export async function getActiveArtists(sql: Sql): Promise<StaffMember[]> {
  return (await sql`
    SELECT id, email, name, role, active, avatar_url, created_at
    FROM staff WHERE active
    ORDER BY (role = 'owner') DESC, name
  `) as StaffMember[];
}

export async function getOwner(sql: Sql): Promise<StaffMember | null> {
  const rows = (await sql`
    SELECT id, email, name, role, active, avatar_url, created_at
    FROM staff WHERE role = 'owner' LIMIT 1
  `) as StaffMember[];
  return rows[0] ?? null;
}

export async function getStaffByEmail(sql: Sql, email: string): Promise<StaffMember | null> {
  const rows = (await sql`
    SELECT id, email, name, role, active, avatar_url, created_at
    FROM staff WHERE lower(email) = ${email.toLowerCase()} AND active
    LIMIT 1
  `) as StaffMember[];
  return rows[0] ?? null;
}

export async function getStaffById(sql: Sql, id: number): Promise<StaffMember | null> {
  const rows = (await sql`
    SELECT id, email, name, role, active, avatar_url, created_at
    FROM staff WHERE id = ${id} LIMIT 1
  `) as StaffMember[];
  return rows[0] ?? null;
}

export async function getStaffWeeklyHours(sql: Sql, staffId: number): Promise<WorkingHours[]> {
  return (await sql`
    SELECT weekday, open_time, close_time FROM staff_working_hours
    WHERE staff_id = ${staffId} ORDER BY weekday
  `) as WorkingHours[];
}

export async function getStaffOverrides(
  sql: Sql,
  staffId: number,
  from: string,
  to: string,
): Promise<DayOverride[]> {
  return (await sql`
    SELECT date::text AS date, open_time, close_time FROM staff_day_overrides
    WHERE staff_id = ${staffId} AND date >= ${from} AND date <= ${to}
    ORDER BY date
  `) as DayOverride[];
}

// Effective open window for one artist on one date: a date override wins
// outright (including "closed"), otherwise the weekly row for that weekday.
export function hoursForDate(
  weekly: WorkingHours[],
  overrides: DayOverride[],
  date: string,
): { open_time: string | null; close_time: string | null } {
  const override = overrides.find((o) => o.date === date);
  if (override) return { open_time: override.open_time, close_time: override.close_time };
  const wh = weekly.find((h) => h.weekday === weekdayIndex(date));
  return wh ?? { open_time: null, close_time: null };
}

// Busy [start, end) intervals per date for ONE artist: their appointments,
// plus consult bookings when the artist is the owner (consults are his).
export async function getArtistBusyMap(
  sql: Sql,
  artist: Pick<StaffMember, "id" | "role">,
  from: string,
  to: string,
): Promise<Record<string, { start_time: string; end_time: string }[]>> {
  const appointments = (await sql`
    SELECT date::text AS date, start_time, end_time FROM appointments
    WHERE artist_id = ${artist.id} AND date >= ${from} AND date <= ${to} AND status <> 'canceled'
  `) as { date: string; start_time: string; end_time: string }[];

  const map: Record<string, { start_time: string; end_time: string }[]> = {};
  for (const row of appointments) {
    (map[row.date] ??= []).push({ start_time: row.start_time, end_time: row.end_time });
  }

  if (artist.role === "owner") {
    const consults = (await sql`
      SELECT date::text AS date, slot FROM bookings
      WHERE date >= ${from} AND date <= ${to} AND status <> 'canceled'
    `) as { date: string; slot: string }[];
    for (const row of consults) {
      const end = minutesToTime(Math.min(timeToMinutes(row.slot) + 60, 24 * 60 - 1));
      (map[row.date] ??= []).push({ start_time: row.slot, end_time: end });
    }
  }
  return map;
}

// Resolves which artist an admin request targets: staff are always pinned to
// themselves; the owner may pass an explicit id, defaulting to his own row
// (looked up when the session predates roles and carries no staffId).
export async function resolveArtistId(
  sql: Sql,
  session: { role: "owner" | "staff"; staffId: number | null },
  requested?: unknown,
): Promise<number | null> {
  if (session.role === "staff") return session.staffId;
  if (requested !== undefined && requested !== null && requested !== "") {
    const id = Number(requested);
    return Number.isInteger(id) ? id : null;
  }
  if (session.staffId) return session.staffId;
  return (await getOwner(sql))?.id ?? null;
}

// Default schedule for a newly added artist: Mon–Sat 10–20, Sunday closed.
export async function seedDefaultHours(sql: Sql, staffId: number) {
  await sql`
    INSERT INTO staff_working_hours (staff_id, weekday, open_time, close_time)
    SELECT ${staffId}, d,
           CASE WHEN d = 6 THEN NULL ELSE '10:00' END,
           CASE WHEN d = 6 THEN NULL ELSE '20:00' END
    FROM generate_series(0, 6) AS d
    ON CONFLICT (staff_id, weekday) DO NOTHING
  `;
}
