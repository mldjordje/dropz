import "server-only";
import {
  rangeFor,
  sumPoints,
  toDaily,
  toLifetime,
  toRows,
  type TrafficPoint,
  type TrafficRow,
} from "./traffic-shape";

const BASE = "https://api.vercel.com/v1/query/web-analytics";
const TIMEOUT_MS = 9000;

export type { TrafficPoint, TrafficRow };

export type TrafficReport = {
  since: string;
  until: string;
  totals: { pageviews: number; visitors: number };
  lifetime: { pageviews: number; visitors: number } | null;
  daily: TrafficPoint[];
  routes: TrafficRow[];
  referrers: TrafficRow[];
  countries: TrafficRow[];
  devices: TrafficRow[];
};

export type TrafficResult =
  | { ok: true; report: TrafficReport }
  | { ok: false; reason: "unconfigured"; missing: string[] }
  | { ok: false; reason: "error"; message: string };

type Config = { token: string; projectId: string; teamId?: string };

function readConfig(): Config | { missing: string[] } {
  const token = process.env.WEB_ANALYTICS_TOKEN?.trim();
  const projectId = (
    process.env.WEB_ANALYTICS_PROJECT_ID ||
    process.env.VERCEL_PROJECT_ID ||
    ""
  ).trim();
  const teamId = process.env.WEB_ANALYTICS_TEAM_ID?.trim();

  const missing: string[] = [];
  if (!token) missing.push("WEB_ANALYTICS_TOKEN");
  if (!projectId) missing.push("WEB_ANALYTICS_PROJECT_ID");
  if (missing.length) return { missing };

  return { token: token!, projectId, teamId: teamId || undefined };
}

async function query(
  config: Config,
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<unknown> {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("projectId", config.projectId);
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      detail = body.error?.message ?? "";
    } catch {
      // Vercel occasionally returns an empty/non-JSON error body.
    }
    throw new Error(
      `Vercel ${path} → ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  return response.json();
}

export async function getTrafficReport(days: number): Promise<TrafficResult> {
  const config = readConfig();
  if ("missing" in config) {
    return { ok: false, reason: "unconfigured", missing: config.missing };
  }

  const range = rangeFor(days);

  try {
    const [daily, routes, referrers, countries, devices, lifetime] =
      await Promise.all([
        query(config, "visits/aggregate", { ...range, by: "day" }),
        query(config, "visits/aggregate", {
          ...range,
          by: "route",
          limit: 10,
        }),
        query(config, "visits/aggregate", {
          ...range,
          by: "referrerHostname",
          limit: 8,
        }),
        query(config, "visits/aggregate", {
          ...range,
          by: "country",
          limit: 8,
        }),
        query(config, "visits/aggregate", {
          ...range,
          by: "deviceType",
          limit: 5,
        }),
        query(config, "visits/count", {}).catch(() => null),
      ]);

    const points = toDaily(daily);
    return {
      ok: true,
      report: {
        ...range,
        totals: sumPoints(points),
        lifetime: toLifetime(lifetime),
        daily: points,
        routes: toRows(routes, "route", "—"),
        referrers: toRows(referrers, "referrerHostname", "Direktno"),
        countries: toRows(countries, "country", "—"),
        devices: toRows(devices, "deviceType", "—"),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
