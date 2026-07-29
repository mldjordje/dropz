import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { DATE_RE } from "@/lib/availability";
import { isValidTime } from "@/lib/schedule";
import { getActiveArtists } from "@/lib/staff";
import { isArtistAvailableForTattoo } from "@/lib/tattoo-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const start = params.get("start") ?? "";
  const duration = Number(params.get("duration"));
  if (
    !DATE_RE.test(date) ||
    !isValidTime(start) ||
    !Number.isInteger(duration) ||
    duration < 30 ||
    duration > 480
  ) {
    return NextResponse.json({ ok: false, message: "Invalid availability query" }, { status: 400 });
  }

  const sql = getSql();
  const artists = await getActiveArtists(sql);
  const checks = await Promise.all(
    artists.map((artist) =>
      isArtistAvailableForTattoo(sql, {
        artistId: artist.id,
        date,
        start,
        durationMinutes: duration,
      }),
    ),
  );
  return NextResponse.json({
    ok: true,
    artists: artists
      .filter((_, index) => checks[index])
      .map((artist) => ({ id: artist.id, name: artist.name, role: artist.role, active: true })),
  });
}
