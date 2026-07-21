"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, RotateCcw } from "lucide-react";

// Artist availability as a MONTH CALENDAR (same mental model as the booking
// calendar) — every day shows its effective hours at a glance; tap a day to
// change just that date. The recurring pattern lives in a collapsible weekly
// template. Native time pickers + one-tap presets keep it usable on a phone.
//
// Staff edit their own schedule (no staffId). The owner edits any artist's by
// passing staffId — the working-hours / day-overrides APIs already scope by it.

type WorkingHoursRow = {
  weekday: number; // 0 = Monday ... 6 = Sunday
  open_time: string | null;
  close_time: string | null;
};

type Override = {
  date: string;
  open_time: string | null;
  close_time: string | null;
};

const WEEKDAY_LABELS = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];
const WEEKDAY_SHORT = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

// One-tap common shifts.
const PRESETS: readonly [string, string][] = [
  ["10:00", "20:00"],
  ["12:00", "18:00"],
  ["09:00", "17:00"],
  ["14:00", "22:00"],
];

const MAX_MONTHS_AHEAD = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekdayIndex(date: string) {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7; // Mon=0
}

const MONTH_FMT = new Intl.DateTimeFormat("sr-Latn-RS", { month: "long", year: "numeric" });
const DAY_FMT = new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "long", day: "numeric", month: "long" });

function fmtDay(iso: string) {
  return DAY_FMT.format(new Date(`${iso}T12:00:00`));
}

