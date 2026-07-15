import "server-only";
import type { getSql } from "@/lib/db";

// Only Mondays are open for consultations by default, 2 fixed hourly slots.
// Change here to adjust the default schedule.
export const DEFAULT_CONSULT_SLOTS = ["12:00", "13:00"];

// Valid consultation hours, 10:00 through 20:00.
export const VALID_HOURS = Array.from({ length: 11 }, (_, i) => `${String(10 + i).padStart(2, "0")}:00`);

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;

type Sql = ReturnType<typeof getSql>;

export function isValidSlot(slot: string): boolean {
  return VALID_HOURS.includes(slot);
}

// Validates + normalizes a raw slot list: every entry must be a valid hour,
// duplicates are dropped, result is sorted. Returns null if anything is invalid.
export function normalizeSlots(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const set = new Set<string>();
  for (const item of input) {
    if (typeof item !== "string" || !isValidSlot(item)) return null;
    set.add(item);
  }
  return Array.from(set).sort();
}

function isMonday(date: string): boolean {
  return new Date(`${date}T12:00:00`).getDay() === 1;
}

function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// Default (no-override) slots for a date: Monday -> DEFAULT_CONSULT_SLOTS, else closed.
export function defaultSlotsForDate(date: string): string[] {
  return isMonday(date) ? [...DEFAULT_CONSULT_SLOTS] : [];
}

// Effective slots for a single date: an override row (if any) wins outright,
// including an empty array meaning "closed". No row -> default rule.
export async function getSlotsForDate(sql: Sql, date: string): Promise<string[]> {
  const rows = (await sql`
    SELECT slots FROM consult_days WHERE date = ${date}
  `) as { slots: string[] }[];
  if (rows.length > 0) {
    return rows[0].slots;
  }
  return defaultSlotsForDate(date);
}

// All open dates in a given month (YYYY-MM), overrides merged over Monday defaults.
// Dates with no slots (closed) are omitted from the result.
export async function getMonthAvailability(sql: Sql, yearMonth: string): Promise<Record<string, string[]>> {
  const [year, month] = yearMonth.split("-");
  const total = daysInMonth(yearMonth);

  const result: Record<string, string[]> = {};
  for (let day = 1; day <= total; day++) {
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    if (isMonday(date)) {
      result[date] = [...DEFAULT_CONSULT_SLOTS];
    }
  }

  const overrides = (await sql`
    SELECT date::text AS date, slots FROM consult_days
    WHERE date >= ${`${yearMonth}-01`} AND date < (${`${yearMonth}-01`}::date + INTERVAL '1 month')
  `) as { date: string; slots: string[] }[];

  for (const row of overrides) {
    const date = row.date;
    if (row.slots.length > 0) {
      result[date] = row.slots;
    } else {
      delete result[date];
    }
  }

  return result;
}
