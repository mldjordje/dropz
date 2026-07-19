import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSql } from "@/lib/db";
import { slugify } from "@/lib/portfolio";

// Admin: create a portfolio category (tattoo style). Auth is enforced by
// middleware.ts for the /api/admin/:path* matcher — no check needed here.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) {
    return NextResponse.json({ ok: false, message: "Naziv je obavezan" }, { status: 400 });
  }
  const slug = slugify(name);

  const sql = getSql();
  try {
    const inserted = (await sql`
      INSERT INTO portfolio_categories (name, slug)
      VALUES (${name}, ${slug})
      RETURNING id, name, slug, sort, created_at
    `) as { id: number; name: string; slug: string; sort: number; created_at: string }[];
    revalidatePath("/portfolio");
    return NextResponse.json({ ok: true, category: inserted[0] }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "23505") {
      return NextResponse.json(
        { ok: false, message: "Stil sa tim nazivom vec postoji." },
        { status: 409 },
      );
    }
    throw err;
  }
}

// Admin: delete a category. Works keep existing (category_id -> NULL via
// ON DELETE SET NULL); the admin/public UI treats null as "uncategorized".
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
  await sql`DELETE FROM portfolio_categories WHERE id = ${id}`;
  revalidatePath("/portfolio");
  return NextResponse.json({ ok: true });
}
