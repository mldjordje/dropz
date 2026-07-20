// Central site constants — shared by metadata, sitemap, robots and JSON-LD.
// Keep NAP (name / address / phone) IDENTICAL to the Google Business Profile;
// mismatches hurt local ranking. NAP below mirrors the GMB listing
// "Dropz Tattoo Studio Niš" (Generala Černjajeva, Niš 18108).

export const SITE = {
  name: "Dropz Tattoo Studio",
  shortName: "Dropz Tattoo",
  // Production domain. Apex dropz.rs 308-redirects to www, so www is canonical.
  url: "https://www.dropz.rs",
  locale: "sr_RS",
  city: "Niš",
  country: "RS",
  phone: "+381601453087", // 060 145 3087 in international form
  // TODO(confirm): real inbox. Domain is dropz.rs, so likely studio@dropz.rs.
  email: "studio@dropz.rs",
  // TODO(confirm): real handle. Placeholder points at instagram.com root.
  instagram: "https://instagram.com/",
  street: "Generala Černjajeva",
  postalCode: "18108",
  // From the Google Business Profile map pin.
  geo: { lat: 43.3176334, lng: 21.9051088 },
  googleMaps:
    "https://www.google.com/maps/place/Dropz+Tattoo+Studio+Ni%C5%A1/@43.3176334,21.9051088,17z/data=!3m1!4b1!4m6!3m5!1s0x4755b1975546d89b:0x26c50da0852f15ca!8m2!3d43.3176334!4d21.9051088!16s%2Fg%2F11zcxpvjj2",
  // Mirrors GMB. NOTE: Wednesday closes at 01:00 on GMB — looks like a typo
  // there; fix on GMB first, then update here to match.
  hours: [
    { days: ["Tuesday", "Thursday", "Friday", "Saturday"], opens: "11:00", closes: "15:00" },
    { days: ["Wednesday"], opens: "11:00", closes: "01:00" },
  ] as { days: string[]; opens: string; closes: string }[],
  description:
    "Dropz Tattoo Studio u Nišu — autorske tetovaže, custom dizajn, besplatne konsultacije i online rezervacija termina. Najbolje ocenjeni tattoo studio u Nišu (5.0 na Google-u).",
} as const;

export const OG_IMAGE = "/media/dropz%20png%20logo%20original-01.png";
