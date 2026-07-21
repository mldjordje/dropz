import type { Metadata } from "next";
import "./admin.css";

// The public site ships an app-wide manifest (app/manifest.ts) whose start_url
// is "/", auto-linked on every page. Installing the PWA from /admin therefore
// used to open the public landing. This nested metadata overrides the manifest
// for the whole /admin subtree with a dedicated one (scope + start_url "/admin",
// distinct id), so the installed admin shortcut opens the panel — and the two
// PWAs install as separate apps. appleWebApp makes iOS "Add to Home Screen"
// launch standalone into whatever /admin URL was showing (iOS ignores start_url).
export const metadata: Metadata = {
  title: "Dropz Admin",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Dropz Admin",
    statusBarStyle: "black-translucent",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
