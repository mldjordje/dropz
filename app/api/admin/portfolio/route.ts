import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isValidImageUrl } from "@/lib/portfolio";

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

  const sql = getSql();
  if (categoryId !== null) {
    const found = (await sql`SELECT id FROM portfolio_categories WHERE id = ${categoryId}`) as { id: number }[];
    if (found.length === 0) {
      return NextResponse.json({ ok: false, message: "Kategorija ne postoji" }, { status: 400 });
    }
  }

  const inserted = (await sql`
    INSERT INTO portfolio_works (title, image_url, category_id)
    VALUES (${title}, ${imageUrl}, ${categoryId})
    RETURNING id, title, image_url, category_id, sort, created_at
  `) as { id: number; title: string; image_url: string; category_id: number | null; sort: number; created_at: string }[];

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
