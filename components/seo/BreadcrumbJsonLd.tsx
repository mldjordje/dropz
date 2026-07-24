import { SITE } from "@/lib/site";

// BreadcrumbList tells Google the site hierarchy (it renders as the path shown
// under a SERP result) and gives AI crawlers the parent/child relation between
// pages. "Početna" is prepended automatically.

export type Crumb = { name: string; path: string };

export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Početna", path: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE.url}${crumb.path}`,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
