"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmtDate, monthLabel } from "./shared";

// Shared types, data hook and row components for the owner Finansije page and
// the staff Zarada page — both read /api/admin/finance (scoped per role).

export type Split = { owner: number; artist: number };

export type FinAppt = {
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
  artist_id: number | null;
  artist_name: string | null;
  by_owner: boolean;
  split: Split;
};

export type FinTotals = {
  priced: number;
  collected: number;
  outstanding: number;
  sessions: number;
  done: number;
  paidSessions: number;
  ownerEarned: number;
  ownerFromOwn: number;
  ownerFromStaff: number;
  artistEarned: number;
  methods: { cash: number; card: number; transfer: number; other: number };
};

export type TeamEntry = {
  id: number;
  name: string;
  role: "owner" | "staff";
  active: boolean;
  sessions: number;
  paidSessions: number;
  collected: number;
  artistShare: number;
  ownerShare: number;
  unpaid: number;
  payoutsMonth: number;
  owedTotal: number;
  paidOutTotal: number;
  balance: number;
};

export type TrendPoint = { month: string; collected: number; owner: number; artist: number };

export type Payout = { id: number; staff_id: number; staff_name: string; amount: number; paid_on: string; note: string | null };

export type FinanceData = {
  role: "owner" | "staff";
  rate: number;
  month: string;
  artistId: number;
  ownerId: number | null;
  appointments: FinAppt[];
  totals: FinTotals;
  team: TeamEntry[];
  trend: TrendPoint[];
  payouts: Payout[];
};

export const KIND_LABEL: Record<string, string> = {
  consult: "Konsultacija",
  tattoo: "Tetoviranje",
  piercing: "Piercing",
  manual: "Ručno",
};

export const METHOD_LABEL: Record<string, string> = { cash: "Gotovina", card: "Kartica", transfer: "Uplata", other: "Nije uneto" };

export function fmtMoney(n: number) {
  return new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 0 }).format(n);
}

export function fmtEur(rsd: number, rate: number) {
  return `≈ ${fmtMoney(Math.round(rsd / rate))} €`;
}

export async function sendJson(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) throw new Error(data.message ?? "Greška");
  return data;
}

export function useFinance(month: string, artistId: number) {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const reqId = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/finance?month=${month}&artistId=${artistId}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      if (reqId === latest.current) setData(json as FinanceData);
    } catch {
      if (reqId === latest.current) setError("Ne mogu da učitam finansije.");
    } finally {
      if (reqId === latest.current) setLoading(false);
    }
  }, [month, artistId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, setError, reload };
}

export function MonthNav({ monthKey, offset, setOffset }: { monthKey: string; offset: number; setOffset: (n: number) => void }) {
  return (
    <div className="adm__cal-head adm__cal-head--month">
      <button type="button" aria-label="Prethodni mesec" onClick={() => setOffset(offset - 1)}>
        <ChevronLeft size={16} strokeWidth={1.6} />
      </button>
      <strong>{monthLabel(monthKey)}</strong>
      <button type="button" aria-label="Sledeći mesec" onClick={() => setOffset(offset + 1)}>
        <ChevronRight size={16} strokeWidth={1.6} />
      </button>
    </div>
  );
}

export function Stat({ value, label, sub, highlight }: { value: string; label: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "adm__stat adm__stat--hl" : "adm__stat"}>
      <strong>{value}</strong>
      <span>{label}</span>
      {sub && <em>{sub}</em>}
    </div>
  );
}

const shortMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("sr-Latn-RS", { month: "short" }).format(new Date(y, m - 1, 1));
};

export function TrendBars({ trend, pick, current }: { trend: TrendPoint[]; pick: (p: TrendPoint) => number; current: string }) {
  const max = Math.max(1, ...trend.map(pick));
  return (
    <div className="adm__fin-trend">
      {trend.map((p) => {
        const v = pick(p);
        return (
          <div key={p.month} className="adm__fin-bar" aria-current={p.month === current}>
            <b>{v > 0 ? fmtMoney(Math.round(v / 1000)) + "k" : "–"}</b>
            <i style={{ height: `${(v / max) * 100}%` }} />
            <span>{shortMonth(p.month)}</span>
          </div>
        );
      })}
    </div>
  );
}

