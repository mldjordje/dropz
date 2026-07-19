import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSql } from "@/lib/db";
import type { PortfolioWork } from "@/lib/portfolio";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function getWork(slug: string): Promise<(PortfolioWork & { category_name: string | null }) | null> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT w.id, w.title, w.image_url, w.category_id, w.slug, w.alt, w.description,
             w.tags, w.seo_title, w.sort, w.created_at, c.name AS category_name
      FROM portfolio_works w
      LEFT JOIN portfolio_categories c ON c.id = w.category_id
      WHERE w.slug = ${slug}
    `) as (PortfolioWork & { category_name: string | null })[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWork(slug);
  if (!work) return { title: "Rad nije pronađen" };

  const title = work.seo_title ?? `${work.title} — ${SITE.shortName}`;
  const description = work.description ?? `${work.title} — autorski tattoo rad studija ${SITE.name}, ${SITE.city}.`;
  const url = `${SITE.url}/portfolio/${work.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: work.tags,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: work.image_url, alt: work.alt ?? work.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [work.image_url] },
  };
}

export default async function PortfolioWorkPage({ params }: Props) {
  const { slug } = await params;
  const work = await getWork(slug);
  if (!work) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: work.image_url,
    name: work.seo_title ?? work.title,
    description: work.description ?? undefined,
    keywords: work.tags.length > 0 ? work.tags.join(", ") : undefined,
    datePublished: work.created_at,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    copyrightHolder: { "@type": "Organization", name: SITE.name },
  };

  return (
    <main className="pf-work">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pf-work__inner">
        <Link href="/portfolio" className="pf-work__back">← Portfolio</Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={work.image_url} alt={work.alt ?? work.title} className="pf-work__img" />
        <h1>{work.title}</h1>
        {work.category_name && <p className="pf-work__cat">{work.category_name}</p>}
        {work.description && <p className="pf-work__desc">{work.description}</p>}
        {work.tags.length > 0 && (
          <ul className="pf-work__tags">
            {work.tags.map((t) => (
              <li key={t}>#{t}</li>
            ))}
          </ul>
        )}
        <Link href="/booking" className="pf-work__cta">Zakaži termin</Link>
      </div>
    </main>
  );
}
