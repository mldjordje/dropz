"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, UserPlus } from "lucide-react";

type StaffMember = {
  id: number;
  email: string;
  name: string;
  role: "owner" | "staff";
  active: boolean;
  avatar_url: string | null;
  created_at: string;
};

export function TimTab() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setStaff(data.staff);
    } catch {
      setError("Ne mogu da učitam tim.");
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Dodavanje nije uspelo.");
        return;
      }
      setName("");
      setEmail("");
      await load();
    } catch {
      setError("Dodavanje nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: number, payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Izmena nije uspela.");
        return;
      }
      await load();
    } catch {
      setError("Izmena nije uspela.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm__tim">
      <h1>Tim</h1>
      <p className="adm__hint">
        Dodaj artista sa njegovim gmail nalogom — kad se prijavi preko Google, otvara mu se
        staff panel (kalendar + dostupnost). Deaktiviran član ne može da se prijavi.
      </p>
      {error && <p className="adm__err" role="alert">{error}</p>}

      <div className="adm__tim-add">
        <input
          type="text"
          placeholder="Ime"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
        <input
          type="email"
          placeholder="gmail adresa"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <button type="button" onClick={add} disabled={busy || !name.trim() || !email.trim()}>
          <UserPlus size={16} strokeWidth={1.6} /> Dodaj
        </button>
      </div>

      <div className="adm__tim-list">
        {staff === null && <p className="adm__hint">Učitavanje…</p>}
        {staff?.map((m) => (
          <article key={m.id} className={`adm__tim-card${m.role === "owner" ? " adm__tim-card--owner" : ""}${m.active ? "" : " adm__tim-card--off"}`}>
            <div className="adm__tim-avatar">
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- google-hosted avatar
                <img src={m.avatar_url} alt="" />
              ) : (
                <span>{m.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="adm__tim-info">
              <strong>
                {m.name}
                {m.role === "owner" && (
                  <em className="adm__tim-owner-badge">
                    <Crown size={12} strokeWidth={2} /> Owner
                  </em>
                )}
              </strong>
              <button
                type="button"
                className="adm__tim-email"
                title="Promeni email"
                onClick={() => {
                  const next = window.prompt("Novi gmail za ovog člana:", m.email);
                  if (next && next.trim() && next.trim() !== m.email) {
                    patch(m.id, { email: next.trim() });
                  }
                }}
                disabled={busy}
              >
                {m.email}
              </button>
              {!m.active && <small>Deaktiviran</small>}
            </div>
            {m.role !== "owner" && (
              <button
                type="button"
                className="adm__tim-toggle"
                onClick={() => patch(m.id, { active: !m.active })}
                disabled={busy}
              >
                {m.active ? "Deaktiviraj" : "Aktiviraj"}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
