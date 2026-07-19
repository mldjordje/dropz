"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Inbox, Images, SlidersHorizontal } from "lucide-react";

type TodayItem = {
  id: string;
  time: string;
  endTime: string | null;
  label: string;
  type: "consult" | "tattoo" | "manual";
  status: string;
};

type Summary = {
  counts: { bookingsNew: number; requestsPending: number; week: number; today: number };
  today: TodayItem[];
};

const TYPE_LABEL: Record<TodayItem["type"], string> = {
  consult: "Konsultacija",
  tattoo: "Tetoviranje",
  manual: "Ručno",
};

export function DashboardHome() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/summary", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.ok) setSummary({ counts: data.counts, today: data.today });
        else setError("Ne mogu da učitam pregled.");
      })
      .catch(() => {
        if (alive) setError("Ne mogu da učitam pregled.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const dateLabel = new Intl.DateTimeFormat("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="adm__dash">
      <p className="adm__dash-date">{dateLabel}</p>

      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__stats">
        <div className="adm__stat">
          <strong>{summary ? summary.counts.today : "–"}</strong>
          <span>Danas termina</span>
        </div>
        <div className="adm__stat">
          <strong>{summary ? summary.counts.bookingsNew : "–"}</strong>
          <span>Novi termini</span>
        </div>
        <div className="adm__stat">
          <strong>{summary ? summary.counts.requestsPending : "–"}</strong>
          <span>Tattoo zahtevi</span>
        </div>
        <div className="adm__stat">
          <strong>{summary ? summary.counts.week : "–"}</strong>
          <span>Ova nedelja</span>
        </div>
      </div>

      <section className="adm__dash-section">
        <h3>Danas</h3>
        {!summary && !error && <p className="adm__empty">Učitavanje…</p>}
        {summary && summary.today.length === 0 && <p className="adm__empty">Nema termina danas.</p>}
        {summary && summary.today.length > 0 && (
          <div className="adm__list">
            {summary.today.map((t) => (
              <article key={t.id} className="adm__row adm__row--dash">
                <div className="adm__when">
                  <strong>{t.time}</strong>
                  {t.endTime && <span>do {t.endTime}</span>}
                </div>
                <div className="adm__who">
                  <strong>
                    {t.label}
                    <span className="adm__kind">{TYPE_LABEL[t.type]}</span>
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="adm__dash-section">
        <h3>Brze akcije</h3>
        <div className="adm__quick">
          <Link href="/admin/kalendar" className="adm__quick-btn">
            <CalendarDays size={16} strokeWidth={1.6} /> Novi termin
          </Link>
          <Link href="/admin/dostupnost" className="adm__quick-btn">
            <SlidersHorizontal size={16} strokeWidth={1.6} /> Blokiraj dan
          </Link>
          <Link href="/admin/zahtevi" className="adm__quick-btn">
            <Inbox size={16} strokeWidth={1.6} /> Odgovori na zahteve
          </Link>
          <Link href="/admin/portfolio" className="adm__quick-btn">
            <Images size={16} strokeWidth={1.6} /> Dodaj rad
          </Link>
        </div>
      </section>
    </div>
  );
}
