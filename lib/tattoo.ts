import "server-only";
import type { getSql } from "@/lib/db";
import { isValidImageUrl } from "@/lib/portfolio";

type Sql = ReturnType<typeof getSql>;

// Tattoo request lifecycle:
//   pending            — waiting for the owner's estimate
//   revision_requested — client asked for a new estimate
//   quoted             — estimate sent, waiting for explicit client acceptance
//   accepted           — estimate accepted, client may request the next slot
//   scheduled          — at least one session has been confirmed
//   done               — all sessions finished
//   canceled           — project closed by the studio
export const TATTOO_STATUSES = [
  "pending",
  "revision_requested",
  "quoted",
  "accepted",
  "scheduled",
  "done",
  "canceled",
] as const;
export type TattooStatus = (typeof TATTOO_STATUSES)[number];

export const SLOT_REQUEST_STATUSES = [
  "pending_owner",
  "alternative_proposed",
  "confirmed",
  "rejected",
  "declined",
] as const;
export type SlotRequestStatus = (typeof SLOT_REQUEST_STATUSES)[number];

export type TattooSlotRequest = {
  id: number;
  request_id: number;
  session_number: number;
  requested_date: string;
  requested_start: string;
  requested_end: string;
  proposed_date: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  status: SlotRequestStatus;
  owner_note: string | null;
  appointment_id: number | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
};

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
  quote_revision_note: string | null;
  quote_revision_requested_at: string | null;
  quote_accepted_at: string | null;
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
           quoted_at, quote_revision_note, quote_revision_requested_at,
           quote_accepted_at, created_at
    FROM tattoo_requests
    WHERE id = ${requestId} AND user_id = ${userId}
  `) as TattooRequest[];
  const request = rows[0];
  if (!request) return null;
  if (request.status !== "accepted" && request.status !== "scheduled") return null;
  if (!request.session_count || !request.session_minutes) return null;
  if (request.sessions_done >= request.session_count) return null;

  const upcoming = (await sql`
    SELECT id FROM appointments
    WHERE request_id = ${requestId} AND status = 'scheduled'
    LIMIT 1
  `) as { id: number }[];
  if (upcoming.length > 0) return null;

  const openSlotRequest = (await sql`
    SELECT id FROM tattoo_slot_requests
    WHERE request_id = ${requestId}
      AND status IN ('pending_owner', 'alternative_proposed')
    LIMIT 1
  `) as { id: number }[];
  if (openSlotRequest.length > 0) return null;

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
