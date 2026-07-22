import "server-only";
import type { getSql } from "@/lib/db";

type Sql = ReturnType<typeof getSql>;

// Appointment/working-hours model. All times are studio-local wall clock,
// stored as zero-padded "HH:MM" TEXT (lexicographic compare == time compare),
// matching the existing bookings.slot convention. Weekdays: 0 = Monday ... 6 = Sunday.

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const APPOINTMENT_KINDS = ["consult", "tattoo", "manual"] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

export const APPOINTMENT_STATUSES = ["scheduled", "done", "canceled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export type Appointment = {
  id: number;
  kind: AppointmentKind;
  title: string | null;
  request_id: number | null;
  user_id: number | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  note: string | null;
  status: AppointmentStatus;
  created_at: string;
};

export type TattooAppointmentWrite = {
  requestId: number;
  userId: number;
  artistId: number;
  date: string;
  start: string;
  end: string;
  note?: string | null;
};

export type TattooAppointmentUpdate = {
  id: number;
  date: string;
  start: string;
  end: string;
  title: string | null;
  note: string | null;
  status: AppointmentStatus;
};

export type WorkingHours = {
  weekday: number; // 0 = Monday ... 6 = Sunday
  open_time: string | null; // null = closed
  close_time: string | null;
};

export function isAppointmentKind(value: unknown): value is AppointmentKind {
  return typeof value === "string" && (APPOINTMENT_KINDS as readonly string[]).includes(value);
}

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Monday-based weekday index for a YYYY-MM-DD date.
export function weekdayIndex(date: string): number {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
}

// Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd), both "HH:MM".
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export const TATTOO_STATION_CAPACITY = 3;

// Keep only starts for which adding one tattoo session never raises the
// studio-wide concurrency above the three physical chairs/equipment sets.
export function filterStartsByTattooCapacity(
  starts: string[],
  durationMinutes: number,
  busy: { start_time: string; end_time: string }[],
): string[] {
  return starts.filter((start) => {
    const candidateStart = timeToMinutes(start);
    const candidateEnd = candidateStart + durationMinutes;
    const events: [number, number][] = [];
    for (const interval of busy) {
      const busyStart = timeToMinutes(interval.start_time);
      const busyEnd = timeToMinutes(interval.end_time);
      if (candidateStart < busyEnd && busyStart < candidateEnd) {
        events.push([Math.max(candidateStart, busyStart), 1]);
        events.push([Math.min(candidateEnd, busyEnd), -1]);
      }
    }
    events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    let concurrent = 0;
    for (const [, delta] of events) {
      concurrent += delta;
      if (concurrent >= TATTOO_STATION_CAPACITY) return false;
    }
    return true;
  });
}

export async function getTattooBusyMap(
  sql: Sql,
  from: string,
  to: string,
): Promise<Record<string, { start_time: string; end_time: string }[]>> {
  const rows = (await sql`
    SELECT date::text AS date, start_time, end_time FROM appointments
    WHERE kind = 'tattoo' AND date >= ${from} AND date <= ${to} AND status <> 'canceled'
  `) as { date: string; start_time: string; end_time: string }[];

  const map: Record<string, { start_time: string; end_time: string }[]> = {};
  for (const row of rows) {
    (map[row.date] ??= []).push({ start_time: row.start_time, end_time: row.end_time });
  }
  return map;
}

