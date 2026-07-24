import { SITE } from "@/lib/site";

// Opening hours live in exactly one place (SITE.hours, in schema.org day names).
// Everything user-facing is derived here so the footer, /kontakt and the JSON-LD
// can never drift apart — mismatched hours across a site and its Google Business
// Profile is a local-ranking negative.

export const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type Day = (typeof DAY_ORDER)[number];

const SR_SHORT: Record<Day, string> = {
  Monday: "Pon",
  Tuesday: "Uto",
  Wednesday: "Sre",
  Thursday: "Čet",
  Friday: "Pet",
  Saturday: "Sub",
  Sunday: "Ned",
};

const SR_LONG: Record<Day, string> = {
  Monday: "Ponedeljak",
  Tuesday: "Utorak",
  Wednesday: "Sreda",
  Thursday: "Četvrtak",
  Friday: "Petak",
  Saturday: "Subota",
  Sunday: "Nedelja",
};

export type DayHours = { day: Day; short: string; long: string; opens?: string; closes?: string };

// One entry per weekday, in week order; open days carry their times.
export function weekHours(): DayHours[] {
  const byDay = new Map<string, { opens: string; closes: string }>();
  for (const block of SITE.hours) {
    for (const day of block.days) byDay.set(day, { opens: block.opens, closes: block.closes });
  }
  return DAY_ORDER.map((day) => ({
    day,
    short: SR_SHORT[day],
    long: SR_LONG[day],
    ...byDay.get(day),
  }));
}

export function isOpenDay(entry: DayHours): boolean {
  return entry.opens !== undefined;
}

// "Uto–Sub · 11–15h", or "Uto–Sub · od 11h" when the closing time varies across
// open days. Falls back to a comma list if the open days aren't contiguous.
export function shortHours(): string {
  const week = weekHours();
  const open = week.filter(isOpenDay);
  if (open.length === 0) return "Po dogovoru";

  const firstIdx = week.findIndex(isOpenDay);
  const lastIdx = week.length - 1 - [...week].reverse().findIndex(isOpenDay);
  const contiguous = week.slice(firstIdx, lastIdx + 1).every(isOpenDay);
  const days = !contiguous
    ? open.map((d) => d.short).join(", ")
    : firstIdx === lastIdx
      ? week[firstIdx].short // a single open day must not render as "Uto–Uto"
      : `${week[firstIdx].short}–${week[lastIdx].short}`;

  const opens = open[0].opens;
  const sameOpen = open.every((d) => d.opens === opens);
  const closes = open[0].closes;
  const sameClose = open.every((d) => d.closes === closes);

  if (sameOpen && sameClose) return `${days} · ${trim(opens!)}–${trim(closes!)}h`;
  if (sameOpen) return `${days} · od ${trim(opens!)}h`;
  return days;
}

// "11:00" -> "11", "11:30" -> "11:30" — Serbian signage drops a zero minute.
function trim(time: string): string {
  return time.endsWith(":00") ? time.slice(0, -3) : time;
}

export { trim as formatTime };
