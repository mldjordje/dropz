// Light phone check: digits, spaces, and + - ( ) / only, 6-24 chars. We store
// the number as typed — clients write local and international forms alike and
// the studio dials it by hand.
export const PHONE_RE = /^[+()/\s-]*\d[\d()/\s-]{5,23}$/;

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!PHONE_RE.test(trimmed)) return null;
  return trimmed.slice(0, 40);
}
