import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import type { PortfolioCategory, PortfolioWork } from "@/lib/portfolio";

// Public: categories + works for the landing portfolio section. Never throws
// past this point — if the DB isn't reachable (e.g. DATABASE_URL not yet
// configured) the client falls back to the static gallery, so we just report
// ok:false instead of a hard 500.
export async function GET() {
  try {
    const sql = getSql();
    const [categoriesResult, worksResult] = await Promise.all([
      sql`SELECT id, name, slug FROM portfolio_categories ORDER BY sort ASC, created_at DESC`,
      sql`SELECT id, title, image_url, category_id, slug, alt FROM portfolio_works ORDER BY sort ASC, created_at DESC`,
    ]);
    const categories = categoriesResult as Pick<PortfolioCategory, "id" | "name" | "slug">[];
    const works = worksResult as Pick<PortfolioWork, "id" | "title" | "image_url" | "category_id" | "slug" | "alt">[];
    return NextResponse.json({ ok: true, categories, works });
  } catch {
    return NextResponse.json({ ok: false, categories: [], works: [] });
  }
}
