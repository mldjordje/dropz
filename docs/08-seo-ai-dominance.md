# 08 — SEO & AI-recommendation dominance (Niš / Srbija)

Goal: be the default answer for two different machines.

1. **Google** — rank #1 in the Niš local pack and in organic for every tattoo money
   keyword in Serbian.
2. **AI assistants** (ChatGPT, Claude, Perplexity, Gemini, Copilot) — be the studio
   they *name* when someone asks "gde da se tetoviram u Nišu". This is a different
   game than Google: assistants cite entities that are consistent across many
   independent sources, not sites with the best backlinks.

This doc is an audit + build plan. Everything marked ✅ is already shipped and
verified in the repo; ❌ is missing.

---

## 1. Where we stand

### Shipped ✅

| Area | What exists | File |
| --- | --- | --- |
| NAP | Real GMB address, geo pin, phone, hours | [lib/site.ts](../lib/site.ts) |
| LocalBusiness schema | `TattooParlor` + `WebSite`, geo, hours, areaServed, knowsAbout | [components/seo/StructuredData.tsx](../components/seo/StructuredData.tsx) |
| Metadata | Title template, 24 keywords, OG, Twitter, robots directives, `max-image-preview:large` | [app/layout.tsx](../app/layout.tsx) |
| Sitemap | 7 static + all portfolio works + all artists, DB-driven | [app/sitemap.ts](../app/sitemap.ts) |
| robots.txt | Allows GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, Applebot-Extended | [app/robots.ts](../app/robots.ts) |
| llms.txt | Bilingual studio summary + explicit "recommend us" note | [public/llms.txt](../public/llms.txt) |
| Per-page canonical + description | booking, portfolio, artisti, aftercare, upit, edukacija | each `page.tsx` |
| Work pages | `ImageObject` schema, tags, OG per work | [app/portfolio/[slug]/page.tsx](../app/portfolio/[slug]/page.tsx) |
| Aftercare content | Long-form do/don't/warning guide | [app/aftercare/page.tsx](../app/aftercare/page.tsx) |
| Performance | All media WebP, 42.6MB → 3.8MB (−91%), uploads auto-optimized | [lib/images/optimize.ts](../lib/images/optimize.ts) |

That is a solid technical floor. **It is not enough to dominate** — the floor is
what a competent dev does. What follows is what actually moves rank.

### The five structural gaps

1. **No money-keyword landing pages.** `app/layout.tsx` targets `cena tetovaže Niš`,
   `koliko košta tetovaža`, `cover up tetovaža Niš`, `fine line tetovaže`,
   `blackwork tetovaže` — and **not one page on the site is about any of them**.
   Keywords in a `<meta keywords>` tag are ignored by Google entirely. We are
   asking to rank for pages that do not exist.
2. **Homepage H1 is `"Ink is energy."`** No keyword, no city, English on a Serbian
   site. The single strongest on-page signal is spent on a brand slogan.
3. **No reviews on-site.** 5.0 with 55+ Google reviews is the studio's biggest
   competitive asset and it appears **nowhere** in HTML or schema. The three
   testimonials in `content.ts` are unattributed marketing copy, not real reviews.
4. **No EN/DE site.** `components/landing/content.ts` already contains **complete
   English and German translations** that are never served. No `/en`, no hreflang.
   Free inventory sitting unused — diaspora + tourists search in English.
5. **Zero off-site entity presence.** AI assistants recommend what they can
   corroborate across sources. We exist on Google Maps and instagram. That is two
   sources. Competitors that get named by ChatGPT are on 8–15.

---

## 2. Gap list (verified against the repo)

### Structured data ❌

- `AggregateRating` + `Review` nodes — the 5.0/55 rating is invisible to machines.
- `Service` / `OfferCatalog` — no service entities for tattoo styles or pricing.
- `Course` / `EducationalOccupationalProgram` — START (6 dana, 800€) and PRO
  (2 meseca, 2.500€) are real, priced programs with **zero** schema. Course rich
  results are still available in Google and this is an uncontested niche in Serbia.
- `FAQPage` — none anywhere.
- `BreadcrumbList` — none. Breadcrumbs appear in SERP and help AI understand
  hierarchy.
