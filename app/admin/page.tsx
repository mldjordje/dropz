"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PortfolioTab } from "./PortfolioTab";

type Booking = {
  id: number;
  name: string;
  contact: string;
  kind: "consult" | "session";
  note: string | null;
  date: string;
  slot: string;
  status: "new" | "confirmed" | "done" | "canceled";
  created_at: string;
};

type AvailabilityDay = {
  date: string;
  slots: string[];
  isOverride: boolean;
  isDefaultOpen: boolean;
};

const FILTERS = [
  { key: "upcoming", label: "Predstojeći" },
  { key: "new", label: "Novi zahtevi" },
  { key: "all", label: "Svi" },
  { key: "canceled", label: "Otkazani" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const TABS = [
  { key: "termini", label: "Termini" },
  { key: "dostupnost", label: "Dostupnost" },
  { key: "portfolio", label: "Portfolio" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_LABEL: Record<Booking["status"], string> = {
  new: "Novo",
  confirmed: "Potvrđeno",
  done: "Završeno",
  canceled: "Otkazano",
};

// Valid consultation hours, 10:00 through 20:00 (mirrors lib/availability.ts;
// duplicated here since that module is server-only and can't be imported client-side).
const HOURS = Array.from({ length: 11 }, (_, i) => `${String(10 + i).padStart(2, "0")}:00`);

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

function monthKey(offset: number) {
  const d = new Date();
  const base = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("sr-Latn-RS", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function daysInMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function leadBlanks(key: string) {
  const [y, m] = key.split("-").map(Number);
  return (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon=0
}

function fmtDayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("termini");

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

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
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
      <header className="adm__top">
        <div className="adm__brand">
          Dropz <small>ADMIN</small>
        </div>
        <button className="adm__logout" onClick={logout}>
          Odjava
        </button>
      </header>
      <main className="adm__main">
        <div className="adm__tabs">
          {TABS.map((t) => (
            <button key={t.key} className="adm__tab" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "termini" ? (
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
        ) : tab === "dostupnost" ? (
          <DostupnostTab />
        ) : (
          <PortfolioTab />
        )}
      </main>
    </>
  );
}

function DostupnostTab() {
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [addHour, setAddHour] = useState(HOURS[0]);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const key = monthKey(offset);
  const today = todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/availability?month=${key}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setDays(data.days as AvailabilityDay[]);
    } catch {
      setError("Ne mogu da učitam dostupnost.");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  const changeMonth = (next: number) => {
    setOffset(next);
    setSelected(null);
  };

  const visibleDays = useMemo(() => days.filter((d) => d.date >= today), [days, today]);
  const day = visibleDays.find((d) => d.date === selected) ?? null;

  useEffect(() => {
    if (!day) return;
    const free = HOURS.find((h) => !day.slots.includes(h));
    if (free) setAddHour(free);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.date, day?.slots.length]);

  useEffect(() => {
    if (day) editorRef.current?.scrollIntoView({ block: "start" });
  }, [day?.date]);

  const putSlots = async (date: string, slots: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slots }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      await load();
    } catch {
      setError("Izmena nije sačuvana.");
    } finally {
      setBusy(false);
    }
  };

  const revertDefault = async (date: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      await load();
    } catch {
      setError("Izmena nije sačuvana.");
    } finally {
      setBusy(false);
    }
  };

  const addSlot = () => {
    if (!day || day.slots.includes(addHour)) return;
    putSlots(day.date, [...day.slots, addHour].sort());
  };

  const removeSlot = (hour: string) => {
    if (!day) return;
    putSlots(day.date, day.slots.filter((s) => s !== hour));
  };

  const closeDay = () => {
    if (!day) return;
    putSlots(day.date, []);
  };

  return (
    <div className="adm__avail">
      <div className="adm__cal-head adm__cal-head--month">
        <button type="button" aria-label="Prethodni mesec" onClick={() => changeMonth(offset - 1)}>
          <ChevronLeft size={16} strokeWidth={1.6} />
        </button>
        <strong>{monthLabel(key)}</strong>
        <button type="button" aria-label="Sledeći mesec" onClick={() => changeMonth(offset + 1)}>
          <ChevronRight size={16} strokeWidth={1.6} />
        </button>
      </div>

      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__avail-list">
        {loading && <p className="adm__empty">Učitavanje…</p>}
        {!loading &&
          visibleDays.map((d) => (
            <button
              key={d.date}
              type="button"
              className="adm__avail-day"
              aria-pressed={selected === d.date}
              onClick={() => setSelected(d.date)}
            >
              <span className="adm__avail-date">{fmtDayLabel(d.date)}</span>
              {d.slots.length > 0 ? (
                <span className="adm__avail-slots">{d.slots.join(", ")}</span>
              ) : (
                <span className="adm__avail-slots adm__avail-slots--closed">Zatvoreno</span>
              )}
              {(d.isOverride || d.isDefaultOpen) && (
                <span className={`adm__badge ${d.isOverride ? "adm__badge--override" : "adm__badge--default"}`}>
                  {d.isOverride ? "Izmenjeno" : "Podrazumevano"}
                </span>
              )}
            </button>
          ))}
      </div>

      {day && (
        <div className="adm__editor" ref={editorRef}>
          <h3>{fmtDayLabel(day.date)}</h3>
          <div className="adm__chips">
            {day.slots.length === 0 && <span className="adm__hint">Dan je zatvoren.</span>}
            {day.slots.map((s) => (
              <span key={s} className="adm__chip">
                {s}
                <button type="button" onClick={() => removeSlot(s)} disabled={busy} aria-label={`Ukloni ${s}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="adm__hour-row">
            <select value={addHour} onChange={(e) => setAddHour(e.target.value)} disabled={busy}>
              {HOURS.filter((h) => !day.slots.includes(h)).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <button type="button" onClick={addSlot} disabled={busy || day.slots.length >= HOURS.length}>
              Dodaj sat
            </button>
          </div>
          <div className="adm__editor-actions">
            <button type="button" onClick={closeDay} disabled={busy || day.slots.length === 0}>
              Zatvori dan
            </button>
            {day.isOverride && (
              <button type="button" onClick={() => revertDefault(day.date)} disabled={busy}>
                Vrati na podrazumevano
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
