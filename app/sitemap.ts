import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getSql } from "@/lib/db";

// Public, indexable routes only. /admin and /api are disallowed in robots.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/booking`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/edukacija`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/aftercare`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/portfolio`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/artisti`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/upit`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Per-work portfolio pages; skip silently if the DB is unreachable at build time.
  try {
    const sql = getSql();
    const works = (await sql`
      SELECT slug, created_at FROM portfolio_works WHERE slug IS NOT NULL ORDER BY created_at DESC
    `) as { slug: string; created_at: string }[];
    const artists = (await sql`
      SELECT slug, created_at FROM staff WHERE active AND slug IS NOT NULL ORDER BY created_at DESC
    `) as { slug: string; created_at: string }[];
    return [
      ...staticRoutes,
      ...works.map((w) => ({
        url: `${SITE.url}/portfolio/${w.slug}`,
        lastModified: new Date(w.created_at),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...artists.map((artist) => ({
        url: `${SITE.url}/artisti/${artist.slug}`,
        lastModified: new Date(artist.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
