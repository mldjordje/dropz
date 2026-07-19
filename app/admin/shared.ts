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

export const STATUS_LABEL: Record<Booking["status"], string> = {
  new: "Novo",
  confirmed: "Potvrđeno",
  done: "Završeno",
  canceled: "Otkazano",
};

// Valid consultation hours, 10:00 through 20:00 (mirrors lib/availability.ts;
// duplicated here since that module is server-only and can't be imported client-side).
export const HOURS = Array.from({ length: 11 }, (_, i) => `${String(10 + i).padStart(2, "0")}:00`);

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
