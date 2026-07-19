"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  STATUS_LABEL,
  todayIso,
  fmtDate,
  monthKey,
  monthLabel,
  daysInMonth,
  leadBlanks,
  type Booking,
  type AvailabilityDay,
} from "./shared";

const FILTERS = [
  { key: "upcoming", label: "Predstojeći" },
  { key: "new", label: "Novi zahtevi" },
  { key: "all", label: "Svi" },
  { key: "canceled", label: "Otkazani" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function TerminiTab() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<FilterKey>("upcoming");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setBookings(data.bookings);
    } catch {
      setError("Ne mogu da učitam termine. Proveri konekciju sa bazom.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: number, status: Booking["status"]) => {
    const prev = bookings;
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setBookings(prev);
      setError("Izmena statusa nije sačuvana.");
    }
  };

  const today = todayIso();

  const visible = useMemo(() => {
    switch (filter) {
      case "upcoming":
        return bookings
          .filter((b) => b.date.slice(0, 10) >= today && b.status !== "canceled" && b.status !== "done")
          .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
      case "new":
        return bookings.filter((b) => b.status === "new");
      case "canceled":
        return bookings.filter((b) => b.status === "canceled");
      default:
        return bookings;
    }
  }, [bookings, filter, today]);

  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "canceled");
    return {
      today: active.filter((b) => b.date.slice(0, 10) === today && b.status !== "done").length,
      pending: bookings.filter((b) => b.status === "new").length,
      upcoming: active.filter((b) => b.date.slice(0, 10) >= today && b.status !== "done").length,
      total: bookings.length,
    };
  }, [bookings, today]);

  // ---- reschedule panel (inline per row) ----
  const [reschedId, setReschedId] = useState<number | null>(null);
  const [reschedOffset, setReschedOffset] = useState(0);
  const [reschedDays, setReschedDays] = useState<Record<string, string[]>>({});
  const [reschedDate, setReschedDate] = useState<string | null>(null);
  const [reschedSlot, setReschedSlot] = useState<string | null>(null);
  const [reschedBusy, setReschedBusy] = useState(false);
  const [reschedError, setReschedError] = useState<string | null>(null);

  const loadReschedMonth = useCallback(async (offset: number) => {
    try {
      const res = await fetch(`/api/admin/availability?month=${monthKey(offset)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      const open: Record<string, string[]> = {};
      for (const d of data.days as AvailabilityDay[]) {
        if (d.slots.length > 0) open[d.date] = d.slots;
      }
      setReschedDays(open);
    } catch {
      setReschedDays({});
    }
  }, []);

  const openResched = (id: number) => {
    setReschedId(id);
    setReschedOffset(0);
    setReschedDate(null);
    setReschedSlot(null);
    setReschedError(null);
    loadReschedMonth(0);
  };

  const closeResched = () => {
    setReschedId(null);
    setReschedDate(null);
    setReschedSlot(null);
    setReschedError(null);
  };

  const changeReschedMonth = (next: number) => {
    setReschedOffset(next);
    setReschedDate(null);
    setReschedSlot(null);
    loadReschedMonth(next);
  };

  const reschedTaken = (date: string) =>
    bookings
      .filter((b) => b.date.slice(0, 10) === date && b.status !== "canceled" && b.id !== reschedId)
      .map((b) => b.slot);

  const confirmResched = async () => {
    if (!reschedId || !reschedDate || !reschedSlot) return;
    setReschedBusy(true);
    setReschedError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reschedId, date: reschedDate, slot: reschedSlot }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setReschedError(data.code === "slot_taken" ? "Taj termin je u međuvremenu zauzet." : "Pomeranje nije uspelo.");
        return;
      }
      const movedId = reschedId;
      setBookings((bs) => bs.map((b) => (b.id === movedId ? { ...b, date: reschedDate, slot: reschedSlot } : b)));
      closeResched();
    } catch {
      setReschedError("Pomeranje nije uspelo.");
    } finally {
      setReschedBusy(false);
    }
  };

  const reschedKey = monthKey(reschedOffset);

  return (
    <>
      <div className="adm__stats">
        <div className="adm__stat"><strong>{stats.today}</strong><span>Danas</span></div>
        <div className="adm__stat"><strong>{stats.pending}</strong><span>Novi zahtevi</span></div>
        <div className="adm__stat"><strong>{stats.upcoming}</strong><span>Predstojeći</span></div>
        <div className="adm__stat"><strong>{stats.total}</strong><span>Ukupno</span></div>
      </div>

      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="adm__filter"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="adm__list">
        {loading && <p className="adm__empty">Učitavanje…</p>}
        {!loading && visible.length === 0 && <p className="adm__empty">Nema termina za ovaj filter.</p>}
        {visible.map((b) => (
          <article key={b.id} className="adm__row">
            <div className="adm__when">
              <strong>{fmtDate(b.date)}</strong>
              <span>{b.slot}</span>
            </div>
            <div className="adm__who">
              <strong>
                {b.name}
                <span className="adm__kind">{b.kind === "consult" ? "Konsultacija" : "Sesija"}</span>
              </strong>
              <a href={b.contact.includes("@") ? `mailto:${b.contact}` : `tel:${b.contact}`}>{b.contact}</a>
              {b.note && <p>{b.note}</p>}
            </div>
            <div className="adm__actions">
              <span className={`adm__status adm__status--${b.status}`}>{STATUS_LABEL[b.status]}</span>
              <div className="adm__btns">
                {b.status !== "confirmed" && b.status !== "done" && (
                  <button onClick={() => setStatus(b.id, "confirmed")}>Potvrdi</button>
                )}
                {b.status === "confirmed" && (
                  <button onClick={() => setStatus(b.id, "done")}>Završeno</button>
                )}
                {b.status !== "canceled" && (
                  <button onClick={() => setStatus(b.id, "canceled")}>Otkaži</button>
                )}
                {b.status === "canceled" && (
                  <button onClick={() => setStatus(b.id, "new")}>Vrati</button>
                )}
                {b.status !== "canceled" && (
                  <button onClick={() => (reschedId === b.id ? closeResched() : openResched(b.id))}>
                    {reschedId === b.id ? "Zatvori" : "Pomeri"}
                  </button>
                )}
              </div>
            </div>

            {reschedId === b.id && (
              <div className="adm__resched">
                <div className="adm__resched-cal">
                  <div className="adm__cal-head">
                    <button type="button" aria-label="Prethodni mesec" onClick={() => changeReschedMonth(reschedOffset - 1)}>
                      <ChevronLeft size={14} strokeWidth={1.6} />
                    </button>
                    <strong>{monthLabel(reschedKey)}</strong>
                    <button type="button" aria-label="Sledeći mesec" onClick={() => changeReschedMonth(reschedOffset + 1)}>
                      <ChevronRight size={14} strokeWidth={1.6} />
                    </button>
                  </div>
                  <div className="adm__cal-grid">
                    {Array.from({ length: leadBlanks(reschedKey) }, (_, i) => (
                      <span key={`b${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth(reschedKey) }, (_, i) => {
                      const day = i + 1;
                      const date = `${reschedKey}-${String(day).padStart(2, "0")}`;
                      const open = Boolean(reschedDays[date]);
                      return (
                        <button
                          key={date}
                          type="button"
                          className="adm__cal-day"
                          disabled={!open || date <= today}
                          aria-pressed={reschedDate === date}
                          onClick={() => {
                            setReschedDate(date);
                            setReschedSlot(null);
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {reschedDate && (
                  <div className="adm__resched-slots">
                    {(reschedDays[reschedDate] ?? []).map((s) => {
                      const taken = reschedTaken(reschedDate).includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          className="adm__chip"
                          disabled={taken}
                          aria-pressed={reschedSlot === s}
                          onClick={() => setReschedSlot(s)}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}

                {reschedError && <p className="adm__err" role="alert">{reschedError}</p>}

                <button
                  type="button"
                  className="adm__resched-confirm"
                  disabled={!reschedDate || !reschedSlot || reschedBusy}
                  onClick={confirmResched}
                >
                  Potvrdi novi termin
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
