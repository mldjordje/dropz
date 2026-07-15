import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Public, indexable routes only. /admin and /api are disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/booking`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/upit`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