export type ListFilter = "all" | "unpaid" | "paid";

export function filterAppointments(list: FinAppt[], filter: ListFilter) {
  if (filter === "paid") return list.filter((a) => a.paid);
  if (filter === "unpaid") return list.filter((a) => !a.paid);
  return list;
}

export function ListFilters({ value, onChange }: { value: ListFilter; onChange: (v: ListFilter) => void }) {
  const items: [ListFilter, string][] = [["all", "Svi"], ["unpaid", "Nije plaćeno"], ["paid", "Plaćeno"]];
  return (
    <div className="adm__filters">
      {items.map(([k, label]) => (
        <button key={k} type="button" className="adm__filter" aria-pressed={value === k} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function FinRow({
  a,
  busy,
  onPatch,
  labels,
  showArtist,
}: {
  a: FinAppt;
  busy: boolean;
  onPatch: (id: number, fields: Record<string, unknown>) => void;
  labels: { owner: string; artist: string; own: string };
  showArtist?: boolean;
}) {
  const priced = a.price != null && a.price > 0;
  return (
    <article className="adm__row adm__fin-row">
      <div className="adm__when">
        <strong>{fmtDate(a.date)}</strong>
        <span>{a.start_time}–{a.end_time}</span>
      </div>
      <div className="adm__who">
        <strong>
          {a.label}
          <span className="adm__kind">{KIND_LABEL[a.kind] ?? a.kind}</span>
          {showArtist && a.artist_name && <span className="adm__kind">{a.artist_name}</span>}
        </strong>
      </div>
      <div className="adm__fin-split">
        {!priced ? (
          <span className="adm__fin-chip">Bez cene</span>
        ) : a.by_owner ? (
          <span className="adm__fin-chip">{labels.own} <b>{fmtMoney(a.split.owner)}</b></span>
        ) : (
          <>
            <span className="adm__fin-chip">{labels.artist} <b>{fmtMoney(a.split.artist)}</b></span>
            <span className="adm__fin-chip">{labels.owner} <b>{fmtMoney(a.split.owner)}</b></span>
          </>
        )}
        {a.paid ? (
          <span className="adm__fin-chip adm__fin-chip--paid">Plaćeno</span>
        ) : (
          priced && <span className="adm__fin-chip adm__fin-chip--open">Nije plaćeno</span>
        )}
      </div>
      <div className="adm__fin-fields" key={`${a.price}-${a.deposit}`}>
        <label>
          Cena (RSD)
          <input
            type="number"
            min={0}
            defaultValue={a.price ?? ""}
            disabled={busy}
            onBlur={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              if (v !== a.price) onPatch(a.id, { price: v });
            }}
          />
        </label>
        <label>
          Depozit
          <input
            type="number"
            min={0}
            defaultValue={a.deposit ?? ""}
            disabled={busy}
            onBlur={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              if (v !== a.deposit) onPatch(a.id, { deposit: v });
            }}
          />
        </label>
        <label className="adm__fin-check">
          <input
            type="checkbox"
            checked={a.deposit_paid}
            disabled={busy}
            onChange={(e) => onPatch(a.id, { deposit_paid: e.target.checked })}
          />
          Depozit plaćen
        </label>
        <label className="adm__fin-check">
          <input type="checkbox" checked={a.paid} disabled={busy} onChange={(e) => onPatch(a.id, { paid: e.target.checked })} />
          Plaćeno u celosti
        </label>
        <label>
          Način
          <select
            value={a.payment_method ?? ""}
            disabled={busy}
            onChange={(e) => onPatch(a.id, { payment_method: e.target.value || null })}
          >
            <option value="">—</option>
            <option value="cash">Gotovina</option>
            <option value="card">Kartica</option>
            <option value="transfer">Uplata</option>
          </select>
        </label>
      </div>
    </article>
  );
}

export function SplitRules() {
  return (
    <p className="adm__fin-rules">
      Podela po plaćenom terminu: <strong>do 200 €</strong> — pola-pola · <strong>200–249 €</strong> — owneru 80 € ·{" "}
      <strong>250 € i više</strong> — owneru 100 €. Termin ulazi u zaradu kad je označen „Plaćeno u celosti“.
    </p>
  );
}
