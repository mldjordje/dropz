import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BookingForm } from "@/components/booking/BookingForm";
import { copy } from "@/components/landing/content";

export const metadata: Metadata = {
  title: "Rezervacija termina",
  description:
    "Rezerviši termin za besplatnu tattoo konsultaciju u Dropz Tattoo studiju u Nišu. Izaberi datum i vreme online.",
  alternates: { canonical: "/booking" },
};

export default function BookingPage() {
  const t = copy.sr;
  return (
    <main className="route-shell">
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">{t.bookingIndex}</div>
      <h1>Rezerviši<br />svoje mesto.</h1>
      <p>{t.bookingBody}</p>
      <div className="route-booking">
        <BookingForm labels={t.bookingForm} locale="sr" />
      </div>
    </main>
  );
}
