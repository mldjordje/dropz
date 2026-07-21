import "server-only";
import type { getSql } from "@/lib/db";
import { freeStartTimes } from "@/lib/schedule";
import {
  getArtistBusyMap,
  getStaffById,
  getStaffOverrides,
  getStaffWeeklyHours,
  hoursForDate,
  type StaffMember,
} from "@/lib/staff";

type Sql = ReturnType<typeof getSql>;

// A consultation blocks a fixed 60-minute window on the chosen artist's
// calendar — the same duration getArtistBusyMap assumes for consult bookings.
// Stepping by 60 keeps starts on the hour, matching the studio's consult feel.
export const CONSULT_MINUTES = 60;
const CONSULT_STEP = 60;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthBounds(month: string): { first: string; last: string; daysTotal: number } {
  const [year, monthNum] = month.split("-").map(Number);
  const daysTotal = new Date(year, monthNum, 0).getDate();
  return { first: `${month}-01`, last: `${month}-${String(daysTotal).padStart(2, "0")}`, daysTotal };
}

// Free consult start times for one artist across a month (YYYY-MM), inside the
// artist's working hours (weekly template + date overrides) and avoiding their
// calendar. Only future dates with at least one open window are returned.
export async function getArtistConsultMonth(
  sql: Sql,
  artist: Pick<StaffMember, "id" | "role">,
  month: string,
): Promise<Record<string, string[]>> {
  const { first, last, daysTotal } = monthBounds(month);
  const today = todayIso();

  const [weekly, overrides, busy] = await Promise.all([
    getStaffWeeklyHours(sql, artist.id),
    getStaffOverrides(sql, artist.id, first, last),
    getArtistBusyMap(sql, artist, first, last),
  ]);

  const [year, monthNum] = month.split("-");
  const days: Record<string, string[]> = {};
  for (let day = 1; day <= daysTotal; day++) {
    const date = `${year}-${monthNum}-${String(day).padStart(2, "0")}`;
    if (date <= today) continue;
    const wh = hoursForDate(weekly, overrides, date);
    const starts = freeStartTimes(wh, busy[date] ?? [], CONSULT_MINUTES, CONSULT_STEP);
    if (starts.length > 0) days[date] = starts;
  }
  return days;
}

// Free consult start times for one artist on a single date. Used by POST
// /api/bookings to re-validate a chosen slot server-side (guards the race
// between a client seeing a slot and submitting it).
export async function getArtistConsultSlotsForDate(
  sql: Sql,
  artist: Pick<StaffMember, "id" | "role">,
  date: string,
): Promise<string[]> {
  const [weekly, overrides, busy] = await Promise.all([
    getStaffWeeklyHours(sql, artist.id),
    getStaffOverrides(sql, artist.id, date, date),
    getArtistBusyMap(sql, artist, date, date),
  ]);
  const wh = hoursForDate(weekly, overrides, date);
  return freeStartTimes(wh, busy[date] ?? [], CONSULT_MINUTES, CONSULT_STEP);
}

// Loads an active artist by id (for consult flows). Returns null if missing
// or inactive.
export async function getActiveArtistById(sql: Sql, id: number): Promise<StaffMember | null> {
  const artist = await getStaffById(sql, id);
  return artist && artist.active ? artist : null;
}
