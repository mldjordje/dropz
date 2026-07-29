import "server-only";
import type { getSql } from "@/lib/db";
import {
  TATTOO_STATION_CAPACITY,
  filterStartsByTattooCapacity,
  freeStartTimes,
  getTattooBusyMap,
} from "@/lib/schedule";
import {
  getActiveArtists,
  getArtistBusyMap,
  getStaffById,
  getStaffOverrides,
  getStaffWeeklyHours,
  hoursForDate,
} from "@/lib/staff";

type Sql = ReturnType<typeof getSql>;

export type FinalizedTattooAppointment = {
  id: number;
  request_id: number;
  user_id: number;
  artist_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: "scheduled";
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Anonymous availability is the union of every active team member's free
 * starts, then constrained by the three-station studio capacity. No staff
 * identity leaves this helper.
 */
export async function getAnonymousTattooMonth(
  sql: Sql,
  month: string,
  durationMinutes: number,
): Promise<Record<string, string[]>> {
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const first = `${month}-01`;
  const last = `${month}-${String(dayCount).padStart(2, "0")}`;
  const today = todayIso();
  const artists = await getActiveArtists(sql);
  if (artists.length === 0) return {};

  const [studioBusy, artistData] = await Promise.all([
    getTattooBusyMap(sql, first, last),
    Promise.all(
      artists.map(async (artist) => {
        const [weekly, overrides, busy] = await Promise.all([
          getStaffWeeklyHours(sql, artist.id),
          getStaffOverrides(sql, artist.id, first, last),
          getArtistBusyMap(sql, artist, first, last),
        ]);
        return { weekly, overrides, busy };
      }),
    ),
  ]);

  const days: Record<string, string[]> = {};
  for (let day = 1; day <= dayCount; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date <= today) continue;

    const available = new Set<string>();
    for (const data of artistData) {
      const hours = hoursForDate(data.weekly, data.overrides, date);
      for (const start of freeStartTimes(hours, data.busy[date] ?? [], durationMinutes)) {
        available.add(start);
      }
    }
    const starts = filterStartsByTattooCapacity(
      [...available].sort(),
      durationMinutes,
      studioBusy[date] ?? [],
    );
    if (starts.length > 0) days[date] = starts;
  }
  return days;
}

export async function isArtistAvailableForTattoo(
  sql: Sql,
  input: {
    artistId: number;
    date: string;
    start: string;
    durationMinutes: number;
  },
): Promise<boolean> {
  const artist = await getStaffById(sql, input.artistId);
  if (!artist?.active) return false;
  const [weekly, overrides, busy, studioBusy] = await Promise.all([
    getStaffWeeklyHours(sql, artist.id),
    getStaffOverrides(sql, artist.id, input.date, input.date),
    getArtistBusyMap(sql, artist, input.date, input.date),
    getTattooBusyMap(sql, input.date, input.date),
  ]);
  const hours = hoursForDate(weekly, overrides, input.date);
  const artistStarts = freeStartTimes(
    hours,
    busy[input.date] ?? [],
    input.durationMinutes,
  );
  return filterStartsByTattooCapacity(
    artistStarts,
    input.durationMinutes,
    studioBusy[input.date] ?? [],
  ).includes(input.start);
}

/**
 * Finalizes either a client's requested slot or an owner-proposed alternative.
 * Date and staff advisory locks serialize every capacity/availability decision.
 * The appointment and both status updates are one atomic CTE.
 */