export function StaffScheduleTab({ staffId, artistName }: { staffId?: number; artistName?: string } = {}) {
  const [hours, setHours] = useState<WorkingHoursRow[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  // Inline day editor (opens under the calendar)
  const [selected, setSelected] = useState<string | null>(null);
  const [eOpen, setEOpen] = useState("10:00");
  const [eClose, setEClose] = useState("20:00");

  const staffQuery = staffId ? `&staffId=${staffId}` : "";
  const withStaff = useCallback(
    (payload: Record<string, unknown>) => (staffId ? { ...payload, staffId } : payload),
    [staffId],
  );

  const today = todayIso();
  const base = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const monthKey = `${base.getFullYear()}-${pad(base.getMonth() + 1)}`;
  const monthLabel = MONTH_FMT.format(base);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const monthFirst = `${monthKey}-01`;
  const monthLast = `${monthKey}-${pad(daysInMonth)}`;

  const loadWeekly = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/working-hours?_=${Date.now()}${staffQuery}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setHours(data.hours);
    } catch {
      setError("Ne mogu da učitam raspored.");
    }
  }, [staffQuery]);

  const loadMonth = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/day-overrides?from=${monthFirst}&to=${monthLast}${staffQuery}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) setOverrides(data.overrides);
    } catch {
      setError("Ne mogu da učitam izmene.");
    }
  }, [monthFirst, monthLast, staffQuery]);

  useEffect(() => {
    loadWeekly();
  }, [loadWeekly]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  // Effective open window per date: an override wins, else the weekly row.
  const overrideMap = useMemo(() => new Map(overrides.map((o) => [o.date, o])), [overrides]);
  const effectiveHours = useCallback(
    (iso: string): { open: string | null; close: string | null; isOverride: boolean } => {
      const ovr = overrideMap.get(iso);
      if (ovr) return { open: ovr.open_time, close: ovr.close_time, isOverride: true };
      const wh = hours.find((h) => h.weekday === weekdayIndex(iso));
      return { open: wh?.open_time ?? null, close: wh?.close_time ?? null, isOverride: false };
    },
    [overrideMap, hours],
  );

  // Calendar cells, Monday-first, with leading blanks for alignment.
  const cells = useMemo(() => {
    const lead = weekdayIndex(monthFirst); // Mon=0
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(`${monthKey}-${pad(day)}`);
    }
    return out;
  }, [monthKey, monthFirst, daysInMonth]);

  const changeMonth = (next: number) => {
    setMonthOffset(next);
    setSelected(null);
  };

  const openDay = (iso: string) => {
    const eff = effectiveHours(iso);
    setSelected((v) => (v === iso ? null : iso));
    setEOpen(eff.open ?? "10:00");
    setEClose(eff.close ?? "20:00");
  };

  // --- Weekly template mutations (optimistic, reload on failure) ---
  const putHours = async (weekday: number, open: string | null, close: string | null) => {
    if (open && close && open >= close) {
      setError("Početak mora biti pre kraja.");
      return;
    }
    setBusy(true);
    setError(null);
    setHours((prev) => {
      const next = prev.filter((h) => h.weekday !== weekday);
      next.push({ weekday, open_time: open, close_time: close });
      return next.sort((a, b) => a.weekday - b.weekday);
    });
    try {
      const res = await fetch("/api/admin/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withStaff({ weekday, open, close })),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message);
    } catch {
      setError("Radno vreme nije sačuvano.");
      await loadWeekly();
    } finally {
      setBusy(false);
    }
  };

  const applyToAll = async (open: string, close: string) => {
    setBusy(true);
    setError(null);
    setHours(Array.from({ length: 7 }, (_, weekday) => ({ weekday, open_time: open, close_time: close })));
    try {
      for (let weekday = 0; weekday < 7; weekday++) {
        const res = await fetch("/api/admin/working-hours", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withStaff({ weekday, open, close })),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message);
      }
    } catch {
      setError("Nije sačuvano.");
    } finally {
      await loadWeekly();
      setBusy(false);
    }
  };

  // --- Date-exception mutations ---
  const putOverride = async (date: string, open: string | null, close: string | null) => {
    if (open && close && open >= close) {
      setError("Početak mora biti pre kraja.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/day-overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withStaff({ date, open, close })),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Izmena nije sačuvana.");
        return;
      }
      setSelected(null);
      await loadMonth();
    } catch {
      setError("Izmena nije sačuvana.");
    } finally {
      setBusy(false);
    }
  };

  const dropOverride = async (date: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/day-overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withStaff({ date })),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Brisanje nije uspelo.");
        return;
      }
      setSelected(null);
      await loadMonth();
    } catch {
      setError("Brisanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  const workingDays = hours.filter((h) => h.open_time && h.close_time).length;
  const weekdays = WEEKDAY_SHORT;
  const selectedEff = selected ? effectiveHours(selected) : null;

  return (
    <div className="adm__sched">
      <h1>{artistName ? `Dostupnost — ${artistName}` : "Moja dostupnost"}</h1>
      <p className="adm__hint">
        Kalendar pokazuje radno vreme za svaki dan. Klikni na dan da promeniš samo taj datum (slobodan dan,
        kraća smena). Ponavljajući raspored podesi u „Nedeljni šablon". Klijenti zakazuju samo unutar ovoga.
      </p>
      {error && <p className="adm__err" role="alert">{error}</p>}

      {/* ---- Weekly template (collapsible) ---- */}
      <section className="adm__wk">
        <button type="button" className="adm__wk-toggle" aria-expanded={showWeekly} onClick={() => setShowWeekly((v) => !v)}>
          <span>Nedeljni šablon</span>
          <em className="adm__wk-count">{workingDays}/7 radnih dana</em>
          {showWeekly ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showWeekly && (
          <div className="adm__wk-days">
            {WEEKDAY_LABELS.map((label, weekday) => {
              const row = hours.find((h) => h.weekday === weekday);
              const open = row?.open_time ?? null;
              const close = row?.close_time ?? null;
              const closed = !open || !close;
              return (
                <div key={weekday} className={`adm__wk-day${closed ? " adm__wk-day--off" : ""}`}>
                  <div className="adm__wk-row">
                    <span className="adm__wk-name">
                      <b className="adm__wk-name-full">{label}</b>
                      <b className="adm__wk-name-short">{WEEKDAY_SHORT[weekday]}</b>
                    </span>
                    <button
                      type="button"
                      className={`adm__toggle${closed ? "" : " adm__toggle--on"}`}
                      role="switch"
                      aria-checked={!closed}
                      disabled={busy}
                      onClick={() => (closed ? putHours(weekday, "10:00", "20:00") : putHours(weekday, null, null))}
                    >
                      <i /> <span>{closed ? "Ne radim" : "Radim"}</span>
                    </button>
                    {!closed && (
                      <span className="adm__timerange">
                        <input
                          type="time"
                          step={1800}
                          value={open!}
                          disabled={busy}
                          aria-label={`${label} — početak`}
                          onChange={(e) => e.target.value && putHours(weekday, e.target.value, close!)}
                        />
                        <em>–</em>
                        <input
                          type="time"
                          step={1800}
                          value={close!}
                          disabled={busy}
                          aria-label={`${label} — kraj`}
                          onChange={(e) => e.target.value && putHours(weekday, open!, e.target.value)}
                        />
                      </span>
                    )}
                  </div>
                  {!closed && (
                    <div className="adm__wk-tools">
                      {PRESETS.map(([o, c]) => (
                        <button
                          key={`${o}-${c}`}
                          type="button"
                          className={`adm__preset${open === o && close === c ? " adm__preset--on" : ""}`}
                          disabled={busy}
                          onClick={() => putHours(weekday, o, c)}
                        >
                          {o}–{c}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="adm__copyall"
                        disabled={busy}
                        onClick={() => applyToAll(open!, close!)}
                        title="Primeni ovo vreme na sve dane"
                      >
                        <Copy size={12} strokeWidth={1.8} /> Na sve dane
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Month calendar ---- */}
      <section className="adm__scal">
        <div className="adm__cal-head adm__cal-head--month">
          <button
            type="button"
            aria-label="Prethodni mesec"
            disabled={monthOffset === 0}
            onClick={() => changeMonth(monthOffset - 1)}
          >
            <ChevronLeft size={16} strokeWidth={1.6} />
          </button>
          <strong>{monthLabel}</strong>
          <button
            type="button"
            aria-label="Sledeći mesec"
            disabled={monthOffset >= MAX_MONTHS_AHEAD}
            onClick={() => changeMonth(monthOffset + 1)}
          >
            <ChevronRight size={16} strokeWidth={1.6} />
          </button>
        </div>

        <div className="adm__scal-grid">
          {weekdays.map((w) => (
            <span key={w} className="adm__scal-wd">{w}</span>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <span key={`x${i}`} />;
            const eff = effectiveHours(iso);
            const closed = !eff.open || !eff.close;
            const past = iso < today;
            const dayNum = Number(iso.slice(-2));
            return (
              <button
                key={iso}
                type="button"
                className={`adm__scal-day${closed ? " adm__scal-day--closed" : ""}${eff.isOverride ? " adm__scal-day--override" : ""}`}
                disabled={past || busy}
                aria-pressed={selected === iso}
                onClick={() => openDay(iso)}
              >
                <span className="adm__scal-num">{dayNum}</span>
                <span className="adm__scal-hours">{closed ? "—" : `${eff.open}–${eff.close}`}</span>
                {eff.isOverride && <em className="adm__scal-dot" title="Izmenjen dan" />}
              </button>
            );
          })}
        </div>

        <div className="adm__scal-legend">
          <span><i className="adm__scal-swatch" /> Radni dan</span>
          <span><i className="adm__scal-swatch adm__scal-swatch--closed" /> Ne radi</span>
          <span><i className="adm__scal-swatch adm__scal-swatch--override" /> Izmenjen datum</span>
        </div>
      </section>

      {/* ---- Selected-day editor ---- */}
      {selected && selectedEff && (
        <div className="adm__editor adm__scal-editor">
          <h3>{fmtDay(selected)}</h3>
          <div className="adm__sched-edit-presets">
            {PRESETS.map(([o, c]) => (
              <button
                key={`${o}-${c}`}
                type="button"
                className={`adm__preset${eOpen === o && eClose === c ? " adm__preset--on" : ""}`}
                disabled={busy}
                onClick={() => { setEOpen(o); setEClose(c); }}
              >
                {o}–{c}
              </button>
            ))}
          </div>
          <span className="adm__timerange">
            <input type="time" step={1800} value={eOpen} disabled={busy} aria-label="Početak" onChange={(e) => setEOpen(e.target.value)} />
            <em>–</em>
            <input type="time" step={1800} value={eClose} disabled={busy} aria-label="Kraj" onChange={(e) => setEClose(e.target.value)} />
          </span>
          <div className="adm__sched-edit-actions">
            <button
              type="button"
              className="adm__resched-confirm"
              disabled={busy || !eOpen || !eClose || eOpen >= eClose}
              onClick={() => putOverride(selected, eOpen, eClose)}
            >
              Sačuvaj ovaj dan
            </button>
            {!(!selectedEff.open || !selectedEff.close) && (
              <button type="button" disabled={busy} onClick={() => putOverride(selected, null, null)}>
                Ne radim taj dan
              </button>
            )}
            {selectedEff.isOverride && (
              <button type="button" disabled={busy} onClick={() => dropOverride(selected)}>
                <RotateCcw size={12} strokeWidth={1.8} /> Vrati na šablon
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
