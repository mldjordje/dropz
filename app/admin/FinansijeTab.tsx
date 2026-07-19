"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey, monthLabel, fmtDate } from "./shared";

type FinAppt = {
  id: number;
  kind: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number | null;
  deposit: number | null;
  deposit_paid: boolean;
  paid: boolean;
  payment_method: string | null;
  label: string;
};

type Totals = { priced: number; collected: number; outstanding: number; sessions: number; done: number };

const KIND_LABEL: Record<string, string> = { consult: "Konsultacija", tattoo: "Tetoviranje", manual: "Ručno" };

function fmtMoney(n: number) {
  return new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 0 }).format(n);
}

export function FinansijeTab() {
  const [offset, setOffset] = useState(0);
  const [appts, setAppts] = useState<FinAppt[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const key = monthKey(offset);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/finance?month=${key}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setAppts(data.appointments);
      setTotals(data.totals);
    } catch {
      setError("Ne mogu da učitam finansije.");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: number, fields: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      await load();
    } catch {
      setError("Izmena nije sačuvana.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="adm__fin">
      <div className="adm__cal-head adm__cal-head--month">
        <button type="button" aria-label="Prethodni mesec" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft size={16} strokeWidth={1.6} />
        </button>
        <strong>{monthLabel(key)}</strong>
        <button type="button" aria-label="Sledeći mesec" onClick={() => setOffset(offset + 1)}>
          <ChevronRight size={16} strokeWidth={1.6} />
        </button>
      </div>

      {error && <p className="adm__err" role="alert">{error}</p>}

      {totals && (
        <div className="adm__stats">
          <div className="adm__stat"><strong>{fmtMoney(totals.collected)}</strong><span>Naplaćeno (RSD)</span></div>
          <div className="adm__stat"><strong>{fmtMoney(totals.priced)}</strong><span>Ugovoreno (RSD)</span></div>
          <div className="adm__stat"><strong>{fmtMoney(totals.outstanding)}</strong><span>Preostalo (RSD)</span></div>
          <div className="adm__stat"><strong>{totals.done}/{totals.sessions}</strong><span>Završeno termina</span></div>
        </div>
      )}

      <div className="adm__list">
        {loading && <p className="adm__empty">Učitavanje…</p>}
        {!loading && appts.length === 0 && <p className="adm__empty">Nema termina u ovom mesecu.</p>}
        {appts.map((a) => (
          <article key={a.id} className="adm__row adm__fin-row">
            <div className="adm__when">
              <strong>{fmtDate(a.date)}</strong>
              <span>{a.start_time}–{a.end_time}</span>
            </div>
            <div className="adm__who">
              <strong>
                {a.label}
                <span className="adm__kind">{KIND_LABEL[a.kind] ?? a.kind}</span>
              </strong>
            </div>
            <div className="adm__fin-fields">
              <label>
                Cena
                <input
                  type="number"
                  min={0}
                  defaultValue={a.price ?? ""}
                  disabled={busyId === a.id}
                  onBlur={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    if (v !== a.price) patch(a.id, { price: v });
                  }}
                />
              </label>
              <label>
                Depozit
                <input
                  type="number"
                  min={0}
                  defaultValue={a.deposit ?? ""}
                  disabled={busyId === a.id}
                  onBlur={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    if (v !== a.deposit) patch(a.id, { deposit: v });
                  }}
                />
              </label>
              <label className="adm__fin-check">
                <input
                  type="checkbox"
                  checked={a.deposit_paid}
                  disabled={busyId === a.id}
                  onChange={(e) => patch(a.id, { deposit_paid: e.target.checked })}
                />
                Depozit plaćen
              </label>
              <label className="adm__fin-check">
                <input
                  type="checkbox"
                  checked={a.paid}
                  disabled={busyId === a.id}
                  onChange={(e) => patch(a.id, { paid: e.target.checked })}
                />
                Plaćeno u celosti
              </label>
              <label>
                Način
                <select
                  value={a.payment_method ?? ""}
                  disabled={busyId === a.id}
                  onChange={(e) => patch(a.id, { payment_method: e.target.value || null })}
                >
                  <option value="">—</option>
                  <option value="cash">Gotovina</option>
                  <option value="card">Kartica</option>
                  <option value="transfer">Uplata</option>
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