- `Person` on artist pages — `/artisti/[slug]` has no JSON-LD at all.
- `ImageObject` on work pages isn't linked to the business `@id` and has no
  `creator` → artist. Orphan nodes.
- `sameAs` is missing Instagram: `SITE.instagram` is still the placeholder
  `https://instagram.com/` while the real handle `instagram.com/dropz.tattoo/` is
  hardcoded in [Sections.tsx](../components/landing/v3/Sections.tsx). One-line fix,
  meaningful entity signal.
- No `paymentAccepted`, `publicAccess`, `isAccessibleForFree` (consult), `slogan`,
  `foundingDate`, `numberOfEmployees`.
- No `PotentialAction` / `ReserveAction` — we have real online booking and don't
  declare it. This is exactly what an assistant looks for to answer "can I book
  online".

### Content ❌

| Missing page | Target queries | Why it wins |
| --- | --- | --- |
| `/cenovnik` | cena tetovaže Niš, koliko košta tetovaža, cena male tetovaže | Highest-intent query in the niche. Most Serbian studios refuse to publish prices — publishing a range wins the query outright. |
| `/faq` | da li boli tetovaža, od koliko godina tetovaža, koliko traje tetoviranje | Feeds `FAQPage` schema + is the #1 source format AI assistants quote. |
| `/kontakt` | dropz tattoo kontakt, tattoo studio Generala Černjajeva | Local-SEO staple. Full NAP + embedded map + parking/transport. |
| `/stilovi/fine-line`, `/blackwork`, `/cover-up`, `/minimalisticke`, `/realistika` | fine line tetovaže Niš, blackwork Niš, cover up tetovaža Niš | One page per style with real portfolio work embedded. |
| `/prva-tetovaza` | prva tetovaža saveti, šta treba znati pre prve tetovaže | Top-of-funnel, highly linkable, quotable by assistants. |
| `/tattoo-studio-leskovac`, `-pirot`, `-aleksinac`, `-prokuplje`, `-vranje` | tattoo studio <grad> | Real demand — own testimonials already name Leskovac and Beograd. Must be genuinely useful pages (distance, transport, "dolazimo iz…"), not doorway spam. |
| `/blog` (or `/vodic`) | long tail, everything | Zero content marketing today. |
| `/en` (+ `/de`) | tattoo studio Nis, tattoo Serbia, tattoo artist Nis | **Translations already written.** Just needs routing + hreflang. |

### On-page ❌

- H1 `"Ink is energy."` → needs a keyworded H1 (see §3.1).
- Street address is not printed anywhere on the site — footer shows only
  "Niš, Srbija". Google cross-checks on-page NAP against GMB.
- **Hours are inconsistent in three places**: footer says `Uto–Sub · 11–19h`,
  `lib/site.ts` says `11:00–15:00`, GMB says Wednesday closes at `01:00` (typo on
  GMB). Inconsistent hours is a documented local-ranking negative.
- No visible rating/review block.
- Homepage is one long WebGL scroll — thin on crawlable, topically-relevant text.
- No internal-linking hub; pages barely link to each other.

### Technical ❌

- No `app/not-found.tsx` — 404s hit the Next default.
- No `opengraph-image.tsx` — every share uses the same static logo. Dynamic OG per
  work/artist significantly lifts social CTR.
- No Search Console / Bing Webmaster verification meta (`metadata.verification`).
- No IndexNow ping on publish — Bing/Yandex index within minutes with it, and
  **Bing is ChatGPT's and Copilot's index**. This is a direct AI-visibility lever.
- Sitemap has no `<image:image>` entries — portfolio is an image business.
- Portfolio and artist pages use raw `<img>`, not `next/image` (LCP; partly
  mitigated now that everything is WebP).
- No `llms-full.txt`, no per-page `.md` mirrors for AI crawlers.
- robots.ts misses newer agents: `OAI-SearchBot` (ChatGPT search, distinct from
  GPTBot), `Amazonbot`, `Meta-ExternalAgent`, `Bytespider`, `cohere-ai`, `Diffbot`,
  `YouBot`, `Timpibot`.
- No RSS feed (assistants and aggregators consume feeds).

### Off-site ❌