export async function finalizeTattooSlotRequest(
  sql: Sql,
  input: {
    slotRequestId: number;
    expectedStatus: "pending_owner" | "alternative_proposed";
    artistId: number;
    date: string;
    start: string;
    end: string;
  },
): Promise<FinalizedTattooAppointment | null> {
  const staffLock = `tattoo-staff:${input.artistId}:${input.date}`;
  const results = await sql.transaction((tx) => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended(${input.date}, 0))`,
    tx`SELECT pg_advisory_xact_lock(hashtextextended(${staffLock}, 0))`,
    tx`
      WITH selected AS (
        SELECT sr.id, sr.request_id, tr.user_id
        FROM tattoo_slot_requests sr
        JOIN tattoo_requests tr ON tr.id = sr.request_id
        WHERE sr.id = ${input.slotRequestId}
          AND sr.status = ${input.expectedStatus}
          AND tr.status IN ('accepted', 'scheduled')
          AND tr.sessions_done < tr.session_count
          AND sr.session_number = tr.sessions_done + 1
          AND (
            (${input.expectedStatus === "pending_owner"}
              AND sr.requested_date = ${input.date}
              AND sr.requested_start = ${input.start}
              AND sr.requested_end = ${input.end})
            OR
            (${input.expectedStatus === "alternative_proposed"}
              AND sr.proposed_date = ${input.date}
              AND sr.proposed_start = ${input.start}
              AND sr.proposed_end = ${input.end})
          )
      ),
      eligible AS (
        SELECT selected.*
        FROM selected
        JOIN staff s ON s.id = ${input.artistId} AND s.active
        LEFT JOIN staff_day_overrides day_override
          ON day_override.staff_id = s.id AND day_override.date = ${input.date}::date
        LEFT JOIN staff_working_hours weekly
          ON weekly.staff_id = s.id
         AND weekly.weekday = EXTRACT(ISODOW FROM ${input.date}::date)::int - 1
        WHERE
          (CASE WHEN day_override.date IS NOT NULL THEN day_override.open_time ELSE weekly.open_time END) IS NOT NULL
          AND (CASE WHEN day_override.date IS NOT NULL THEN day_override.close_time ELSE weekly.close_time END) IS NOT NULL
          AND (CASE WHEN day_override.date IS NOT NULL THEN day_override.open_time ELSE weekly.open_time END) <= ${input.start}
          AND (CASE WHEN day_override.date IS NOT NULL THEN day_override.close_time ELSE weekly.close_time END) >= ${input.end}
          AND NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.artist_id = ${input.artistId}
              AND a.date = ${input.date}
              AND a.status <> 'canceled'
              AND a.start_time < ${input.end}
              AND ${input.start} < a.end_time
          )
          AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.date = ${input.date}
              AND b.status <> 'canceled'
              AND (
                b.artist_id = ${input.artistId}
                OR (s.role = 'owner' AND b.artist_id IS NULL)
              )
              AND b.slot::time < ${input.end}::time
              AND (b.slot::time + interval '60 minutes') > ${input.start}::time
          )
          AND NOT EXISTS (
            SELECT 1
            FROM (
              SELECT ${input.start}::text AS point
              UNION
              SELECT a.start_time
              FROM appointments a
              WHERE a.kind = 'tattoo'
                AND a.status <> 'canceled'
                AND a.date = ${input.date}
                AND a.start_time >= ${input.start}
                AND a.start_time < ${input.end}
            ) points
            WHERE (
              SELECT count(*)
              FROM appointments current
              WHERE current.kind = 'tattoo'
                AND current.status <> 'canceled'
                AND current.date = ${input.date}
                AND current.start_time <= points.point
                AND current.end_time > points.point
            ) >= ${TATTOO_STATION_CAPACITY}
          )
      ),
      inserted AS (
        INSERT INTO appointments (
          kind, request_id, user_id, artist_id, date, start_time, end_time
        )
        SELECT
          'tattoo', eligible.request_id, eligible.user_id, ${input.artistId},
          ${input.date}, ${input.start}, ${input.end}
        FROM eligible
        RETURNING id, request_id, user_id, artist_id, date::text AS date,
                  start_time, end_time, status
      ),
      slot_updated AS (
        UPDATE tattoo_slot_requests
        SET status = 'confirmed',
            assigned_staff_id = ${input.artistId},
            appointment_id = (SELECT id FROM inserted),
            updated_at = now(),
            decided_at = now()
        WHERE id = ${input.slotRequestId}
          AND EXISTS (SELECT 1 FROM inserted)
        RETURNING request_id
      ),
      request_updated AS (
        UPDATE tattoo_requests
        SET status = 'scheduled'
        WHERE id = (SELECT request_id FROM slot_updated)
          AND status IN ('accepted', 'scheduled')
        RETURNING id
      )
      SELECT * FROM inserted
    `,
  ]);

  const inserted = results[2] as FinalizedTattooAppointment[];
  return inserted[0] ?? null;
}
