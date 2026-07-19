"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Clock3,
  Inbox,
  SlidersHorizontal,
  Images,
  Users,
  FileText,
  Banknote,
  Settings,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: "bookingsNew" | "requestsPending";
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Pregled", icon: LayoutDashboard },
  { href: "/admin/kalendar", label: "Kalendar", icon: CalendarDays },
  { href: "/admin/termini", label: "Termini", icon: Clock3, badge: "bookingsNew" },
  { href: "/admin/zahtevi", label: "Zahtevi", icon: Inbox, badge: "requestsPending" },
  { href: "/admin/klijenti", label: "Klijenti", icon: Users },
  { href: "/admin/finansije", label: "Finansije", icon: Banknote },
  { href: "/admin/dostupnost", label: "Dostupnost", icon: SlidersHorizontal },
  { href: "/admin/portfolio", label: "Portfolio", icon: Images },
  { href: "/admin/sadrzaj", label: "Sadržaj", icon: FileText },
  { href: "/admin/podesavanja", label: "Podešavanja", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [badges, setBadges] = useState<{ bookingsNew: number; requestsPending: number }>({
    bookingsNew: 0,
    requestsPending: 0,
  });

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.ok) {
          setBadges({ bookingsNew: data.counts.bookingsNew, requestsPending: data.counts.requestsPending });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const badgeValue = (item: NavItem) => (item.badge ? badges[item.badge] : 0);

  return (
    <div className="adm__shell">
      <aside className="adm__side">
        <div className="adm__brand">
          Dropz <small>ADMIN</small>
        </div>
        <nav className="adm__nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const n = badgeValue(item);
            return (
              <Link key={item.href} href={item.href} className="adm__nav-item" aria-current={isActive(item.href) ? "page" : undefined}>
                <Icon size={16} strokeWidth={1.6} />
                <span>{item.label}</span>
                {n > 0 && <em className="adm__nav-badge">{n}</em>}
              </Link>
            );
          })}
        </nav>
        <button className="adm__logout adm__side-logout" onClick={logout}>
          Odjava
        </button>
      </aside>

      <div className="adm__body">
        <header className="adm__top adm__top--shell">
          <div className="adm__brand adm__brand--mobile">
            Dropz <small>ADMIN</small>
          </div>
          <button className="adm__logout adm__top-logout" onClick={logout}>
            Odjava
          </button>
        </header>
        <main className="adm__main">{children}</main>
      </div>

      <nav className="adm__bottomnav">
        {NAV.map((item) => {
          const Icon = item.icon;
          const n = badgeValue(item);
          return (
            <Link key={item.href} href={item.href} className="adm__bn-item" aria-current={isActive(item.href) ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.6} />
              <span>{item.label}</span>
              {n > 0 && <em className="adm__nav-badge adm__nav-badge--bn">{n}</em>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
