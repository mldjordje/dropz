// Central site constants — shared by metadata, sitemap, robots and JSON-LD.
// Keep NAP (name / address / phone) IDENTICAL to the Google Business Profile;
// mismatches hurt local ranking. Fields marked TODO await confirmed business data.

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
  // TODO(confirm): exact street address as it appears on the Google Business Profile.
  street: "",
  postalCode: "",
  // TODO(confirm): geo coordinates from the Google Business Profile map pin.
  geo: { lat: 0, lng: 0 },
  // TODO(confirm): opening hours. Schema expects e.g.
  // [{ days: ["Monday"], opens: "12:00", closes: "20:00" }]
  hours: [] as { days: string[]; opens: string; closes: string }[],
  description:
    "Dropz Tattoo Studio u Nišu — autorski tattoo radovi, besplatne konsultacije i online rezervacija termina.",
} as const;

export const OG_IMAGE = "/media/dropz%20png%20logo%20original-01.png";
