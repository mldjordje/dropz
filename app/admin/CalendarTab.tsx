"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import srLocale from "@fullcalendar/core/locales/sr";

// FullCalendar's `sr` locale has Latin button texts but its code makes Intl
// render day/month names in Cyrillic; force the Latin script variant.
const srLatn = { ...srLocale, code: "sr-Latn" };
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";

type AppointmentRow = {
  id: number;
  kind: "consult" | "tattoo" | "manual";
  title: string | null;
  request_id: number | null;
  user_id: number | null;
  date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  status: "scheduled" | "done" | "canceled";
  price: number | null;
  deposit: number | null;
  deposit_paid: boolean;
  paid: boolean;
  payment_method: string | null;
  user_name: string | null;
  user_email: string | null;
  request_description: string | null;
};

type ConsultRow = {
  id: number;
  name: string;
  contact: string;
  note: string | null;
  date: string;
  slot: string;
  status: string;
};

type WorkingHoursRow = {
  weekday: number; // 0 = Monday ... 6 = Sunday
  open_time: string | null;
  close_time: string | null;
};

type QuotedRequest = {
  id: number;
  user_name: string | null;
  user_email: string;
  description: string;
  status: string;
  session_count: number | null;
  session_minutes: number | null;
  sessions_done: number;
};

const WEEKDAY_LABELS = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];

