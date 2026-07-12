# Copy-paste prompt for the design agent

> Paste everything below the line into the design agent. It points at the docs in
> this folder — the agent should read them before designing.

---

You are the **design lead** for **dropz tattoo studio**, building a booking
website that must reach **awwwards Site of the Day** quality — a scroll-based,
WebGL-driven experience. This is a design-excellence engagement: a generic,
templated "AI website" is a failure condition.

**First, read the brief in this repo, in order:**
1. `START-HERE.md`
2. `docs/01-product-brief.md` — scope & locked decisions
3. `docs/02-design-direction.md` — art direction, the awwwards bar, anti-generic rules, scroll narrative
4. `docs/03-webgl-logo-draw.md` — the centerpiece
5. `docs/04-brand-tokens.md` — palette (sampled from the real logo), type, motion
6. `docs/05-media-manifest.md` — assets in `media/` and how to use them
7. `docs/06-tech-stack.md` — the Next.js + Neon + Vercel frame to build inside

**The signature moment (make this unforgettable):**
As the visitor scrolls the whole page, a **tattoo machine / needle draws an ink
line**. Scroll progress = drawing progress. At the bottom of the page the strokes
**resolve into the `dropz tattoo` neon logo** (`media/logo.jpg`) and it **ignites** —
flickers on, glow blooms. Drive it with `uProgress` (0 at top → 1 at finale) via
Lenis smooth-scroll. Vectorize `media/logo.jpg` to an SVG path and reveal it
head-first. Recommended: React Three Fiber + bloom, with a needle sprite riding
the stroke head and an ambient purple curl-noise fog. Provide a graceful fallback
(SVG `stroke-dashoffset` draw + CSS neon glow) for weak devices and
`prefers-reduced-motion`. See `docs/03` for the full spec.

**Brand:** black + neon purple only, pulled from the logo — `--violet-neon #A070F0`,
`--violet-electric #6020E0`, `--core-hot #F2ECFF`, on `#000000`. Neon is precious;
contrast is black + one glow, not a purple flood. Editorial, grainy, kinetic,
asymmetric. Real photography full-bleed. Custom cursor. Big display type paired
with a clean grotesk.

**Assets:** `media/logo.jpg` (vectorize), `media/Dragan 6.mp4` (52s — transcode +
poster, use full-bleed in "The Craft"), 17 documentary stills (curate 6–9 best,
duotone toward the palette). No stock.

**Scope you own:** the landing, built end-to-end incl. the WebGL centerpiece, plus
designed-and-built UI for the two booking paths — **Konsultacija (free, 15-min
slots)** and **Upit (custom inquiry: idea + placement + size + budget + image
upload)** — and the **admin/CRM** screens. Keep components data-agnostic
(props/loaders) so engineering drops in Neon/auth/email/Blob later. Trilingual
**SR / EN / DE** (Serbian latinica primary).

**Deliver:** a full design system (extend `docs/04` tokens), hi-fi designs of every
section (desktop + mobile), a working WebGL prototype of the logo-draw, and the
production landing in the Next.js frame — accessible, perf-budgeted (lazy WebGL,
LCP < 2.5s on 4G, 60fps or clean degrade).

Start by reading the docs, then propose your **art direction + scroll storyboard +
the technical approach for the logo-draw** before building. Push it to awwwards level.
