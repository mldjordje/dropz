import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { getSql } from "@/lib/db";
import { getActiveArtists, type StaffMember } from "@/lib/staff";

export const metadata: Metadata = {
  title: "Tattoo artisti",
  description: "Upoznaj Dropz tattoo artiste i pogledaj njihove radove.",
  alternates: { canonical: "/artisti" },
};

export const revalidate = 300;

async function loadArtists(): Promise<(StaffMember & { works_count: number })[]> {
  try {
    const sql = getSql();
    const artists = await getActiveArtists(sql);
    const counts = (await sql`
      SELECT artist_id, count(*)::int AS works_count
      FROM portfolio_works WHERE artist_id IS NOT NULL GROUP BY artist_id
    `) as { artist_id: number; works_count: number }[];
    const byId = new Map(counts.map((row) => [row.artist_id, row.works_count]));
    return artists.filter((artist) => artist.slug).map((artist) => ({
      ...artist,
      works_count: byId.get(artist.id) ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function ArtistsPage() {
  const artists = await loadArtists();
  return (
    <main className="route-shell artists-page">
      <RouteChrome />
      <Link className="route-back" href="/portfolio"><ArrowLeft /> Portfolio</Link>
      <div className="route-index">Artisti</div>
      <h1>Ljudi iza<br />radova.</h1>
      <p>Izaberi artista, pogledaj njegov portfolio i pošalji upit direktno njemu.</p>
      <div className="artists-grid">
        {artists.map((artist) => (
          <Link key={artist.id} href={`/artisti/${artist.slug}`} className="artist-card">
            <span className="artist-card__avatar">
              {artist.avatar_url ? <img src={artist.avatar_url} alt="" /> : artist.name.charAt(0)}
            </span>
            <span className="artist-card__copy">
              <strong>{artist.name}</strong>
              <small>{artist.role === "owner" ? "Head artist" : "Tattoo artist"} · {artist.works_count} radova</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        ))}
      </div>
    </main>
  );
}
