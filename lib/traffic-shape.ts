export type TrafficPoint = { date: string; pageviews: number; visitors: number };
export type TrafficRow = { label: string; pageviews: number; visitors: number };

export const ALLOWED_DAYS = [7, 30, 90];
export const DEFAULT_DAYS = 30;

export function pickDays(raw: unknown): number {
  const days = Number(raw);
  return ALLOWED_DAYS.includes(days) ? days : DEFAULT_DAYS;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function rangeFor(
  days: number,
  now = new Date(),
): { since: string; until: string } {
  const since = new Date(now.getTime() - (days - 1) * 86_400_000);
  return { since: isoDate(since), until: isoDate(now) };
}

export function toRows(
  json: unknown,
  dimension: string,
  fallback: string,
): TrafficRow[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  return data.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const value = row[dimension];
    return {
      label: typeof value === "string" && value.trim() ? value : fallback,
      pageviews: numberOrZero(row.pageviews),
      visitors: numberOrZero(row.visitors),
    };
  });
}

export function toDaily(json: unknown): TrafficPoint[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  return data
    .map((raw) => {
      const row = (raw ?? {}) as Record<string, unknown>;
      const date =
        typeof row.timestamp === "string" ? row.timestamp.slice(0, 10) : "";
      return {
        date,
        pageviews: numberOrZero(row.pageviews),
        visitors: numberOrZero(row.visitors),
      };
    })
    .filter((point) => point.date.length === 10)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function sumPoints(
  points: TrafficPoint[],
): { pageviews: number; visitors: number } {
  return {
    pageviews: points.reduce((sum, point) => sum + point.pageviews, 0),
    visitors: points.reduce((sum, point) => sum + point.visitors, 0),
  };
}

export function toLifetime(
  json: unknown,
): { pageviews: number; visitors: number } | null {
  const data = (json as { data?: unknown } | null)?.data;
  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  if (row.pageviews === undefined && row.visitors === undefined) return null;
  return {
    pageviews: numberOrZero(row.pageviews),
    visitors: numberOrZero(row.visitors),
  };
}