export async function createTattooAppointmentWithinCapacity(
  sql: Sql,
  input: TattooAppointmentWrite,
): Promise<(Appointment & { artist_id: number }) | null> {
  // Every tattoo write for the same date takes the same transaction lock.
  // The capacity query therefore sees the preceding committed write even when
  // clients submit at almost exactly the same time.
  const results = await sql.transaction((tx) => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended(${input.date}, 0))`,
    tx`
      INSERT INTO appointments (kind, request_id, user_id, artist_id, date, start_time, end_time, note)
      SELECT 'tattoo', ${input.requestId}, ${input.userId}, ${input.artistId},
             ${input.date}, ${input.start}, ${input.end}, ${input.note ?? null}
      WHERE NOT EXISTS (
        SELECT 1
        FROM (
          SELECT ${input.start}::text AS point
          UNION
          SELECT a.start_time AS point
          FROM appointments a
          WHERE a.kind = 'tattoo' AND a.status <> 'canceled' AND a.date = ${input.date}
            AND a.start_time >= ${input.start} AND a.start_time < ${input.end}
        ) points
        WHERE (
          SELECT count(*)
          FROM appointments current
          WHERE current.kind = 'tattoo' AND current.status <> 'canceled'
            AND current.date = ${input.date}
            AND current.start_time <= points.point AND current.end_time > points.point
        ) >= ${TATTOO_STATION_CAPACITY}
      )
      RETURNING id, kind, title, request_id, user_id, artist_id, date::text AS date,
                start_time, end_time, note, status, created_at
    `,
  ]);
  const inserted = results[1] as (Appointment & { artist_id: number })[];
  return inserted[0] ?? null;
}

export async function updateTattooAppointmentWithinCapacity(
  sql: Sql,
  input: TattooAppointmentUpdate,
): Promise<boolean> {
  const results = await sql.transaction((tx) => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended(${input.date}, 0))`,
    tx`
      UPDATE appointments target
      SET date = ${input.date}, start_time = ${input.start}, end_time = ${input.end},
          title = ${input.title}, note = ${input.note}, status = ${input.status}
      WHERE target.id = ${input.id}
        AND (
          ${input.status === "canceled"}
          OR NOT EXISTS (
            SELECT 1
            FROM (
              SELECT ${input.start}::text AS point
              UNION
              SELECT a.start_time AS point
              FROM appointments a
              WHERE a.id <> ${input.id} AND a.kind = 'tattoo' AND a.status <> 'canceled'
                AND a.date = ${input.date}
                AND a.start_time >= ${input.start} AND a.start_time < ${input.end}
            ) points
            WHERE (
              SELECT count(*)
              FROM appointments current
              WHERE current.id <> ${input.id} AND current.kind = 'tattoo'
                AND current.status <> 'canceled' AND current.date = ${input.date}
                AND current.start_time <= points.point AND current.end_time > points.point
            ) >= ${TATTOO_STATION_CAPACITY}
          )
        )
      RETURNING target.id
    `,
  ]);
  const updated = results[1] as { id: number }[];
  return updated.length > 0;
}

// Busy [start, end) intervals per date across the whole calendar: appointments
// of every kind plus consult bookings (fixed 60 min), canceled excluded.
export async function getBusyMap(
  sql: Sql,
  from: string,
  to: string,
): Promise<Record<string, { start_time: string; end_time: string }[]>> {
  const [appointments, consults] = await Promise.all([
    sql`
      SELECT date::text AS date, start_time, end_time FROM appointments
      WHERE date >= ${from} AND date <= ${to} AND status <> 'canceled'
    `,
    sql`
      SELECT date::text AS date, slot FROM bookings
      WHERE date >= ${from} AND date <= ${to} AND status <> 'canceled'
    `,
  ]);

  const map: Record<string, { start_time: string; end_time: string }[]> = {};
  for (const row of appointments as { date: string; start_time: string; end_time: string }[]) {
    (map[row.date] ??= []).push({ start_time: row.start_time, end_time: row.end_time });
  }
  for (const row of consults as { date: string; slot: string }[]) {
    const end = minutesToTime(Math.min(timeToMinutes(row.slot) + 60, 24 * 60 - 1));
    (map[row.date] ??= []).push({ start_time: row.slot, end_time: end });
  }
  return map;
}

export async function getWorkingHours(sql: Sql): Promise<WorkingHours[]> {
  return (await sql`
    SELECT weekday, open_time, close_time FROM working_hours ORDER BY weekday
  `) as WorkingHours[];
}

// Free contiguous windows of at least `durationMinutes` inside working hours,
// given the day's busy [start, end) intervals. Returns start times stepped
// every `stepMinutes` (default 30). Used by Faza 4 client slot picking and
// available to admin UI as well.
export function freeStartTimes(
  hours: { open_time: string | null; close_time: string | null },
  busy: { start_time: string; end_time: string }[],
  durationMinutes: number,
  stepMinutes = 30,
): string[] {
  if (!hours.open_time || !hours.close_time) return [];
  const open = timeToMinutes(hours.open_time);
  const close = timeToMinutes(hours.close_time);
  const intervals = busy
    .map((b) => [timeToMinutes(b.start_time), timeToMinutes(b.end_time)] as const)
    .sort((a, b) => a[0] - b[0]);

  const starts: string[] = [];
  for (let start = open; start + durationMinutes <= close; start += stepMinutes) {
    const end = start + durationMinutes;
    const clash = intervals.some(([bs, be]) => start < be && bs < end);
    if (!clash) starts.push(minutesToTime(start));
  }
  return starts;
}
