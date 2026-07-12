# dropz tattoo — START HERE (design agent entry point)

You are the design lead for **dropz tattoo studio** — a booking website.
Your job: take this from empty folder to an **awwwards-worthy, scroll-based,
WebGL landing** + the supporting product pages, then hand the shell to
engineering. Design excellence is the whole point of this engagement. Do not
ship a generic "AI website".

## Read in this order
1. [`docs/01-product-brief.md`](docs/01-product-brief.md) — what the site is, scope, decisions already made
2. [`docs/02-design-direction.md`](docs/02-design-direction.md) — art direction, the awwwards bar, anti-generic rules
3. [`docs/03-webgl-logo-draw.md`](docs/03-webgl-logo-draw.md) — THE centerpiece: needle draws the logo as you scroll
4. [`docs/04-brand-tokens.md`](docs/04-brand-tokens.md) — palette (sampled from real logo), type, motion tokens
5. [`docs/05-media-manifest.md`](docs/05-media-manifest.md) — every asset + where it belongs
6. [`docs/06-tech-stack.md`](docs/06-tech-stack.md) — the frame you build inside (Next + Neon + Vercel)

## The copy-paste kickoff prompt
[`DESIGN-AGENT-PROMPT.md`](DESIGN-AGENT-PROMPT.md) — the single message to start the design agent.

## Assets
All source media in [`media/`](media/). Logo: `media/logo.jpg`. Hero video: `media/Dragan 6.mp4` (52s, 42MB — must be transcoded, see media manifest).

## Non-negotiables
- Palette: **black + neon purple** pulled from the logo. Nothing off-brand.
- WebGL centerpiece: a **tattoo machine that "draws" the `dropz tattoo` logo** across the scroll, igniting at the end. This is the wow moment.
- Scroll-based narrative, not a stack of boxes. Editorial, kinetic, grainy, alive.
- Mobile: graceful fallback for WebGL (static/video), must stay 60fps or degrade cleanly.
- Trilingual: **SR / EN / DE**.
