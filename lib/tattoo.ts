import "server-only";
import type { getSql } from "@/lib/db";
import { isValidImageUrl } from "@/lib/portfolio";

type Sql = ReturnType<typeof getSql>;

// Tattoo request lifecycle:
//   pending  — waiting for the artist's estimate
//   quoted   — estimate sent, client picks session slots (Faza 4)
//   scheduled — at least one session booked
//   done     — all sessions finished
//   canceled — dropped by either side
export const TATTOO_STATUSES = ["pending", "quoted", "scheduled", "done", "canceled"] as const;
export type TattooStatus = (typeof TATTOO_STATUSES)[number];

export type TattooRequest = {
  id: number;
  user_id: number;
  description: string;
  size: string | null;
  body_part: string | null;
  budget: string | null;
  image_urls: string[];
  status: TattooStatus;
  artist_id: number | null; // null = no preference, owner assigns
  session_count: number | null;
  session_minutes: number | null;
  price: string | null;
  admin_note: string | null;
  sessions_done: number;
  quoted_at: string | null;
  created_at: string;
};

export const MAX_REFERENCE_IMAGES = 5;
export const MIN_SESSION_MINUTES = 30;
export const MAX_SESSION_MINUTES = 8 * 60;
export const MAX_SESSIONS = 10;

export function isTattooStatus(value: unknown): value is TattooStatus {
  return typeof value === "string" && (TATTOO_STATUSES as readonly string[]).includes(value);
}

// Loads a request if it belongs to the user AND the client may book its next
// session right now: it has an estimate, sessions remain, and there is no
// upcoming scheduled session already on the calendar. Returns null otherwise.
export async function getBookableRequest(
  sql: Sql,
  requestId: number,
  userId: number,
): Promise<TattooRequest | null> {
  const rows = (await sql`
    SELECT id, user_id, description, size, body_part, budget, image_urls, status,
           artist_id, session_count, session_minutes, price, admin_note, sessions_done,
           quoted_at, created_at
    FROM tattoo_requests
    WHERE id = ${requestId} AND user_id = ${userId}
  `) as TattooRequest[];
  const request = rows[0];
  if (!request) return null;
  if (request.status !== "quoted" && request.status !== "scheduled") return null;
  if (!request.session_count || !request.session_minutes) return null;
  if (request.sessions_done >= request.session_count) return null;

  const upcoming = (await sql`
    SELECT id FROM appointments
    WHERE request_id = ${requestId} AND status = 'scheduled' AND date >= CURRENT_DATE
    LIMIT 1
  `) as { id: number }[];
  if (upcoming.length > 0) return null;

  return request;
}

// Trimmed string within length bounds, else null.
export function cleanText(value: unknown, maxLength: number, minLength = 1): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) return null;
  return trimmed;
}

// Validates the reference image list from the client: array of image URLs,
// capped at MAX_REFERENCE_IMAGES. Missing/empty input -> empty list.
export function cleanImageUrls(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_REFERENCE_IMAGES) return null;
  const urls: string[] = [];
  for (const item of value) {
    if (!isValidImageUrl(item)) return null;
    urls.push(item);
  }
  return urls;
}
