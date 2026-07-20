import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getActiveArtists } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the studio's artists for the request form's picker. Owner (Dragan)
// comes first — the UI highlights him. Emails stay private.
export async function GET() {
  try {
    const artists = await getActiveArtists(getSql());
    return NextResponse.json({
      ok: true,
      artists: artists.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        avatar_url: a.avatar_url,
        slug: a.slug,
      })),
    });
  } catch {
    // staff table missing (pre-migration) — form falls back to "no preference".
    return NextResponse.json({ ok: true, artists: [] });
  }
}
