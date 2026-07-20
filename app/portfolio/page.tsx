import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSql } from "@/lib/db";
import type { PortfolioCategory, PortfolioWork } from "@/lib/portfolio";
import { PortfolioGallery } from "@/components/portfolio/PortfolioGallery";
import { RouteChrome } from "@/components/layout/RouteChrome";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Radovi Dropz Tattoo studija u Nišu — autorske tetovaže po stilovima.",
  alternates: { canonical: "/portfolio" },
};

export const revalidate = 300;

async function loadPortfolio() {
  try {
    const sql = getSql();
    const [categories, works] = await Promise.all([
      sql`SELECT id, name, slug FROM portfolio_categories ORDER BY sort ASC, created_at DESC`,
      sql`SELECT id, title, image_url, category_id, alt FROM portfolio_works ORDER BY sort ASC, created_at DESC`,
    ]);
    return {
      categories: categories as Pick<PortfolioCategory, "id" | "name" | "slug">[],
      works: works as Pick<PortfolioWork, "id" | "title" | "image_url" | "category_id" | "alt">[],
    };
  } catch {
    return { categories: [], works: [] };
  }
}

export default async function PortfolioPage() {
  const { categories, works } = await loadPortfolio();

  return (
    <main className="route-shell">
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">Portfolio</div>
      <h1>Radovi<br />studija.</h1>
      <p>Izbor autorskih radova po stilovima. Za termin ili procenu — pošalji zahtev preko naloga.</p>
      <Link className="route-contact portfolio-artists-link" href="/artisti">Upoznaj artiste</Link>
      <PortfolioGallery categories={categories} works={works} />
    </main>
  );
}
