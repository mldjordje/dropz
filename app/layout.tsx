import type { Metadata, Viewport } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SITE, OG_IMAGE } from "@/lib/site";
import { StructuredData } from "@/components/seo/StructuredData";

const display = Anton({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });
const body = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  // Static manifest via metadata (not the app/manifest.ts file convention) so a
  // nested segment — /admin — can override it with its own manifest. The file
  // convention injects globally and cannot be overridden per-route.
  manifest: "/site.webmanifest",
  title: {
    default: `${SITE.name} | ${SITE.city} — tetovaže i konsultacije`,
    template: `%s | ${SITE.shortName}`,
  },
  description: SITE.description,
  keywords: [
    "tattoo studio Niš",
    "tetovaža Niš",
    "tattoo Nis",
    "tetoviranje Niš",
    "dropz tattoo",
    "dropz tattoo studio",
    "custom tattoo Niš",
    "autorske tetovaže",
    "tattoo konsultacije",
    "rezervacija tattoo termina",
    "najbolji tattoo studio Niš",
    "najbolji tattoo studio Srbija",
    "tattoo studio Srbija",
    "tetovaže Srbija",
    "tattoo salon Niš",
    "tattoo majstor Niš",
    "fine line tetovaže",
    "blackwork tetovaže",
    "minimalističke tetovaže",
    "cover up tetovaža Niš",
    "prva tetovaža saveti",
    "koliko košta tetovaža",
    "cena tetovaže Niš",
    "tattoo edukacija Srbija",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} | ${SITE.city}`,
    description: SITE.description,
    images: [
      {
        url: OG_IMAGE,
        width: 1451,
        height: 519,
        alt: SITE.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | ${SITE.city}`,
    description: SITE.description,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "Tattoo studio",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr" className={`${display.variable} ${body.variable}`}>
      <body>
        <StructuredData />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
