import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RouteChrome } from "@/components/layout/RouteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PublicInquiryForm } from "@/components/inquiry/PublicInquiryForm";

export const metadata: Metadata = {
  title: "Upit za tattoo",
  description:
    "Već znaš šta želiš? Pošalji opis, referencu i poziciju tetovaže — Dropz Tattoo studio u Nišu vraća procenu cene i trajanja, pa biraš termin.",
  alternates: { canonical: "/upit" },
};

const STEPS = [
  { title: "Pošalješ ideju", body: "Bez naloga — opiši motiv, mesto, veličinu i ostavi kontakt." },
  { title: "Stigne odgovor", body: "Studio pregleda ideju i javlja sledeći korak, obično u roku od 24h." },
  { title: "Dogovorimo termin", body: "Kad usaglasimo obim i cenu, zajedno biramo odgovarajući termin." },
];

// This is the path for people who already know what they want tattooed — no
// calendar here (that only appears once the studio sends and the client accepts
// the estimate); the
// free-slot consultation calendar lives at /booking for people who don't.
export default function InquiryPage() {
  return (
    <main className="route-shell upit-shell">
      <RouteChrome />
      <Link className="route-back" href="/"><ArrowLeft /> Nazad</Link>
      <div className="route-index">02 / Upit</div>
      <h1>Ideja je<br />dovoljan početak.</h1>
      <p>
        Opiši tetovažu koju želiš — motiv, veličinu, deo tela i reference. Ne treba ti
        nalog i nema obaveze. Studio se javlja sa sledećim korakom, obično u roku od 24h.
      </p>

      <PublicInquiryForm />

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

      <p className="upit__alt">
        Želiš prvo kratak razgovor uživo? Besplatna konsultacija ne traži prijavu —{" "}
        <Link href="/booking">zakaži termin ovde</Link>.
      </p>
      <SiteFooter />
    </main>
  );
}
