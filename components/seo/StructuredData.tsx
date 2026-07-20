import { SITE, OG_IMAGE } from "@/lib/site";

// JSON-LD structured data. TattooParlor is a LocalBusiness subtype Google
// understands for local packs; the same node feeds AI assistants that read
// schema.org. Address / geo / hours are emitted ONLY when the confirmed data
// is present in lib/site.ts — never ship placeholder NAP.

export function StructuredData() {
  const hasAddress = SITE.street.length > 0;
  const hasGeo = true; // real GMB pin coordinates present in lib/site.ts
  const hasHours = SITE.hours.length > 0;
  const hasRealInstagram = SITE.instagram.replace(/\/+$/, "") !== "https://instagram.com";

  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TattooParlor",
    "@id": `${SITE.url}/#business`,
    name: SITE.name,
    url: SITE.url,
    image: `${SITE.url}${OG_IMAGE}`,
    logo: `${SITE.url}${OG_IMAGE}`,
    description: SITE.description,
    telephone: SITE.phone,
    email: SITE.email,
    priceRange: "$$",
    currenciesAccepted: "RSD",
    hasMap: SITE.googleMaps,
    areaServed: [
      { "@type": "City", name: SITE.city },
      { "@type": "Country", name: "Serbia" },
    ],
    knowsAbout: [
      "tetoviranje",
      "custom tattoo dizajn",
      "fine line tetovaže",
      "blackwork",
      "cover-up tetovaže",
      "tattoo konsultacije",
    ],
  };

  if (hasAddress) {
    business.address = {
      "@type": "PostalAddress",
      streetAddress: SITE.street,
      addressLocality: SITE.city,
      postalCode: SITE.postalCode,
      addressCountry: SITE.country,
    };
  } else {
    // Without a street we still declare the locality so the city association holds.
    business.address = {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressCountry: SITE.country,
    };
  }

  if (hasGeo) {
    business.geo = { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng };
  }

  if (hasHours) {
    business.openingHoursSpecification = SITE.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    }));
  }

  business.sameAs = hasRealInstagram ? [SITE.instagram, SITE.googleMaps] : [SITE.googleMaps];

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    inLanguage: "sr-RS",
    publisher: { "@id": `${SITE.url}/#business` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(business) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
