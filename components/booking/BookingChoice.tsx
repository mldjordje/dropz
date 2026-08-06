"use client";

// /booking entry: the visitor first picks what they want —
//  - free consultation -> inline calendar with the admin's consult slots
//  - tattoo inquiry    -> no calendar; explains the quote flow and sends the
//    visitor to their account, where the request form lives. The calendar for
//    a request only appears after the admin quotes it (price + duration).
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, MessageSquareText } from "lucide-react";
import { track } from "@vercel/analytics/react";
import { BookingForm, type BookingFormLabels } from "@/components/booking/BookingForm";
import type { Locale } from "@/components/landing/content";

type Mode = "consult" | "inquiry";

const INQUIRY_STEPS = [
  { title: "Pošalješ ideju", body: "Kratka forma, bez naloga i bez obaveze." },
  { title: "Stigne odgovor", body: "Studio pregleda detalje i javlja sledeći korak, obično u roku od 24h." },
  { title: "Dogovorimo termin", body: "Termin biraš tek nakon dogovora o obimu i ceni." },
];

export function BookingChoice({
  labels,
  locale,
  initialMode = null,
}: {
  labels: BookingFormLabels;
  locale: Locale;
  /** "consult" pre-opens the calendar (used on the landing, so the hero CTA
   * still lands on something actionable while the inquiry tab stays visible). */
  initialMode?: Mode | null;
}) {
  const [mode, setMode] = useState<Mode | null>(initialMode);

  return (
    <div className="bkc">
      <div className="bkc__modes" role="group" aria-label="Vrsta rezervacije">
        <button
          type="button"
          className="bkc__mode"
          aria-pressed={mode === "consult"}
          onClick={() => {
            setMode("consult");
            track("booking_mode_select", { mode: "consult" });
          }}
        >
          <CalendarCheck size={20} strokeWidth={1.5} />
          <strong>Besplatna konsultacija</strong>
          <span>Uživo u studiju — izaberi slobodan termin u kalendaru.</span>
        </button>
        <button
          type="button"
          className="bkc__mode"
          aria-pressed={mode === "inquiry"}
          onClick={() => {
            setMode("inquiry");
            track("booking_mode_select", { mode: "inquiry" });
          }}
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
          <Link
            className="bkf__submit bkc__cta"
            href="/upit"
            onClick={() => track("inquiry_cta_click", { placement: "booking_choice" })}
          >
            <span>Pošalji ideju bez naloga</span>
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </Link>
          <p className="bkf__hint">Forma traje oko 2 minuta. Slanje upita ne rezerviše termin i nemaš obavezu.</p>
        </div>
      )}
    </div>
  );
}
