"use client";

import { Fragment, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { fmtDate, monthKey, todayIso } from "./shared";
import {
  FinRow,
  ListFilters,
  METHOD_LABEL,
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
  type TeamEntry,
} from "./finance-shared";

// Owner finance: own earnings (own sessions + share from the team), per-artist
// breakdown with running debt, payout ledger, 6-month trend and the editable
// appointment list.
export function FinansijeTab() {
  const [offset, setOffset] = useState(0);
  const [artistId, setArtistId] = useState(0);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [payFor, setPayFor] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayIso());
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  const key = monthKey(offset);
  const { data, loading, error, setError, reload } = useFinance(key, artistId);

  const team = useMemo(() => data?.team ?? [], [data]);
  const rate = data?.rate ?? 117.2;
  const totals = data?.totals;
  const selected = team.find((t) => t.id === artistId) ?? null;
  const teamDebt = team.reduce((sum, t) => sum + (t.role === "staff" ? Math.max(0, t.balance) : 0), 0);
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

  const saveRate = async (value: string) => {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0 || v === rate) return;
    try {
      await sendJson("/api/admin/finance", "PATCH", { eurRate: v });
      await reload();
    } catch {
      setError("Kurs nije sačuvan.");
    }
  };

  const openPayout = (t: TeamEntry) => {
    setPayFor(t.id);
    setPayAmount(t.balance > 0 ? String(Math.round(t.balance)) : "");
    setPayDate(todayIso());
    setPayNote("");
  };

  const savePayout = async () => {
    if (payFor == null) return;
    setPaySaving(true);
    try {
      await sendJson("/api/admin/finance/payouts", "POST", {
        staffId: payFor,
        amount: Number(payAmount),
        date: payDate,
        note: payNote,
      });
      setPayFor(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Isplata nije sačuvana.");
    } finally {
      setPaySaving(false);
    }
  };

  const deletePayout = async (id: number) => {
    if (!window.confirm("Obrisati ovu isplatu?")) return;
    try {
      await sendJson("/api/admin/finance/payouts", "DELETE", { id });
      await reload();
    } catch {
      setError("Isplata nije obrisana.");
    }
  };

  return (
    <div className="adm__fin">
      <div className="adm__fin-head">
        <MonthNav monthKey={key} offset={offset} setOffset={setOffset} />
        {data && (
          <label className="adm__fin-rate">
            Kurs 1 € =
            <input
              key={rate}
              type="number"
              min={1}
              step={0.1}
              defaultValue={rate}
              onBlur={(e) => saveRate(e.target.value)}
            />
            RSD
          </label>
        )}
      </div>

      {team.length > 0 && (
        <div className="adm__filters">
          <button type="button" className="adm__filter" aria-pressed={artistId === 0} onClick={() => setArtistId(0)}>
            Ceo studio
          </button>
          {team.map((t) => (
            <button key={t.id} type="button" className="adm__filter" aria-pressed={artistId === t.id} onClick={() => setArtistId(t.id)}>
              {t.role === "owner" ? `${t.name} ★` : t.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="adm__err" role="alert">{error}</p>}

      {totals && (selected?.role === "staff" ? (
        <div className="adm__stats">
          <Stat highlight value={fmtMoney(totals.ownerEarned)} label="Moj deo (RSD)" sub={fmtEur(totals.ownerEarned, rate)} />
          <Stat value={fmtMoney(totals.artistEarned)} label={`Zarada — ${selected.name}`} sub={fmtEur(totals.artistEarned, rate)} />
          <Stat
            value={fmtMoney(totals.ownerEarned + totals.artistEarned)}
            label="Naplaćeno (RSD)"
            sub={`${totals.paidSessions}/${totals.sessions} plaćenih termina`}
          />
          <Stat
            value={fmtMoney(Math.max(0, selected.balance))}
            label="Duguje ukupno (RSD)"
            sub={selected.balance < 0 ? `Preplaćeno ${fmtMoney(-selected.balance)}` : fmtEur(Math.max(0, selected.balance), rate)}
          />
        </div>
      ) : (
        <div className="adm__stats">
          <Stat
            highlight
            value={fmtMoney(totals.ownerEarned)}
            label="Moja zarada (RSD)"
            sub={`${fmtEur(totals.ownerEarned, rate)} · moji termini ${fmtMoney(totals.ownerFromOwn)} · od tima ${fmtMoney(totals.ownerFromStaff)}`}
          />
          <Stat
            value={fmtMoney(totals.collected)}
            label="Naplaćeno (RSD)"
            sub={`${totals.paidSessions}/${totals.sessions} plaćenih termina`}
          />
          {artistId === 0 && (
            <Stat value={fmtMoney(teamDebt)} label="Tim duguje ukupno (RSD)" sub={fmtEur(teamDebt, rate)} />
          )}
          <Stat value={fmtMoney(totals.outstanding)} label="Nenaplaćeno (RSD)" sub={`od ugovorenih ${fmtMoney(totals.priced)}`} />
        </div>
      ))}

      {artistId === 0 && team.length > 0 && (
        <section className="adm__fin-section">
          <h3>Tim — {data ? "ovaj mesec" : ""}</h3>
          <div className="adm__fin-table">
            <div className="adm__fin-tr adm__fin-tr--head">
              <span>Artist</span>
              <span className="num">Termini</span>
              <span className="num">Naplaćeno</span>
              <span className="num">Radniku</span>
              <span className="num">Meni</span>
              <span className="num">Isplatio (mes.)</span>
              <span className="num">Duguje ukupno</span>
              <span />
            </div>
            {team.map((t) => (
              <Fragment key={t.id}>
                <div className="adm__fin-tr">
                  <span>
                    <button type="button" className="adm__fin-link" onClick={() => setArtistId(t.id)}>
                      {t.name}
                    </button>
                    {t.role === "owner" && " ★"}
                  </span>
                  <span className="num">{t.paidSessions}/{t.sessions}</span>
                  <span className="num">{fmtMoney(t.collected)}</span>
                  <span className="num">{t.role === "owner" ? "—" : fmtMoney(t.artistShare)}</span>
                  <span className="num">{fmtMoney(t.ownerShare)}</span>
                  <span className="num">{t.role === "owner" ? "—" : fmtMoney(t.payoutsMonth)}</span>
                  <span className={`num ${t.balance > 0.5 ? "adm__fin-debt" : "adm__fin-ok"}`}>
                    {t.role === "owner" ? "—" : t.balance < -0.5 ? `+${fmtMoney(-t.balance)}` : fmtMoney(Math.max(0, t.balance))}
                  </span>
                  <span className="num">
                    {t.role === "staff" && (
                      <button type="button" className="adm__fin-btn" onClick={() => (payFor === t.id ? setPayFor(null) : openPayout(t))}>
                        Isplata
                      </button>
                    )}
                  </span>
                </div>
                {payFor === t.id && (
                  <div className="adm__fin-payform">
                    <label>
                      Iznos (RSD)
                      <input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                    </label>
                    <label>
                      Datum
                      <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                    </label>
                    <label className="adm__fin-payform-note">
                      Napomena
                      <input type="text" maxLength={200} value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="npr. gotovina u studiju" />
                    </label>
                    <button
                      type="button"
                      className="adm__fin-btn adm__fin-btn--primary"
                      disabled={paySaving || !(Number(payAmount) > 0)}
                      onClick={savePayout}
                    >
                      {paySaving ? "Čuvam…" : `${t.name} je isplatio`}
                    </button>
                    <button type="button" className="adm__fin-btn" onClick={() => setPayFor(null)}>
                      Otkaži
                    </button>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </section>
      )}

      {data && (
        <div className="adm__fin-grid">
          <section className="adm__fin-section">
            <h3>{selected?.role === "staff" ? `Moj deo od ${selected.name} — 6 meseci` : "Moja zarada — 6 meseci"}</h3>
            <TrendBars trend={data.trend} pick={(p) => p.owner} current={key} />
          </section>
          <section className="adm__fin-section">
            <h3>Način plaćanja</h3>
            <div className="adm__fin-methods">
              {(["cash", "card", "transfer", "other"] as const).map((m) => (
                <div key={m}>
                  <span>{METHOD_LABEL[m]}</span>
                  <strong>{fmtMoney(data.totals.methods[m])}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {data && data.payouts.length > 0 && (
        <section className="adm__fin-section">
          <h3>Isplate u mesecu</h3>
          <div className="adm__list">
            {data.payouts.map((p) => (
              <article key={p.id} className="adm__row adm__fin-payout">
                <div className="adm__when">
                  <strong>{fmtDate(p.paid_on)}</strong>
                </div>
                <div className="adm__who">
                  <strong>{p.staff_name}</strong>
                  {p.note && <p>{p.note}</p>}
                </div>
                <strong className="adm__fin-amount">{fmtMoney(p.amount)} RSD</strong>
                <button type="button" className="adm__fin-btn" aria-label="Obriši isplatu" onClick={() => deletePayout(p.id)}>
                  <Trash2 size={13} strokeWidth={1.6} />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <SplitRules />

      <section className="adm__fin-section">
        <h3>Termini</h3>
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
              labels={{ owner: "Meni", artist: a.artist_name ?? "Radnik", own: "Moj termin" }}
              showArtist={artistId === 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
