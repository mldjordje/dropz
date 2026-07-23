import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { MONTH_RE } from "@/lib/availability";
import { getActiveArtistById, getArtistConsultMonth } from "@/lib/consult";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: free consultation start times for a SPECIFIC artist in a month, so
// the booking calendar can show that artist's real availability (their working
// hours + date exceptions, minus their calendar). Used when a visitor books a
// consult with a chosen artist or lands from an artist's profile. The
// no-preference ("svejedno") path keeps using /api/bookings/availability.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const month = params.get("month") ?? "";
  const artistIdRaw = params.get("artistId") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "Invalid month" }, { status: 400 });
  }
  const artistId = Number(artistIdRaw);
  if (!Number.isInteger(artistId)) {
    return NextResponse.json({ ok: false, message: "Invalid artist" }, { status: 400 });
  }

  const sql = getSql();
  const artist = await getActiveArtistById(sql, artistId);
  if (!artist) {
    return NextResponse.json({ ok: false, message: "Artist nije pronađen." }, { status: 404 });
  }

  const days = await getArtistConsultMonth(sql, artist, month);
  return NextResponse.json({ ok: true, days });
}
