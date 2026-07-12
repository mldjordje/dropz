# 02 — Design Direction

## The bar
**awwwards Site of the Day**, not "nice startup page". Judged on: originality,
craft of motion, the WebGL centerpiece, typographic confidence, how the story
unfolds on scroll. If a section could appear on a generic SaaS template, redesign it.

## Mood
Neon ink in a black room. A single needle, humming. Purple glow bleeding into dark.
Editorial, confident, a little dangerous — a tattoo studio, not a spa. Grain,
weight, silence, then motion.

## Anti-generic rules (avoid the "AI site" tells)
- **No** rounded-corner card grids of equal boxes. **No** centered hero + 3 feature
  columns. **No** pastel gradient blobs. **No** stock icons. **No** Inter-everywhere.
- **Yes** asymmetry, broken grid, oversized editorial type, full-bleed real
  photography, intentional negative space, kinetic/scrolling type, a custom cursor,
  film grain overlay, tasteful scroll-pinning.
- Type: pair a characterful **display** face (wide, heavy, slightly technical —
  echo the logo's chunky letterforms) with a clean grotesk for body. Big scale jumps.
- Motion: everything eases; nothing pops. Reveal on scroll, parallax depth,
  magnetic buttons, text that assembles. Respect `prefers-reduced-motion`.

## Scroll narrative (spine — refine freely)
The page is one continuous "tattoo session". A glowing **ink stroke follows the
scroll**; the needle rides its head. (See doc 03 for the WebGL mechanics.)

1. **Hero / Void** — near-black, faint purple fog (WebGL). Studio name whispered,
   not shouted (logo is NOT drawn yet). The needle enters frame. A peek of the
   hero video. Scroll cue.
2. **The Work** — kinetic gallery of the portrait photos. Full-bleed, parallax,
   marquee of names/styles. The ink stroke threads between images.
3. **The Craft** — the 52s video as a full-bleed, scrub- or ambient-textured
   section. Quote / manifesto in oversized type over it.
4. **How it works** — two paths, rendered as two "ink" panels, not cards:
   **Konsultacija (15 min, besplatno)** and **Upit (imaš ideju? pošalji je)**.
5. **Booking CTA** — the ink stroke tightens toward the wordmark.
6. **Finale / Ignition** — the needle completes the last drip of the **`z`**; the
   accumulated stroke **resolves into the `dropz tattoo` neon logo** and flickers
   on. Footer: hours, address, socials, language switch.

## Responsive
- Mobile is a first-class citizen, not an afterthought. Re-choreograph, don't shrink.
- WebGL: detect capability. Weak device / `prefers-reduced-motion` → static hero +
  poster image + CSS/SVG stroke-draw fallback of the logo (still hits the payoff).

## Deliverables from you (design agent)
1. Full **design system** (tokens in doc 04, extended: type scale, spacing, motion curves).
2. **Hi-fi design** of every section above (desktop + mobile), your tool of choice.
3. Working **WebGL prototype** of the logo-draw centerpiece (doc 03).
4. Built landing in the Next.js frame (doc 06), production-ready, accessible,
   perf-budgeted (Lighthouse: LCP < 2.5s on 4G with lazy WebGL).
5. Booking + inquiry + admin screens designed to match (engineering wires data).
