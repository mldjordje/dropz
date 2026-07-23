// Shared client-side helpers and types for admin pages.

export type Booking = {
  id: number;
  name: string;
  contact: string;
  kind: "consult" | "session";
  note: string | null;
  date: string;
  slot: string;
  status: "new" | "confirmed" | "done" | "canceled";
  created_at: string;
};

export type AvailabilityDay = {
  date: string;
  slots: string[];
  isOverride: boolean;
  isDefaultOpen: boolean;
};

export type TattooCapacityInterval = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status?: string;
};

export const STATUS_LABEL: Record<Booking["status"], string> = {
  new: "Novo",
  confirmed: "Potvrđeno",
  done: "Završeno",
  canceled: "Otkazano",
};

// Valid consultation hours, 10:00 through 20:00 (mirrors lib/availability.ts;
// duplicated here since that module is server-only and can't be imported client-side).
export const HOURS = Array.from({ length: 11 }, (_, i) => `${String(10 + i).padStart(2, "0")}:00`);

export const TATTOO_STATION_CAPACITY = 3;

export function tattooCapacityStatus(
  intervals: TattooCapacityInterval[],
  date: string,
  start: string,
  end: string,
  excludeId?: number,
) {
  if (!date || !start || !end || start >= end) {
    return { occupied: 0, available: TATTOO_STATION_CAPACITY, full: false };
  }

  const events: [string, number][] = [];
  for (const interval of intervals) {
    if (
      interval.id === excludeId ||
      interval.date !== date ||
      interval.status === "canceled" ||
      start >= interval.end_time ||
      interval.start_time >= end
    ) {
      continue;
    }
    events.push([interval.start_time < start ? start : interval.start_time, 1]);
    events.push([interval.end_time > end ? end : interval.end_time, -1]);
  }
  events.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);

  let concurrent = 0;
  let occupied = 0;
  for (const [, delta] of events) {
    concurrent += delta;
    occupied = Math.max(occupied, concurrent);
  }
  if (occupied > TATTOO_STATION_CAPACITY) {
    return { occupied, available: 0, full: true, overbooked: true as const };
  }
  return {
    occupied,
    available: TATTOO_STATION_CAPACITY - occupied,
    full: occupied === TATTOO_STATION_CAPACITY,
  };
}

export function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fmtDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

export function fmtBirthday(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function monthKey(offset: number) {
  const d = new Date();
  const base = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("sr-Latn-RS", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

export function daysInMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function leadBlanks(key: string) {
  const [y, m] = key.split("-").map(Number);
  return (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon=0
}

export function fmtDayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short" }).format(d);
}
