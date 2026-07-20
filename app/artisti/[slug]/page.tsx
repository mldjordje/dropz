import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { getSql } from "@/lib/db";
import { getStaffBySlug } from "@/lib/staff";
import { SITE } from "@/lib/site";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };
type Work = { id: number; title: string; image_url: string; alt: string | null };

async function loadArtist(slug: string) {
  try {
    const sql = getSql();
    const artist = await getStaffBySlug(sql, slug);
    if (!artist) return null;
    const works = (await sql`
      SELECT id, title, image_url, alt FROM portfolio_works
      WHERE artist_id = ${artist.id} ORDER BY sort ASC, created_at DESC
    `) as Work[];
    return { artist, works };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArtist(slug);
  if (!data) return { title: "Artist nije pronađen" };
  const title = `${data.artist.name} — tattoo artist`;
  const description = `Radovi tattoo artista ${data.artist.name} u studiju ${SITE.name}.`;
  return { title, description, alternates: { canonical: `/artisti/${slug}` } };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtist(slug);
  if (!data) notFound();
  const { artist, works } = data;

  return (
    <main className="route-shell artist-page">
      <RouteChrome />
      <Link className="route-back" href="/artisti"><ArrowLeft /> Svi artisti</Link>
      <header className="artist-hero">
        <span className="artist-hero__avatar">
          {artist.avatar_url ? <img src={artist.avatar_url} alt={artist.name} /> : artist.name.charAt(0)}
        </span>
        <div>
          <div className="route-index">{artist.role === "owner" ? "Head artist" : "Tattoo artist"}</div>
          <h1>{artist.name}</h1>
        </div>
      </header>
      <Link className="route-contact artist-page__cta" href={`/nalog?novi=1&artist=${artist.id}`}>
        Pošalji upit ovom artistu <ArrowUpRight />
      </Link>
      {works.length ? (
        <div className="artist-works">
          {works.map((work) => (
            <figure key={work.id}>
              <img src={work.image_url} alt={work.alt ?? work.title} loading="lazy" />
              <figcaption>{work.title}</figcaption>
            </figure>
          ))}
        </div>
      ) : <p className="artist-page__empty">Portfolio ovog artista uskoro stiže.</p>}
    </main>
  );
}
