import "server-only";

export type PortfolioCategory = {
  id: number;
  name: string;
  slug: string;
  sort: number;
  created_at: string;
};

export type PortfolioWork = {
  id: number;
  category_id: number | null;
  title: string;
  image_url: string;
  slug: string | null;
  alt: string | null;
  description: string | null;
  tags: string[];
  seo_title: string | null;
  featured: boolean;
  sort: number;
  created_at: string;
};

// Serbian Latin diacritics that Unicode NFD normalization won't decompose
// on their own (dj/Dj are standalone codepoints, not base+combining mark).
const DIACRITIC_MAP: Record<string, string> = {
  "š": "s", "Š": "s", // s, S
  "đ": "dj", "Đ": "dj", // dj, Dj
  "č": "c", "Č": "c", // c, C (caron)
  "ć": "c", "Ć": "c", // c, C (acute)
  "ž": "z", "Ž": "z", // z, Z
};

const COMBINING_MARKS_RE = new RegExp("[" + "̀" + "-" + "ͯ" + "]", "g"); // U+0300-U+036F combining diacritics

// lowercase, strip diacritics, collapse anything else into dashes.
export function slugify(input: string): string {
  let value = input;
  for (const [from, to] of Object.entries(DIACRITIC_MAP)) {
    value = value.split(from).join(to);
  }
  value = value.normalize("NFD").replace(COMBINING_MARKS_RE, "");
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "stil";
}

// Accepts an absolute http(s) URL or a same-origin path starting with "/".
export function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2000) return false;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
