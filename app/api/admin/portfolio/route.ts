import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isValidImageUrl, slugify } from "@/lib/portfolio";

// Admin: add a portfolio work (image + title + optional category).
// Auth is enforced by middleware.ts for the /api/admin/:path* matcher.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const imageUrl = body.image_url;
  const categoryIdRaw = body.category_id;

  if (!title) {
    return NextResponse.json({ ok: false, message: "Naslov je obavezan" }, { status: 400 });
  }
  if (!isValidImageUrl(imageUrl)) {
    return NextResponse.json({ ok: false, message: "Neispravan URL slike" }, { status: 400 });
  }

  let categoryId: number | null = null;
  if (categoryIdRaw !== null && categoryIdRaw !== undefined && categoryIdRaw !== "") {
    categoryId = Number(categoryIdRaw);
    if (!Number.isInteger(categoryId)) {
      return NextResponse.json({ ok: false, message: "Neispravna kategorija" }, { status: 400 });
    }
  }

  // Optional SEO / AI metadata.
  const alt = typeof body.alt === "string" ? body.alt.trim().slice(0, 200) || null : null;
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 1000) || null : null;
  const seoTitle = typeof body.seo_title === "string" ? body.seo_title.trim().slice(0, 80) || null : null;
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 10)
    : [];

  const sql = getSql();
  if (categoryId !== null) {
    const found = (await sql`SELECT id FROM portfolio_categories WHERE id = ${categoryId}`) as { id: number }[];
    if (found.length === 0) {
      return NextResponse.json({ ok: false, message: "Kategorija ne postoji" }, { status: 400 });
    }
  }

  // Unique slug from the provided value or the title.
  const baseSlug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
  let slug = baseSlug;
  for (let i = 2; i <= 50; i++) {
    const taken = (await sql`SELECT id FROM portfolio_works WHERE slug = ${slug}`) as { id: number }[];
    if (taken.length === 0) break;
    slug = `${baseSlug}-${i}`;
  }

  const inserted = (await sql`
    INSERT INTO portfolio_works (title, image_url, category_id, slug, alt, description, tags, seo_title)
    VALUES (${title}, ${imageUrl}, ${categoryId}, ${slug}, ${alt}, ${description}, ${tags}, ${seoTitle})
    RETURNING id, title, image_url, category_id, slug, alt, description, tags, seo_title, sort, created_at
  `) as { id: number }[];

  return NextResponse.json({ ok: true, work: inserted[0] }, { status: 201 });
}

// Admin: delete a portfolio work.
export async function DELETE(request: Request) {
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
  await sql`DELETE FROM portfolio_works WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
