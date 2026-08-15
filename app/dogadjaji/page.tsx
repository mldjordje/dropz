import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { getSql } from "@/lib/db";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Događaji",
  description: "Predstojeći i održani događaji Dropz Tattoo studija u Nišu — gostovanja, pop-up sesije i konvencije.",
  alternates: { canonical: "/dogadjaji" },
};

export const revalidate = 300;

type EventRow = {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  event_date: string;
  location: string | null;
};

async function loadEvents() {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, title, body, image_url, event_date::text AS event_date, location
      FROM events ORDER BY event_date DESC, sort ASC
    `) as EventRow[];
    return rows;
  } catch {
    return [];
  }
}

function fmtEventDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function EventCard({ event }: { event: EventRow }) {
  return (
    <article className="evt__card">
      {event.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- studio-hosted or external event photo
        <img src={event.image_url} alt={event.title} className="evt__img" loading="lazy" />
      )}
      <div className="evt__body">
        <span className="evt__date">{fmtEventDate(event.event_date)}</span>
        <h3>{event.title}</h3>
        {event.location && (
          <span className="evt__loc"><MapPin size={13} strokeWidth={1.6} /> {event.location}</span>
        )}
        {event.body && <p>{event.body}</p>}
      </div>
    </article>
  );
}

export default async function DogadjajiPage() {
  const events = await loadEvents();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const upcoming = events.filter((e) => e.event_date >= todayIso).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = events.filter((e) => e.event_date < todayIso);

  return (
    <main className="route-shell">
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">Događaji</div>
      <h1>Šta se<br />dešava.</h1>
      <p>Gostovanja, pop-up sesije i konvencije — predstojeći i održani događaji studija.</p>

      <section className="evt__section">
        <h2>Predstojeći</h2>
        {upcoming.length === 0 ? (
          <p className="evt__empty">Trenutno nema zakazanih događaja — prati Instagram za najave.</p>
        ) : (
          <div className="evt__grid">
            {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="evt__section">
          <h2>Održani</h2>
          <div className="evt__grid">
            {past.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
