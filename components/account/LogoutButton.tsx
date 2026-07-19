"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <button type="button" className="bkf__submit" onClick={logout} disabled={busy}>
      <span>{busy ? "Odjavljivanje…" : "Odjavi se"}</span>
      <LogOut size={16} strokeWidth={1.5} />
    </button>
  );
}