// 30-min ticks 00:00–23:30 for the working-hours selects.
const TICKS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CalendarTab() {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [consults, setConsults] = useState<ConsultRow[]>([]);
  const [hours, setHours] = useState<WorkingHoursRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!range) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/calendar?from=${range.from}&to=${range.to}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setAppointments(data.appointments);
      setConsults(data.consults);
      setHours(data.hours);
    } catch {
      setError("Ne mogu da učitam kalendar.");
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const events = useMemo<EventInput[]>(() => {
    const items: EventInput[] = [];
    for (const c of consults) {
      items.push({
        id: `consult-${c.id}`,
        title: `Konsultacija — ${c.name}`,
        start: `${c.date}T${c.slot}`,
        end: `${c.date}T${addMinutes(c.slot, 60)}`,
        classNames: ["dz-ev", "dz-ev--consult"],
        extendedProps: { type: "consult", row: c },
      });
    }
    for (const a of appointments) {
      if (a.status === "canceled") continue;
      const label =
        a.kind === "tattoo"
          ? `Tattoo — ${a.user_name ?? a.user_email ?? ""}`
          : a.title ?? "Zauzeto";
      items.push({
        id: `appt-${a.id}`,
        title: a.status === "done" ? `✓ ${label}` : label,
        start: `${a.date}T${a.start_time}`,
        end: `${a.date}T${a.end_time}`,
        classNames: ["dz-ev", a.kind === "tattoo" ? "dz-ev--tattoo" : "dz-ev--manual", ...(a.status === "done" ? ["dz-ev--done"] : [])],
        extendedProps: { type: "appointment", row: a },
      });
    }
    return items;
  }, [appointments, consults]);

  const businessHours = useMemo(
    () =>
      hours
        .filter((h) => h.open_time && h.close_time)
        .map((h) => ({
          daysOfWeek: [(h.weekday + 1) % 7], // FullCalendar: 0 = Sunday
          startTime: h.open_time as string,
          endTime: h.close_time as string,
        })),
    [hours],
  );

  // ---- create panel (opens on empty-slot select) ----
  const [createSel, setCreateSel] = useState<{ date: string; start: string; end: string } | null>(null);
  const [cKind, setCKind] = useState<"manual" | "tattoo" | "block">("manual");
  const [cTitle, setCTitle] = useState("");
  const [cNote, setCNote] = useState("");
  const [cRequestId, setCRequestId] = useState<number | null>(null);
  const [cStart, setCStart] = useState("10:00");
  const [cEnd, setCEnd] = useState("11:00");
  const [openRequests, setOpenRequests] = useState<QuotedRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  // Single entry point for the create popup — called from both drag-select and
  // plain single clicks (dateClick), so every slot is clickable (drigic pattern).
  const openCreate = useCallback(async (date: string, start: string, end: string) => {
    setCreateSel({ date, start, end });
    setCStart(start);
    setCEnd(end);
    setCKind("manual");
    setCTitle("");
    setCNote("");
    setCRequestId(null);
    setSelected(null);
    setPanelError(null);
    try {
      const res = await fetch("/api/admin/tattoo-requests", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        const open = (data.requests as QuotedRequest[]).filter(
          (r) =>
            (r.status === "quoted" || r.status === "scheduled") &&
            (r.session_count === null || r.sessions_done < r.session_count),
        );
        setOpenRequests(open);
      }
    } catch {
      setOpenRequests([]);
    }
  }, []);

  const onSelect = useCallback((sel: DateSelectArg) => {
    const date = isoDate(sel.start);
    const start = isoTime(sel.start);
    // Month-view selections come through as all-day; give a sane default block.
    const end = sel.allDay ? addMinutes(start === "00:00" ? "10:00" : start, 60) : isoTime(sel.end);
    const realStart = sel.allDay && start === "00:00" ? "10:00" : start;
    openCreate(date, realStart, end);
  }, [openCreate]);

  const onDateClick = useCallback((arg: DateClickArg) => {
    const date = isoDate(arg.date);
    const raw = isoTime(arg.date);
    const start = arg.allDay || raw === "00:00" ? "10:00" : raw;
    openCreate(date, start, addMinutes(start, 60));
  }, [openCreate]);

  const create = async () => {
    if (!createSel) return;
    if (cKind === "manual" && !cTitle.trim()) {
      setPanelError("Naziv je obavezan.");
      return;
    }
    if (cKind === "tattoo" && !cRequestId) {
      setPanelError("Izaberi tattoo zahtev.");
      return;
    }
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: createSel.date,
          start: cStart,
          end: cEnd,
          note: cNote.trim() || undefined,
          ...(cKind === "tattoo"
            ? { requestId: cRequestId }
            : { title: cKind === "block" ? "Blokirano" : cTitle.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPanelError(data.message ?? "Čuvanje nije uspelo.");
        return;
      }
      setCreateSel(null);
      await load();
    } catch {
      setPanelError("Čuvanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  // ---- edit panel (opens on event click) ----
  const [selected, setSelected] = useState<
    | { type: "appointment"; row: AppointmentRow }
    | { type: "consult"; row: ConsultRow }
    | null
  >(null);
  const [eDate, setEDate] = useState("");
  const [eStart, setEStart] = useState("10:00");
  const [eEnd, setEEnd] = useState("11:00");
  const [eTitle, setETitle] = useState("");
  const [eNote, setENote] = useState("");
  // finance fields (saved via /api/admin/finance)
  const [ePrice, setEPrice] = useState("");
  const [eDeposit, setEDeposit] = useState("");
  const [eDepositPaid, setEDepositPaid] = useState(false);
  const [ePaid, setEPaid] = useState(false);
  const [eMethod, setEMethod] = useState("");

  // Close any open popup with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCreateSel(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onEventClick = useCallback((arg: EventClickArg) => {
    const props = arg.event.extendedProps as
      | { type: "appointment"; row: AppointmentRow }
      | { type: "consult"; row: ConsultRow };
    setCreateSel(null);
    setPanelError(null);
    setSelected(props);
    if (props.type === "appointment") {
      setEDate(props.row.date);
      setEStart(props.row.start_time);
      setEEnd(props.row.end_time);
      setETitle(props.row.title ?? "");
      setENote(props.row.note ?? "");
      setEPrice(props.row.price != null ? String(props.row.price) : "");
      setEDeposit(props.row.deposit != null ? String(props.row.deposit) : "");
      setEDepositPaid(props.row.deposit_paid);
      setEPaid(props.row.paid);
      setEMethod(props.row.payment_method ?? "");
    }
  }, []);

  const patchSelected = async (payload: Record<string, unknown>) => {
    if (!selected || selected.type !== "appointment") return;
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.row.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPanelError(data.message ?? "Izmena nije uspela.");
        return;
      }
      setSelected(null);
      await load();
    } catch {
      setPanelError("Izmena nije uspela.");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!selected || selected.type !== "appointment") return;
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.row.id,
          date: eDate,
          start: eStart,
          end: eEnd,
          note: eNote.trim() === "" ? "" : eNote.trim(),
          ...(selected.row.kind === "manual" ? { title: eTitle.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPanelError(data.message ?? "Izmena nije uspela.");
        return;
      }
      const finRes = await fetch("/api/admin/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.row.id,
          price: ePrice.trim() === "" ? null : Number(ePrice),
          deposit: eDeposit.trim() === "" ? null : Number(eDeposit),
          deposit_paid: eDepositPaid,
          paid: ePaid,
          payment_method: eMethod === "" ? null : eMethod,
        }),
      });
      const finData = await finRes.json();
      if (!finRes.ok || !finData.ok) {
        setPanelError(finData.message ?? "Naplata nije sačuvana.");
        return;
      }
      setSelected(null);
      await load();
    } catch {
      setPanelError("Izmena nije uspela.");
    } finally {
      setBusy(false);
    }
  };

  const removeSelected = async () => {
    if (!selected || selected.type !== "appointment") return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.row.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPanelError(data.message ?? "Brisanje nije uspelo.");
        return;
      }
      setSelected(null);
      await load();
    } catch {
      setPanelError("Brisanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  // ---- working hours editor ----
  const [showHours, setShowHours] = useState(false);
  const [hoursBusy, setHoursBusy] = useState(false);

  const putHours = async (weekday: number, open: string | null, close: string | null) => {
    setHoursBusy(true);
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
      setHoursBusy(false);
    }
  };

  return (
    <div className="adm__cal">
      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__cal-legend">
        <span className="adm__cal-key adm__cal-key--consult">Konsultacija</span>
        <span className="adm__cal-key adm__cal-key--tattoo">Tattoo sesija</span>
        <span className="adm__cal-key adm__cal-key--manual">Ostalo</span>
        <button type="button" className="adm__cal-hours-btn" onClick={() => setShowHours((v) => !v)}>
          {showHours ? "Sakrij radno vreme" : "Radno vreme"}
        </button>
      </div>

      {showHours && (
        <div className="adm__wh">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const row = hours.find((h) => h.weekday === weekday);
            const closed = !row?.open_time || !row?.close_time;
            return (
              <div key={weekday} className="adm__wh-row">
                <span className="adm__wh-day">{label}</span>
                {closed ? (
                  <span className="adm__wh-closed">Zatvoreno</span>
                ) : (
                  <span className="adm__wh-times">
                    <select
                      value={row!.open_time!}
                      disabled={hoursBusy}
                      onChange={(e) => putHours(weekday, e.target.value, row!.close_time!)}
                    >
                      {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    –
                    <select
                      value={row!.close_time!}
                      disabled={hoursBusy}
                      onChange={(e) => putHours(weekday, row!.open_time!, e.target.value)}
                    >
                      {TICKS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </span>
                )}
                <button
                  type="button"
                  disabled={hoursBusy}
                  onClick={() => (closed ? putHours(weekday, "10:00", "20:00") : putHours(weekday, null, null))}
                >
                  {closed ? "Otvori" : "Zatvori dan"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="adm__fc-wrap">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={srLatn}
          firstDay={1}
          allDaySlot={false}
          nowIndicator
          slotDuration="00:30:00"
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          scrollTime="10:00:00"
          businessHours={businessHours}
          selectable
          selectMirror
          select={onSelect}
          dateClick={onDateClick}
          eventClick={onEventClick}
          events={events}
          height="auto"
          datesSet={(info) => {
            const next = { from: isoDate(info.start), to: isoDate(info.end) };
            setRange((prev) => (prev && prev.from === next.from && prev.to === next.to ? prev : next));
          }}
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
        />
      </div>

      {createSel && (
        <div className="adm__modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setCreateSel(null); }}>
        <div className="adm__cal-panel adm__modal-box" role="dialog" aria-modal="true" aria-label="Novi unos">
          <button type="button" className="adm__modal-x" aria-label="Zatvori" onClick={() => setCreateSel(null)}>×</button>
          <h3>Novi unos — {createSel.date}</h3>
          <div className="adm__cal-panel-row">
            <button type="button" className="adm__chip" aria-pressed={cKind === "manual"} onClick={() => setCKind("manual")}>
              Ostalo / privatno
            </button>
            <button type="button" className="adm__chip" aria-pressed={cKind === "tattoo"} onClick={() => setCKind("tattoo")}>
              Tattoo sesija
            </button>
            <button type="button" className="adm__chip" aria-pressed={cKind === "block"} onClick={() => setCKind("block")}>
              Blokada
            </button>
          </div>

          {cKind === "manual" && (
            <label className="adm__cal-field">
              Naziv
              <input type="text" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="npr. Privatna obaveza" disabled={busy} />
            </label>
          )}
          {cKind === "tattoo" && (
            <label className="adm__cal-field">
              Tattoo zahtev
              <select value={cRequestId ?? ""} onChange={(e) => setCRequestId(Number(e.target.value) || null)} disabled={busy}>
                <option value="">— izaberi —</option>
                {openRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.user_name ?? r.user_email)} — {r.description.slice(0, 40)}
                    {r.session_count ? ` (${r.sessions_done}/${r.session_count})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {cKind === "block" && (
            <p className="adm__hint">Blokira izabrani period — klijenti ne mogu da zakažu sesiju u njemu.</p>
          )}

          <div className="adm__cal-panel-row">
            <label className="adm__cal-field">
              Od
              <input type="time" value={cStart} step={900} onChange={(e) => setCStart(e.target.value)} disabled={busy} />
            </label>
            <label className="adm__cal-field">
              Do
              <input type="time" value={cEnd} step={900} onChange={(e) => setCEnd(e.target.value)} disabled={busy} />
            </label>
          </div>

          <label className="adm__cal-field">
            Napomena (opciono)
            <input type="text" value={cNote} onChange={(e) => setCNote(e.target.value)} disabled={busy} />
          </label>

          {panelError && <p className="adm__err" role="alert">{panelError}</p>}
          <div className="adm__cal-panel-actions">
            <button type="button" className="adm__resched-confirm" onClick={create} disabled={busy}>
              {busy ? "Čuvanje…" : "Sačuvaj"}
            </button>
            <button type="button" onClick={() => setCreateSel(null)} disabled={busy}>Otkaži</button>
          </div>
        </div>
        </div>
      )}

      {selected && selected.type === "consult" && (
        <div className="adm__modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="adm__cal-panel adm__modal-box" role="dialog" aria-modal="true" aria-label="Konsultacija">
          <button type="button" className="adm__modal-x" aria-label="Zatvori" onClick={() => setSelected(null)}>×</button>
          <h3>Konsultacija — {selected.row.date} u {selected.row.slot}</h3>
          <p className="adm__hint">
            {selected.row.name} · {selected.row.contact}
            {selected.row.note ? ` · ${selected.row.note}` : ""}
          </p>
          <p className="adm__hint">Konsultacije se menjaju u tabu „Termini".</p>
          <div className="adm__cal-panel-actions">
            <button type="button" onClick={() => setSelected(null)}>Zatvori</button>
          </div>
        </div>
        </div>
      )}

      {selected && selected.type === "appointment" && (
        <div className="adm__modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="adm__cal-panel adm__modal-box" role="dialog" aria-modal="true" aria-label="Termin">
          <button type="button" className="adm__modal-x" aria-label="Zatvori" onClick={() => setSelected(null)}>×</button>
          <h3>
            {selected.row.kind === "tattoo"
              ? `Tattoo sesija — ${selected.row.user_name ?? selected.row.user_email ?? ""}`
              : selected.row.title ?? "Unos"}
          </h3>
          {selected.row.kind === "tattoo" && selected.row.request_description && (
            <p className="adm__hint">{selected.row.request_description}</p>
          )}

          {selected.row.kind === "manual" && (
            <label className="adm__cal-field">
              Naziv
              <input type="text" value={eTitle} onChange={(e) => setETitle(e.target.value)} disabled={busy} />
            </label>
          )}
          <div className="adm__cal-panel-row">
            <label className="adm__cal-field">
              Datum
              <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} disabled={busy} />
            </label>
            <label className="adm__cal-field">
              Od
              <input type="time" value={eStart} step={900} onChange={(e) => setEStart(e.target.value)} disabled={busy} />
            </label>
            <label className="adm__cal-field">
              Do
              <input type="time" value={eEnd} step={900} onChange={(e) => setEEnd(e.target.value)} disabled={busy} />
            </label>
          </div>
          <label className="adm__cal-field">
            Napomena
            <input type="text" value={eNote} onChange={(e) => setENote(e.target.value)} disabled={busy} />
          </label>

          <div className="adm__cal-fin">
            <h4>Naplata</h4>
            <div className="adm__cal-panel-row">
              <label className="adm__cal-field">
                Cena
                <input type="number" min={0} value={ePrice} onChange={(e) => setEPrice(e.target.value)} disabled={busy} placeholder="RSD" />
              </label>
              <label className="adm__cal-field">
                Depozit
                <input type="number" min={0} value={eDeposit} onChange={(e) => setEDeposit(e.target.value)} disabled={busy} placeholder="RSD" />
              </label>
              <label className="adm__cal-field">
                Način plaćanja
                <select value={eMethod} onChange={(e) => setEMethod(e.target.value)} disabled={busy}>
                  <option value="">—</option>
                  <option value="cash">Keš</option>
                  <option value="card">Kartica</option>
                  <option value="transfer">Uplata</option>
                </select>
              </label>
            </div>
            <div className="adm__cal-panel-row adm__cal-checks">
              <label className="adm__cal-check">
                <input type="checkbox" checked={eDepositPaid} onChange={(e) => setEDepositPaid(e.target.checked)} disabled={busy} />
                Depozit plaćen
              </label>
              <label className="adm__cal-check">
                <input type="checkbox" checked={ePaid} onChange={(e) => setEPaid(e.target.checked)} disabled={busy} />
                Plaćeno u celosti
              </label>
            </div>
          </div>

          {panelError && <p className="adm__err" role="alert">{panelError}</p>}
          <div className="adm__cal-panel-actions">
            <button type="button" className="adm__resched-confirm" onClick={saveEdit} disabled={busy}>
              {busy ? "Čuvanje…" : "Sačuvaj izmene"}
            </button>
            {selected.row.status !== "done" && (
              <button type="button" onClick={() => patchSelected({ status: "done" })} disabled={busy}>
                Završeno
              </button>
            )}
            {selected.row.status === "done" && (
              <button type="button" onClick={() => patchSelected({ status: "scheduled" })} disabled={busy}>
                Vrati na zakazano
              </button>
            )}
            <button type="button" onClick={removeSelected} disabled={busy}>Obriši</button>
            <button type="button" onClick={() => setSelected(null)} disabled={busy}>Zatvori</button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
