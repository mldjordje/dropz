import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSql } from "@/lib/db";
import { isValidImageUrl, slugify } from "@/lib/portfolio";

// Portfolio pages are ISR-cached; regenerate them as soon as the admin
// changes anything so edits show up immediately instead of after 5 min.
function revalidatePortfolio() {
  revalidatePath("/portfolio");
  revalidatePath("/portfolio/[slug]", "page");
  revalidatePath("/");
}

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

  revalidatePortfolio();
  return NextResponse.json({ ok: true, work: inserted[0] }, { status: 201 });
}

// Admin: edit a portfolio work. Any subset of fields:
// { id, title?, image_url?, category_id?, alt?, description?, tags?, seo_title?, featured?, sort? }
export async function PATCH(request: Request) {
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
  const existing = (await sql`
    SELECT id, title, image_url, category_id, alt, description, tags, seo_title, featured, sort
    FROM portfolio_works WHERE id = ${id}
  `) as {
    id: number; title: string; image_url: string; category_id: number | null;
    alt: string | null; description: string | null; tags: string[]; seo_title: string | null;
    featured: boolean; sort: number;
  }[];
  if (existing.length === 0) {
    return NextResponse.json({ ok: false, message: "Rad nije nađen" }, { status: 404 });
  }
  const cur = existing[0];

  let title = cur.title;
  if (body.title !== undefined) {
    title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    if (!title) return NextResponse.json({ ok: false, message: "Naslov je obavezan" }, { status: 400 });
  }

  let imageUrl = cur.image_url;
  if (body.image_url !== undefined) {
    if (!isValidImageUrl(body.image_url)) {
      return NextResponse.json({ ok: false, message: "Neispravan URL slike" }, { status: 400 });
    }
    imageUrl = body.image_url;
  }

  let categoryId = cur.category_id;
  if (body.category_id !== undefined) {
    if (body.category_id === null || body.category_id === "") {
      categoryId = null;
    } else {
      categoryId = Number(body.category_id);
      if (!Number.isInteger(categoryId)) {
        return NextResponse.json({ ok: false, message: "Neispravna kategorija" }, { status: 400 });
      }
      const found = (await sql`SELECT id FROM portfolio_categories WHERE id = ${categoryId}`) as { id: number }[];
      if (found.length === 0) {
        return NextResponse.json({ ok: false, message: "Kategorija ne postoji" }, { status: 400 });
      }
    }
  }

  const alt = body.alt !== undefined
    ? (typeof body.alt === "string" ? body.alt.trim().slice(0, 200) || null : null)
    : cur.alt;
  const description = body.description !== undefined
    ? (typeof body.description === "string" ? body.description.trim().slice(0, 1000) || null : null)
    : cur.description;
  const seoTitle = body.seo_title !== undefined
    ? (typeof body.seo_title === "string" ? body.seo_title.trim().slice(0, 80) || null : null)
    : cur.seo_title;
  const tags = body.tags !== undefined
    ? (Array.isArray(body.tags)
        ? body.tags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 10)
        : [])
    : cur.tags;
  const featured = typeof body.featured === "boolean" ? body.featured : cur.featured;
  const sort = body.sort !== undefined && Number.isInteger(Number(body.sort)) ? Number(body.sort) : cur.sort;

  await sql`
    UPDATE portfolio_works
    SET title = ${title}, image_url = ${imageUrl}, category_id = ${categoryId},
        alt = ${alt}, description = ${description}, tags = ${tags}, seo_title = ${seoTitle},
        featured = ${featured}, sort = ${sort}
    WHERE id = ${id}
  `;
  revalidatePortfolio();
  return NextResponse.json({ ok: true });
}

// Admin: reorder works. { ids: number[] } — sort becomes the array index.
export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.some((v) => !Number.isInteger(Number(v)))) {
    return NextResponse.json({ ok: false, message: "ids must be an integer array" }, { status: 400 });
  }
  const ids = body.ids.map(Number);

  const sql = getSql();
  await sql`
    UPDATE portfolio_works AS w
    SET sort = x.ord
    FROM (SELECT UNNEST(${ids}::int[]) AS id, GENERATE_SERIES(0, ${ids.length - 1}) AS ord) AS x
    WHERE w.id = x.id
  `;
  revalidatePortfolio();
  return NextResponse.json({ ok: true });
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
  revalidatePortfolio();
  return NextResponse.json({ ok: true });
}
