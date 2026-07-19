import "server-only";
import { getSql } from "./db";
import { copy, locales, type Locale } from "@/components/landing/content";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

// Deep-merge override onto base; override wins on leaves, objects merge, arrays replace per-index.
function deepMerge<T>(base: T, override: Json): T {
  if (override === null || override === undefined) return base;
  if (Array.isArray(base) && Array.isArray(override)) {
    return base.map((item, i) => (override[i] === undefined ? item : deepMerge(item, override[i]))) as T;
  }
  if (typeof base === "object" && base !== null && typeof override === "object" && !Array.isArray(override)) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(override as Record<string, Json>)) {
      if (k in out) out[k] = deepMerge(out[k], v);
    }
    return out as T;
  }
  if (typeof override === typeof base) return override as T;
  return base;
}

// Merged site copy: content.ts defaults + admin overrides from site_content (keys copy_sr/copy_en/copy_de).
// Falls back to pure defaults if the DB is unreachable.
export async function getMergedCopy(): Promise<typeof copy> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT key, value FROM site_content WHERE key = ANY(${locales.map((l) => `copy_${l}`)})
    `) as { key: string; value: Json }[];
    if (rows.length === 0) return copy;

    const merged: Record<string, unknown> = {};
    for (const l of locales) {
      const row = rows.find((r) => r.key === `copy_${l}`);
      merged[l] = row ? deepMerge(copy[l as Locale], row.value) : copy[l as Locale];
    }
    return merged as typeof copy;
  } catch {
    return copy;
  }
}

export async function getCopyOverrides(): Promise<Record<Locale, Json>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT key, value FROM site_content WHERE key = ANY(${locales.map((l) => `copy_${l}`)})
  `) as { key: string; value: Json }[];
  const out = {} as Record<Locale, Json>;
  for (const l of locales) {
    out[l] = rows.find((r) => r.key === `copy_${l}`)?.value ?? {};
  }
  return out;
}
