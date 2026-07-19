"use client";

// /booking entry: the visitor first picks what they want —
//  - free consultation -> inline calendar with the admin's consult slots
//  - tattoo inquiry    -> no calendar; explains the quote flow and sends the
//    visitor to their account, where the request form lives. The calendar for
//    a request only appears after the admin quotes it (price + duration).
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, MessageSquareText } from "lucide-react";
import { BookingForm, type BookingFormLabels } from "@/components/booking/BookingForm";
import type { Locale } from "@/components/landing/content";

type Mode = "consult" | "inquiry";

const INQUIRY_STEPS = [
  { title: "Pošalješ upit", body: "Opis tetovaže, veličina, deo tela, budžet i reference — sve iz svog naloga." },
  { title: "Stigne procena", body: "Artist odgovara kroz aplikaciju: cena i koliko sesija/sati je potrebno." },
  { title: "Biraš termin", body: "Kad procena stigne, otvara ti se kalendar sa slobodnim blokovima baš za to trajanje." },
  { title: "Potvrda", body: "Admin potvrđuje izabrani termin i vidimo se u studiju." },
];

export function BookingChoice({ labels, locale }: { labels: BookingFormLabels; locale: Locale }) {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <div className="bkc">
      <div className="bkc__modes" role="group" aria-label="Vrsta rezervacije">
        <button
          type="button"
          className="bkc__mode"
          aria-pressed={mode === "consult"}
          onClick={() => setMode("consult")}
        >
          <CalendarCheck size={20} strokeWidth={1.5} />
          <strong>Besplatna konsultacija</strong>
          <span>Uživo u studiju — izaberi slobodan termin u kalendaru.</span>
        </button>
        <button
          type="button"
          className="bkc__mode"
          aria-pressed={mode === "inquiry"}
          onClick={() => setMode("inquiry")}
        >
          <MessageSquareText size={20} strokeWidth={1.5} />
          <strong>Pošalji upit</strong>
          <span>Opiši tetovažu i dobij procenu cene i trajanja — termin biraš tek posle procene.</span>
        </button>
      </div>

      {mode === "consult" && (
        <div className="bkc__panel">
          <BookingForm labels={labels} locale={locale} />
        </div>
      )}

      {mode === "inquiry" && (
        <div className="bkc__panel bkc__inquiry">
          <ol className="bkc__steps">
            {INQUIRY_STEPS.map((s, i) => (
              <li key={s.title}>
                <em>{String(i + 1).padStart(2, "0")}</em>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.body}</span>
                </div>
              </li>
            ))}
          </ol>
          <Link className="bkf__submit bkc__cta" href="/nalog">
            <span>Nastavi — pošalji upit</span>
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </Link>
          <p className="bkf__hint">Za upit je potrebna prijava (Google nalog) — tako pratiš procenu i termine na jednom mestu.</p>
        </div>
      )}
    </div>
  );
}
