import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { isValidImageUrl, slugify } from "@/lib/portfolio";
import { resolveArtistId } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// An artist's own portfolio: every team member (owner included) manages the
// works attributed to them. Public artist pages read from the same rows.

function revalidateArtistPages() {
  revalidatePath("/artisti", "layout"); // index + every /artisti/[slug]
  revalidatePath("/portfolio");
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const artistId = await resolveArtistId(sql, session);
  if (!artistId) return NextResponse.json({ ok: false, message: "Nedostaje artist." }, { status: 400 });

  const works = await sql`
    SELECT id, title, image_url, alt, sort, created_at
    FROM portfolio_works WHERE artist_id = ${artistId}
    ORDER BY sort ASC, created_at DESC
  `;
  return NextResponse.json({ ok: true, works });
}

// POST { image_url, title? } — add a work to my page.
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidImageUrl(body.image_url)) {
    return NextResponse.json({ ok: false, message: "Neispravan URL slike" }, { status: 400 });
  }
  const title = typeof body.title === "string" && body.title.trim() !== ""
    ? body.title.trim().slice(0, 200)
    : "Rad";

  const sql = getSql();
  const artistId = await resolveArtistId(sql, session);
  if (!artistId) return NextResponse.json({ ok: false, message: "Nedostaje artist." }, { status: 400 });

  const baseSlug = slugify(title);
  let slug = baseSlug;
  for (let i = 2; i <= 80; i++) {
    const taken = (await sql`SELECT id FROM portfolio_works WHERE slug = ${slug}`) as { id: number }[];
    if (taken.length === 0) break;
    slug = `${baseSlug}-${i}`;
  }

  // Artist uploads never land in the landing "Radovi" section by default —
  // the owner curates that via /admin/portfolio (featured flag).
  const inserted = await sql`
    INSERT INTO portfolio_works (title, image_url, artist_id, slug, featured)
    VALUES (${title}, ${body.image_url}, ${artistId}, ${slug}, false)
    RETURNING id, title, image_url, alt, sort, created_at
  `;
  revalidateArtistPages();
  return NextResponse.json({ ok: true, work: (inserted as { id: number }[])[0] }, { status: 201 });
}

// DELETE { id } — remove one of MY works (staff cannot touch others').
export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const sql = getSql();
  const artistId = await resolveArtistId(sql, session);
  const rows = (await sql`
    DELETE FROM portfolio_works WHERE id = ${id} AND artist_id = ${artistId} RETURNING id
  `) as { id: number }[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: "Rad nije nađen." }, { status: 404 });
  }
  revalidateArtistPages();
  return NextResponse.json({ ok: true });
}
