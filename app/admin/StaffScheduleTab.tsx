"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

// Staff "Dostupnost": weekly template + a dated day-by-day list for the weeks
// ahead. Every row shows the real date and the effective hours (override wins
// over the weekly schedule); tapping a day opens an inline editor to close it,
// change its hours, or drop the override so the weekly template applies again.

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

const TICKS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

const INITIAL_WEEKS = 4;
const MAX_WEEKS = 12;

function isoFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso() {
  return isoFromDate(new Date());
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

function weekdayIndex(date: string) {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7; // Mon=0
}

const DAY_FMT = new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "long", day: "numeric", month: "long" });
const WEEK_FMT = new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "short" });

function fmtDay(iso: string) {
  return DAY_FMT.format(new Date(`${iso}T12:00:00`));
}

export function StaffScheduleTab() {
  const [hours, setHours] = useState<WorkingHoursRow[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [weeks, setWeeks] = useState(INITIAL_WEEKS);

  // Inline day editor
  const [editDate, setEditDate] = useState<string | null>(null);
  const [eOpen, setEOpen] = useState("10:00");
  const [eClose, setEClose] = useState("20:00");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [hRes, oRes] = await Promise.all([
        fetch("/api/admin/working-hours", { cache: "no-store" }),
        fetch(`/api/admin/day-overrides?from=${todayIso()}&to=${plusDaysIso(MAX_WEEKS * 7)}`, { cache: "no-store" }),
      ]);
      const hData = await hRes.json();
      if (!hData.ok) throw new Error(hData.message);
      setHours(hData.hours);
      const oData = await oRes.json();
      if (oData.ok) setOverrides(oData.overrides);
    } catch {
      setError("Ne mogu da učitam raspored.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Upcoming days grouped into weeks, starting tomorrow (past days are history).
  const weekGroups = useMemo(() => {
    const byDate = new Map(overrides.map((o) => [o.date, o]));
    const groups: { label: string; days: { date: string; open: string | null; close: string | null; isOverride: boolean }[] }[] = [];
    const start = new Date();
    start.setDate(start.getDate() + 1);
    let current: (typeof groups)[number] | null = null;
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoFromDate(d);
      const wd = weekdayIndex(iso);
      if (!current || wd === 0) {
        const weekEnd = new Date(d);
        weekEnd.setDate(d.getDate() + (6 - wd));
        current = { label: `${WEEK_FMT.format(d)} – ${WEEK_FMT.format(weekEnd)}`, days: [] };
        groups.push(current);
      }
      const ovr = byDate.get(iso);
      const wh = hours.find((h) => h.weekday === wd);
      current.days.push({
        date: iso,
        open: ovr ? ovr.open_time : wh?.open_time ?? null,
        close: ovr ? ovr.close_time : wh?.close_time ?? null,
        isOverride: Boolean(ovr),
      });
    }
    return groups;
  }, [hours, overrides, weeks]);

  const putHours = async (weekday: number, open: string | null, close: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekday, open, close }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      await load();
    } catch {
      setError("Radno vreme nije sačuvano.");
    } finally {
      setBusy(false);
    }
  };

  const putOverride = async (date: string, open: string | null, close: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/day-overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, open, close }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Izmena nije sačuvana.");
        return;
      }
      setEditDate(null);
      await load();
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
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Brisanje nije uspelo.");
        return;
      }
      setEditDate(null);
      await load();
    } catch {
      setError("Brisanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (day: { date: string; open: string | null; close: string | null }) => {
    setEditDate((v) => (v === day.date ? null : day.date));
    setEOpen(day.open ?? "10:00");
    setEClose(day.close ?? "20:00");
  };

  return (
    <div className="adm__sched">
      <h1>Moja dostupnost</h1>
      <p className="adm__hint">
        Klikni na dan da promeniš samo taj datum (slobodan dan, kraća smena). Nedeljni šablon
        važi za sve dane bez izmene. Klijenti mogu da zakažu samo unutar ovog rasporeda.
      </p>
      {error && <p className="adm__err" role="alert">{error}</p>}

      <section className="adm__ovr">
        <button type="button" className="adm__sched-weekly-toggle" onClick={() => setShowWeekly((v) => !v)}>
          Nedeljni šablon {showWeekly ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showWeekly && (
          <div className="adm__wh adm__sched-weekly">
            {WEEKDAY_LABELS.map((label, weekday) => {
              const row = hours.find((h) => h.weekday === weekday);
              const closed = !row?.open_time || !row?.close_time;
              return (
                <div key={weekday} className="adm__wh-row">
                  <span className="adm__wh-day">{label}</span>
                  {closed ? (
                    <span className="adm__wh-closed">Ne radim</span>
                  ) : (
                    <span className="adm__wh-times">
                      <select
                        value={row!.open_time!}
                        disabled={busy}
                        onChange={(e) => putHours(weekday, e.target.value, row!.close_time!)}
                      >
                        {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      –
                      <select
                        value={row!.close_time!}
                        disabled={busy}
                        onChange={(e) => putHours(weekday, row!.open_time!, e.target.value)}
                      >
                        {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (closed ? putHours(weekday, "10:00", "20:00") : putHours(weekday, null, null))}
                  >
                    {closed ? "Otvori" : "Zatvori dan"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {weekGroups.map((group) => (
        <section key={group.label} className="adm__sched-week">
          <h2>{group.label}</h2>
          <div className="adm__sched-days">
            {group.days.map((day) => {
              const closed = !day.open || !day.close;
              const editing = editDate === day.date;
              return (
                <div key={day.date} className={`adm__sched-day${day.isOverride ? " adm__sched-day--override" : ""}`}>
                  <button
                    type="button"
                    className="adm__sched-day-row"
                    aria-expanded={editing}
                    onClick={() => openEditor(day)}
                  >
                    <span className="adm__sched-date">{fmtDay(day.date)}</span>
                    <span className={`adm__sched-hours${closed ? " adm__sched-hours--closed" : ""}`}>
                      {closed ? "Ne radim" : `${day.open} – ${day.close}`}
                      {day.isOverride && <em title="Izmenjen dan">•</em>}
                    </span>
                  </button>
                  {editing && (
                    <div className="adm__sched-edit">
                      <span className="adm__wh-times">
                        <select value={eOpen} onChange={(e) => setEOpen(e.target.value)} disabled={busy}>
                          {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        –
                        <select value={eClose} onChange={(e) => setEClose(e.target.value)} disabled={busy}>
                          {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </span>
                      <div className="adm__sched-edit-actions">
                        <button
                          type="button"
                          className="adm__resched-confirm"
                          disabled={busy || eOpen >= eClose}
                          onClick={() => putOverride(day.date, eOpen, eClose)}
                        >
                          Sačuvaj
                        </button>
                        {!closed && (
                          <button type="button" disabled={busy} onClick={() => putOverride(day.date, null, null)}>
                            Ne radim taj dan
                          </button>
                        )}
                        {day.isOverride && (
                          <button type="button" disabled={busy} onClick={() => dropOverride(day.date)}>
                            <RotateCcw size={12} strokeWidth={1.8} /> Vrati na šablon
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {weeks < MAX_WEEKS && (
        <button type="button" className="adm__sched-more" onClick={() => setWeeks((w) => Math.min(MAX_WEEKS, w + 4))}>
          Prikaži još nedelja
        </button>
      )}
    </div>
  );
}