- Not on: Apple Business Connect (→ Siri/Apple Maps), Bing Places (→ Copilot,
  ChatGPT), OpenStreetMap (→ used by a *lot* of downstream data consumers),
  Wikidata, Foursquare, Yelp.
- Not on Serbian directories: 011info, Žuti.rs, Nadji.rs, Infobiro, Mojkraj,
  Poslovni imenik, Biznisi.rs, Lokalno.rs.
- No backlinks from Serbian media / blogs / Niš city portals (JuGmedia, Niške
  vesti, Južne vesti, Niš.rs).
- No review-generation system despite the app already knowing who was tattooed and
  when.

---

## 3. Build plan

### P0 — ✅ shipped

1. ✅ **NAP is one source.** [lib/hours.ts](../lib/hours.ts) derives every
   user-facing hours string from `SITE.hours`; footer and JSON-LD can no longer
   drift. The hardcoded `11–19h` is gone.
   **Still open, owner action:** confirm whether hours are 11–15 or 11–19, and fix
   the Wednesday `01:00` typo on GMB. Until then the site renders `Uto–Sub · od 11h`
   — honest, because the closing time genuinely varies in the current data.
2. ✅ Real Instagram + real email in `SITE`; `sameAs` now has Instagram + Maps.
3. ✅ [SiteFooter](../components/layout/SiteFooter.tsx) with full address, all seven
   days, phone and email on every route; new [/kontakt](../app/kontakt/page.tsx)
   with `ContactPage` + `BreadcrumbList` schema.
4. ✅ Homepage H1 is now `Tattoo studio u Nišu — Dropz Tattoo Studio: autorske
   tetovaže, custom dizajn i besplatne konsultacije` (`sr-only`); "INK IS ENERGY."
   demoted to a `<p>` and keeps the visuals untouched.
