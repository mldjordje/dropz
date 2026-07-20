import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { RouteChrome } from "@/components/layout/RouteChrome";

export const metadata: Metadata = {
  title: "Upit za tattoo",
  description:
    "Već znaš šta želiš? Pošalji opis, referencu i poziciju tetovaže — Dropz Tattoo studio u Nišu vraća procenu cene i trajanja, pa biraš termin.",
  alternates: { canonical: "/upit" },
};

const STEPS = [
  { title: "Pošalješ upit", body: "Opis tetovaže, veličina, deo tela, budžet i reference — sve iz svog naloga." },
  { title: "Stigne procena", body: "Artist odgovara kroz aplikaciju: cena i koliko sesija/sati je potrebno." },
  { title: "Biraš termin", body: "Kad procena stigne, otvara ti se kalendar sa slobodnim blokovima baš za to trajanje." },
  { title: "Potvrda", body: "Admin potvrđuje izabrani termin i vidimo se u studiju." },
];

// This is the path for people who already know what they want tattooed — no
// calendar here (that only appears once the artist quotes the request); the
// free-slot consultation calendar lives at /booking for people who don't.
export default function InquiryPage() {
  return (
    <main className="route-shell">
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">02 / Upit</div>
      <h1>Ideja je<br />dovoljan početak.</h1>
      <p>
        Opiši tetovažu koju želiš — motiv, veličinu, deo tela i reference. Artist se javlja
        sa procenom cene i trajanja, a termin biraš tek kad procena stigne.
      </p>

      <ol className="bkc__steps upit__steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <em>{String(i + 1).padStart(2, "0")}</em>
            <div>
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </div>
          </li>
        ))}
      </ol>

      <Link className="route-contact" href="/nalog">
        Nastavi — pošalji upit <ArrowUpRight />
      </Link>
      <p className="bkf__hint">
        Za upit je potrebna prijava (Google nalog) — tako pratiš procenu i termine na jednom mestu.
      </p>
      <p className="upit__alt">
        Radije da ne praviš nalog? Besplatna konsultacija uživo u studiju ne traži prijavu —{" "}
        <Link href="/booking">zakaži termin ovde</Link>.
      </p>
    </main>
  );
}
