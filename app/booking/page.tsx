import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BookingChoice } from "@/components/booking/BookingChoice";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { copy } from "@/components/landing/content";

export const metadata: Metadata = {
  title: "Rezervacija termina",
  description:
    "Rezerviši termin za besplatnu tattoo konsultaciju u Dropz Tattoo studiju u Nišu. Izaberi datum i vreme online.",
  alternates: { canonical: "/booking" },
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string }>;
}) {
  const t = copy.sr;
  const { artist } = await searchParams;
  // ?artist=<id> (from an artist's profile) pre-opens the consult calendar on
  // that artist and shows their real availability.
  const preselectArtist = artist && /^\d+$/.test(artist) ? Number(artist) : null;
  return (
    <main className="route-shell">
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">{t.bookingIndex}</div>
      <h1>Rezerviši<br />svoje mesto.</h1>
      <p>{t.bookingBody}</p>
      <div className="route-booking">
        <BookingChoice labels={t.bookingForm} locale="sr" preselectArtist={preselectArtist} />
      </div>
      <SiteFooter />
    </main>
  );
}