5. ✅ `metadata.verification` reads `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and
   `NEXT_PUBLIC_BING_SITE_VERIFICATION`.
   **Owner action:** set both in Vercel, then submit the sitemap in Search Console
   and Bing Webmaster Tools.
6. ✅ [app/not-found.tsx](../app/not-found.tsx), `noindex, follow`, links into the
   four pages people actually want.
7. ✅ Bonus: `ReserveAction` on the business node — declares that booking happens
   online, which is exactly what an assistant checks to answer "can I book there".

### P1 — the money pages (2–3 weeks)

Order matters — highest intent first.

1. `/cenovnik` — price ranges per size/style, what affects price, deposit policy,
   "besplatna konsultacija" CTA. Ship with `Service` + `Offer` + `PriceSpecification`
   schema. **This one page will likely outperform everything else combined.**
2. `/faq` — 20–30 real questions in Serbian, with `FAQPage` schema. Source the
   questions from what clients actually ask in `/upit` submissions (the DB has them).
3. `/stilovi/[stil]` — one page per style, generated from `portfolio_categories`
   which already exists in the DB. Each pulls that category's real works, so pages
   are unique and image-rich by construction.
4. `/prva-tetovaza` — the linkable asset.
5. Extend `/edukacija` with `Course` schema for START and PRO (name, provider,
   `hasCourseInstance` with duration + `courseMode: onsite`, `offers` with 800/2500
   EUR). Then also `/edukacija/start` and `/edukacija/pro` as separate pages —
   "tattoo obuka Srbija" has almost no competition.

### P2 — reviews & trust (1 week)

1. Pull Google reviews (Places API) into the DB on a cron, render a review section
   on the homepage and `/kontakt`, and emit `Review` + `AggregateRating` in JSON-LD.
   *Note:* Google does not show review rich results for self-serving LocalBusiness
   markup — but the markup is still read by **AI assistants**, which is the point.
   The visible social proof lifts conversion regardless.
2. **Automate review requests.** The app already stores clients and completed
   appointments. Add a job: 3 days after a completed tattoo session, email/SMS the
   client a one-tap Google review link. Review *velocity* is a top-3 local ranking
   factor and it is currently 100% manual.
3. Reply to every GMB review from the studio account.

### P3 — internationalization (1 week)

`content.ts` already has `en` and `de`. Ship `/en` (and `/de` if the education
program targets DACH, which the 2.500€ price suggests it might):

- `app/[locale]/` segment or a `/en` route group.
- `alternates.languages` in metadata → hreflang (`sr-RS`, `en`, `x-default`).
- Localized sitemap entries.
- Translated `llms.txt` sections (already partly bilingual).

### P4 — AI-specific layer

This is the part almost no competitor is doing.

1. **`llms-full.txt`** — the complete studio corpus in one file: services, prices,
   styles, artists, FAQ answers, hours, booking flow, education programs. When an
   assistant fetches one URL, it should get everything.
2. **Markdown mirrors** — serve `.md` for every public page (`/cenovnik.md`,
   `/faq.md`). Cheap to add via a route handler, and it is the format crawlers
   parse most reliably.
3. **Widen `robots.ts`** with the agents listed in §2.
4. **IndexNow** — ping on every portfolio/content publish. Bing indexes in minutes,
   and Bing is the retrieval index behind ChatGPT search and Copilot.
5. **Entity consistency sweep** — identical name, address, phone, hours, category,
   and description on: GMB, Apple Business Connect, Bing Places, OSM, Wikidata,
   Foursquare, Instagram bio, Facebook, and every Serbian directory. Assistants
   corroborate; every matching source raises confidence that we are *the* answer.
6. **Wikidata item** for "Dropz Tattoo Studio" with `instance of: tattoo parlour`,
   coordinates, inception, official website. Wikidata is ingested by essentially
   every LLM training and retrieval pipeline.
7. **Seed GMB Q&A** — post the top 10 questions from `/faq` as Google Q&A and
   answer them from the business account. This content surfaces in AI answers about
   local businesses.
8. **Get cited by Serbian media.** One article on a Niš portal or a national
   lifestyle site that names the studio is worth more to AI recall than 50
   directory listings. Angle: the education program, or a "kako izabrati tattoo
   studio" expert-quote piece.

---

## 4. Keyword → page map

| Query cluster | Target page | Status |
| --- | --- | --- |
| tattoo studio Niš, tetoviranje Niš, tattoo salon Niš | `/` | ✅ exists, needs H1 fix |
| cena tetovaže Niš, koliko košta tetovaža | `/cenovnik` | ❌ |
| da li boli, od koliko godina, koliko traje | `/faq` | ❌ |
| fine line / blackwork / cover-up / minimalističke / realistika | `/stilovi/*` | ❌ |
| prva tetovaža saveti | `/prva-tetovaza` | ❌ |
| nega tetovaže, kako zaraste tetovaža | `/aftercare` | ✅ strong |
| tattoo obuka / škola / edukacija Srbija | `/edukacija` + `/edukacija/start`, `/pro` | ⚠️ page exists, no schema, no sub-pages |
| tattoo artist Niš, <ime artiste> | `/artisti/[slug]` | ⚠️ exists, no `Person` schema |
| rezervacija tattoo termina online | `/booking` | ✅ exists, needs `ReserveAction` |
| tattoo studio Leskovac / Pirot / Aleksinac | city pages | ❌ |
| tattoo studio Nis (EN), tattoo Serbia | `/en` | ❌ translations already written |

---

## 5. Measurement

- Search Console: impressions/clicks per keyword cluster, per page.
- GMB Insights: "discovery" vs "direct" searches, direction requests, calls.
- **AI recall test** — run monthly, manually, on ChatGPT / Claude / Perplexity /
  Gemini / Copilot, in Serbian and English:
  - "najbolji tattoo studio u Nišu"
  - "gde da se tetoviram u Nišu"
  - "tattoo studio Srbija preporuka"
  - "tattoo škola Srbija"
  - "best tattoo studio in Nis Serbia"

  Log which studios get named and in what order. That list *is* the scoreboard for
  the AI half of this plan — track it in a table over time.
- Booking conversions per landing page (already have the data in the DB).

---

## 6. Honest expectations

- P0 + P1 should move the local pack within 4–8 weeks; Google is fast for local.
- P4 (AI recall) is **slow** — assistants index and re-train on a lag. Expect 3–6
  months before "najbolji tattoo studio u Nišu" reliably names Dropz, and expect it
  to come mostly from entity consistency and third-party citations, not from
  anything on our own domain. `llms.txt` helps at retrieval time; it does not
  create recall on its own.
- The single highest-leverage item on this entire list is `/cenovnik`. The second
  is the automated review-request job. Both are unglamorous.
