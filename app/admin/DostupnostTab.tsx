"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HOURS, monthKey, monthLabel, todayIso, fmtDayLabel, type AvailabilityDay } from "./shared";

export function DostupnostTab() {
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
