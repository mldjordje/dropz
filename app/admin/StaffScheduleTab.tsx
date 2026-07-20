"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

// Staff "Dostupnost": my weekly working hours + future date exceptions
// ("adjust when I work"). The owner sees this same data through the calendar's
// working-hours editor; this page is the artist's own control panel.

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

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${iso}T12:00:00`));
}

export function StaffScheduleTab() {
  const [hours, setHours] = useState<WorkingHoursRow[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Override form
  const [oDate, setODate] = useState("");
  const [oClosed, setOClosed] = useState(true);
  const [oOpen, setOOpen] = useState("10:00");
  const [oClose, setOClose] = useState("20:00");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [hRes, oRes] = await Promise.all([
        fetch("/api/admin/working-hours", { cache: "no-store" }),
        fetch(`/api/admin/day-overrides?from=${todayIso()}&to=${plusDaysIso(365)}`, { cache: "no-store" }),
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

  const addOverride = async () => {
    if (!oDate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/day-overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: oDate,
          open: oClosed ? null : oOpen,
          close: oClosed ? null : oClose,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Izuzetak nije sačuvan.");
        return;
      }
      setODate("");
      await load();
    } catch {
      setError("Izuzetak nije sačuvan.");
    } finally {
      setBusy(false);
    }
  };

  const removeOverride = async (date: string) => {
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
      await load();
    } catch {
      setError("Brisanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm__sched">
      <h1>Moja dostupnost</h1>
      <p className="adm__hint">
        Nedeljni raspored važi stalno; izuzeci ispod menjaju pojedinačne dane u budućnosti
        (slobodan dan, kraća smena). Klijenti mogu da zakažu samo unutar ovog rasporeda.
      </p>
      {error && <p className="adm__err" role="alert">{error}</p>}

      <section className="adm__wh">
        <h2>Nedeljni raspored</h2>
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
      </section>

      <section className="adm__ovr">
        <h2>Izuzeci (pojedinačni dani)</h2>
        <div className="adm__ovr-add">
          <input
            type="date"
            min={todayIso()}
            value={oDate}
            onChange={(e) => setODate(e.target.value)}
            disabled={busy}
          />
          <label className="adm__cal-check">
            <input type="checkbox" checked={oClosed} onChange={(e) => setOClosed(e.target.checked)} disabled={busy} />
            Ne radim taj dan
          </label>
          {!oClosed && (
            <span className="adm__wh-times">
              <select value={oOpen} onChange={(e) => setOOpen(e.target.value)} disabled={busy}>
                {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              –
              <select value={oClose} onChange={(e) => setOClose(e.target.value)} disabled={busy}>
                {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </span>
          )}
          <button type="button" onClick={addOverride} disabled={busy || !oDate}>
            <Plus size={14} strokeWidth={1.8} /> Dodaj
          </button>
        </div>

        <div className="adm__ovr-list">
          {overrides.length === 0 && <p className="adm__empty">Nema izuzetaka — važi nedeljni raspored.</p>}
          {overrides.map((o) => (
            <div key={o.date} className="adm__ovr-row">
              <span className="adm__ovr-date">{fmtDate(o.date)}</span>
              <span className="adm__ovr-what">
                {o.open_time && o.close_time ? (
                  `${o.open_time} – ${o.close_time}`
                ) : (
                  <>
                    <CalendarOff size={13} strokeWidth={1.8} /> Ne radim
                  </>
                )}
              </span>
              <button type="button" aria-label="Ukloni izuzetak" onClick={() => removeOverride(o.date)} disabled={busy}>
                <Trash2 size={14} strokeWidth={1.6} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
