"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";

// Artist availability editor. Mobile-first: native time pickers instead of
// 48-option dropdowns, one-tap presets, "copy to every day", and a tap-to-edit
// list of the weeks ahead where an override wins over the weekly template.
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

export function StaffScheduleTab({ staffId, artistName }: { staffId?: number; artistName?: string } = {}) {
  const [hours, setHours] = useState<WorkingHoursRow[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [weeks, setWeeks] = useState(INITIAL_WEEKS);

  // Inline day-exception editor
  const [editDate, setEditDate] = useState<string | null>(null);
  const [eOpen, setEOpen] = useState("10:00");
  const [eClose, setEClose] = useState("20:00");

  // staffId is optional (owner editing someone else); fold it into requests.
  const staffQuery = staffId ? `&staffId=${staffId}` : "";
  const withStaff = useCallback(
    (payload: Record<string, unknown>) => (staffId ? { ...payload, staffId } : payload),
    [staffId],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [hRes, oRes] = await Promise.all([
        fetch(`/api/admin/working-hours?_=${Date.now()}${staffQuery}`, { cache: "no-store" }),
        fetch(`/api/admin/day-overrides?from=${todayIso()}&to=${plusDaysIso(MAX_WEEKS * 7)}${staffQuery}`, {
          cache: "no-store",
        }),
      ]);
      const hData = await hRes.json();
      if (!hData.ok) throw new Error(hData.message);
      setHours(hData.hours);
      const oData = await oRes.json();
      if (oData.ok) setOverrides(oData.overrides);
    } catch {
      setError("Ne mogu da učitam raspored.");
    }
  }, [staffQuery]);

  useEffect(() => {
    load();
  }, [load]);

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
      await load();
    } finally {
      setBusy(false);
    }
  };

  // Copy one day's hours onto every weekday at once.
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
      await load();
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
        body: JSON.stringify(withStaff({ date })),
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

  const workingDays = hours.filter((h) => h.open_time && h.close_time).length;

  return (
    <div className="adm__sched">
      <h1>{artistName ? `Raspored — ${artistName}` : "Moja dostupnost"}</h1>
      <p className="adm__hint">
        Nedeljni šablon važi za sve dane. Za pojedinačan datum (slobodan dan, kraća smena) klikni na taj dan
        u listi ispod. Klijenti mogu da zakažu konsultacije i sesije samo unutar ovog rasporeda.
      </p>
      {error && <p className="adm__err" role="alert">{error}</p>}

      {/* ---- Weekly template ---- */}
      <section className="adm__wk">
        <div className="adm__wk-head">
          <h2>Nedeljni šablon</h2>
          <span className="adm__wk-count">{workingDays}/7 radnih dana</span>
        </div>
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
      </section>

      {/* ---- Upcoming days (exceptions) ---- */}
      <section className="adm__exc">
        <h2>Naredni dani</h2>
        {weekGroups.map((group) => (
          <div key={group.label} className="adm__sched-week">
            <h3>{group.label}</h3>
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
                            onClick={() => putOverride(day.date, eOpen, eClose)}
                          >
                            Sačuvaj ovaj dan
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
          </div>
        ))}

        {weeks < MAX_WEEKS && (
          <button type="button" className="adm__sched-more" onClick={() => setWeeks((w) => Math.min(MAX_WEEKS, w + 4))}>
            Prikaži još nedelja
          </button>
        )}
      </section>
    </div>
  );
}
