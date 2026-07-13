"use client";

// Booking form with inline calendar + time slots. No deps, no backend:
// submit composes a structured mailto so the studio gets a ready request.
// Studio hours: Tue-Sat 11-19h -> Sundays/Mondays disabled, hourly slots.

import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Locale } from "../landing/content";

export type BookingFormLabels = {
  name: string;
  contact: string;
  type: string;
  typeConsult: string;
  typeSession: string;
  note: string;
  notePlaceholder: string;
  date: string;
  time: string;
  pickDate: string;
  closed: string;
  submit: string;
  missing: string;
  success: string;
  fallback: string;
  prevMonth: string;
  nextMonth: string;
};

const STUDIO_EMAIL = "studio@dropz.tattoo";
const SLOTS = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"] as const;
const CLOSED_WEEKDAYS = [0, 1]; // Sun, Mon
const MAX_MONTHS_AHEAD = 2;

const INTL_TAG: Record<Locale, string> = { sr: "sr-Latn-RS", en: "en-GB", de: "de-DE" };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function BookingForm({ labels, locale }: { labels: BookingFormLabels; locale: Locale }) {
  const tag = INTL_TAG[locale];
  const today = startOfDay(new Date());

  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [kind, setKind] = useState<"consult" | "session">("consult");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);

  const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(monthStart),
    [tag, monthStart],
  );

  // Mon-first weekday headers, derived from a known Monday
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(tag, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, i + 1))); // 2024-01-01 = Monday
  }, [tag]);

  const cells = useMemo(() => {
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const lead = (monthStart.getDay() + 6) % 7; // Mon=0
    const out: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
    }
    return out;
  }, [monthStart]);

  const dayDisabled = (d: Date) => d <= today || CLOSED_WEEKDAYS.includes(d.getDay());

  const pickDay = (d: Date) => {
    setSelected(d);
    setSlot(null);
    setError(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !selected || !slot) {
      setError(true);
      return;
    }
    const kindLabel = kind === "consult" ? labels.typeConsult : labels.typeSession;
    const dateLabel = new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(selected);
    const subject = `Booking — ${name.trim()} — ${isoKey(selected)} ${slot}`;
    const body = [
      `${labels.name}: ${name.trim()}`,
      `${labels.contact}: ${contact.trim()}`,
      `${labels.type}: ${kindLabel}`,
      `${labels.date}: ${dateLabel}`,
      `${labels.time}: ${slot}`,
      note.trim() ? `${labels.note}: ${note.trim()}` : "",
    ].filter(Boolean).join("\n");
    window.location.href = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setError(false);
    setSent(true);
  };

  return (
    <form className="bkf" onSubmit={submit} noValidate>
      <div className="bkf__col">
        <div className="bkf__field">
          <label htmlFor="bkf-name">{labels.name}</label>
          <input id="bkf-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="bkf__field">
          <label htmlFor="bkf-contact">{labels.contact}</label>
          <input id="bkf-contact" type="text" autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div className="bkf__field">
          <span className="bkf__label">{labels.type}</span>
          <div className="bkf__types">
            <button type="button" className="bkf__pill" aria-pressed={kind === "consult"} onClick={() => setKind("consult")}>
              {labels.typeConsult}
            </button>
            <button type="button" className="bkf__pill" aria-pressed={kind === "session"} onClick={() => setKind("session")}>
              {labels.typeSession}
            </button>
          </div>
        </div>
        <div className="bkf__field">
          <label htmlFor="bkf-note">{labels.note}</label>
          <textarea id="bkf-note" rows={4} placeholder={labels.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="bkf__col">
        <div className="bkf__field">
          <span className="bkf__label">{labels.date}</span>
          <div className="bkf__cal">
            <div className="bkf__cal-head">
              <button
                type="button"
                aria-label={labels.prevMonth}
                disabled={monthOffset === 0}
                onClick={() => setMonthOffset((v) => Math.max(0, v - 1))}
              >
                <ChevronLeft size={16} strokeWidth={1.6} />
              </button>
              <strong>{monthLabel}</strong>
              <button
                type="button"
                aria-label={labels.nextMonth}
                disabled={monthOffset >= MAX_MONTHS_AHEAD}
                onClick={() => setMonthOffset((v) => Math.min(MAX_MONTHS_AHEAD, v + 1))}
              >
                <ChevronRight size={16} strokeWidth={1.6} />
              </button>
            </div>
            <div className="bkf__cal-grid" role="grid">
              {weekdays.map((w) => (
                <span key={w} className="bkf__wd">{w}</span>
              ))}
              {cells.map((d, i) =>
                d ? (
                  <button
                    key={isoKey(d)}
                    type="button"
                    className="bkf__day"
                    disabled={dayDisabled(d)}
                    aria-pressed={selected !== null && isoKey(selected) === isoKey(d)}
                    onClick={() => pickDay(d)}
                  >
                    {d.getDate()}
                  </button>
                ) : (
                  <span key={`x${i}`} />
                ),
              )}
            </div>
            <p className="bkf__closed">{labels.closed}</p>
          </div>
        </div>
        <div className="bkf__field">
          <span className="bkf__label">{labels.time}</span>
          {selected ? (
            <div className="bkf__slots">
              {SLOTS.map((s) => (
                <button key={s} type="button" className="bkf__pill bkf__slot" aria-pressed={slot === s} onClick={() => { setSlot(s); setError(false); }}>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <p className="bkf__hint">{labels.pickDate}</p>
          )}
        </div>
      </div>

      <div className="bkf__foot">
        {error && <p className="bkf__error" role="alert">{labels.missing}</p>}
        {sent ? (
          <p className="bkf__success" role="status">
            {labels.success} {labels.fallback} <a href={`mailto:${STUDIO_EMAIL}`}>{STUDIO_EMAIL}</a>
          </p>
        ) : (
          <button type="submit" className="bkf__submit" data-magnetic>
            <span>{labels.submit}</span>
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </form>
  );
}
