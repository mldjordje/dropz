"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate, monthKey } from "./shared";
import {
  FinRow,
  ListFilters,
  MonthNav,
  SplitRules,
  Stat,
  TrendBars,
  filterAppointments,
  fmtEur,
  fmtMoney,
  sendJson,
  useFinance,
  type ListFilter,
} from "./finance-shared";

// Staff earnings: the artist's own paid sessions, their share vs the owner's,
// and how much they still owe the owner (all-time share minus payouts).
export function ZaradaTab() {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const key = monthKey(offset);
  const { data, loading, error, setError, reload } = useFinance(key, 0);

  // The owner has the full studio view on Finansije.
  useEffect(() => {
    if (data?.role === "owner") router.replace("/admin/finansije");
  }, [data, router]);

  const me = data?.team[0] ?? null;
  const rate = data?.rate ?? 117.2;
  const list = useMemo(() => filterAppointments(data?.appointments ?? [], listFilter), [data, listFilter]);

  const patchAppt = async (id: number, fields: Record<string, unknown>) => {
    setBusyId(id);
    try {
      await sendJson("/api/admin/finance", "PATCH", { id, ...fields });
      await reload();
    } catch {
      setError("Izmena nije sačuvana.");
    } finally {
      setBusyId(null);
    }
  };

  const totals = data?.totals;

  return (
    <div className="adm__fin">
      <MonthNav monthKey={key} offset={offset} setOffset={setOffset} />

      {error && <p className="adm__err" role="alert">{error}</p>}

      {totals && me && (
        <div className="adm__stats">
          <Stat highlight value={fmtMoney(totals.artistEarned)} label="Moja zarada (RSD)" sub={fmtEur(totals.artistEarned, rate)} />
          <Stat
            value={fmtMoney(totals.ownerEarned + totals.artistEarned)}
            label="Naplaćeno (RSD)"
            sub={`${totals.paidSessions}/${totals.sessions} plaćenih termina`}
          />
          <Stat value={fmtMoney(totals.ownerEarned)} label="Deo za ownera (RSD)" sub={fmtEur(totals.ownerEarned, rate)} />
          <Stat
            value={fmtMoney(Math.max(0, me.balance))}
            label="Dugujem owneru ukupno"
            sub={me.balance < -0.5 ? `Preplaćeno ${fmtMoney(-me.balance)}` : `isplaćeno do sad ${fmtMoney(me.paidOutTotal)}`}
          />
        </div>
      )}

      <SplitRules />

      {data && (
        <div className="adm__fin-grid">
          <section className="adm__fin-section">
            <h3>Moja zarada — 6 meseci</h3>
            <TrendBars trend={data.trend} pick={(p) => p.artist} current={key} />
          </section>
          <section className="adm__fin-section">
            <h3>Isplate owneru u mesecu</h3>
            {data.payouts.length === 0 ? (
              <p className="adm__empty">Nema isplata u ovom mesecu.</p>
            ) : (
              <div className="adm__list">
                {data.payouts.map((p) => (
                  <article key={p.id} className="adm__row adm__fin-payout adm__fin-payout--ro">
                    <div className="adm__when">
                      <strong>{fmtDate(p.paid_on)}</strong>
                    </div>
                    <div className="adm__who">{p.note && <p>{p.note}</p>}</div>
                    <strong className="adm__fin-amount">{fmtMoney(p.amount)} RSD</strong>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <section className="adm__fin-section">
        <h3>Moji termini</h3>
        <ListFilters value={listFilter} onChange={setListFilter} />
        <div className="adm__list">
          {loading && !data && <p className="adm__empty">Učitavanje…</p>}
          {data && list.length === 0 && <p className="adm__empty">Nema termina.</p>}
          {list.map((a) => (
            <FinRow
              key={a.id}
              a={a}
              busy={busyId === a.id}
              onPatch={patchAppt}
              labels={{ owner: "Owneru", artist: "Meni", own: "Owner" }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
