# 07 — Redesign Brief: Full-Page Fluid-Ink WebGL (v3)

**Status:** hand-off for a NEW session. Read this + [02-design-direction](02-design-direction.md)
+ [04-brand-tokens](04-brand-tokens.md) + [05-media-manifest](05-media-manifest.md) before touching code.

## Why we are redesigning

The v2 build (current `main`) is technically working but **misses the brief**. Client verdict:
"everything is bad — scroll animations, scenes, the WebGL is hardly visible when it should be
the MAIN wow trigger; mobile UX is bad; portfolio animation starts too late; too ordinary."

Root problems in v2:
- WebGL was a **faint fixed overlay** (`mix-blend:screen; opacity:.68`) behind DOM — a whisper,
  not the star. A domain-warped fbm field + a small particle cloud. Barely readable.
- The locked centerpiece (**needle draws the `dropz` logo across scroll → ignites in neon**,
  see [03](03-webgl-logo-draw.md)) was never really built.
- Scroll story = linear CSS-sticky sections with `--p`. Reveals mistimed (portfolio starts late).
- Mobile = shrunk desktop, not re-choreographed. 3D tunnel of images is hostile on phones.
- We used `@react-three/postprocessing` for bloom → it crashed prod (circular-JSON under React 19
  / R3F v9). **Do not reintroduce it.** See [verify-webgl-gotcha memory].

## North star

One **full-viewport, always-on, real-time fluid-ink simulation** IS the site. Neon ink lives in a
black void, flows like pigment in water, and reacts to cursor + scroll + touch. The DOM content
(type, photos, CTAs) floats over it as an editorial overlay. Tattoo theme: **scroll = the needle
injecting ink**; the whole page is one continuous "session" that ends when the accumulated ink
**resolves into the `dropz tattoo` wordmark and ignites**.

Bar: awwwards Site of the Day. If a section would look fine on a SaaS template, kill it.

### Decisions locked with client (2026-07-13)
- **Scene = real-time fluid ink simulation** (GPU Navier–Stokes / stable fluids), full-page, dominant.
- **Narrative = keep the needle→logo→ignite spine**, reworked so it is mobile-proof and the wow peak.
- Palette stays: neon `#a672ff`, violet `#7130ff`, white-hot `#f3effa`, on black `#000`
  (see [04](04-brand-tokens.md)). Ink dye colors sample this ramp.

## The WebGL: real-time fluid ink

### Technique
Classic **stable-fluids** (Jos Stam) on the GPU with FBO ping-pong. Reference implementation to port
(MIT, mobile-proven): Pavel Dobryakov's *WebGL-Fluid-Simulation*. Do NOT depend on a heavyweight
post-fx lib; write the passes directly.

Per-frame passes (all fragment shaders on fullscreen quads, float/half-float FBOs):
1. **Curl** of velocity field.
2. **Vorticity confinement** (adds the swirly, alive ink curls — key to the look).
3. **Divergence**.
4. **Pressure** — Jacobi iterations (desktop ~20–30, mobile ~12–16).
5. **Gradient subtract** → divergence-free velocity.
6. **Advection** of velocity, then of **dye** (the visible ink), with dissipation.
7. **Splat** — inject velocity + dye at input points (see Inputs).
8. **Display** — tone-map dye, add **in-shader bloom** (threshold + separable gaussian on a
   downsampled dye target, a few taps) and a touch of grain. Neon core → `#f3effa`, mids `#a672ff`,
   deep `#7130ff`, gaps pure black.

### Inputs (this is what makes it "interactive scroll-based")
- **Pointer / touch move** → velocity splat along the movement vector + dye splat. Ink trails the finger/cursor.
- **Scroll velocity** → global force + rhythmic dye splats along a vertical "needle path" down the
  screen. Scrolling literally pumps ink into the field (the tattoo-machine metaphor). Fast scroll = surge.
- **Idle** → gentle curl-noise force so the ink never sits still; slow breathing drift.
- **Chapter changes** → colored splats keyed to the section (subtle hue shift down the page:
  violet high → hotter neon → white-hot at finale).

### Making it DOMINANT (the v2 failure)
- Canvas is `position:fixed; inset:0; z-index:0` — the base layer, **not** a blended overlay.
  Do NOT use `mix-blend-mode:screen` on the whole canvas or crush opacity. The fluid is opaque-on-black.
- Content sits at `z-index:1+` with its own legibility scrims **locally** (radial/linear gradient
  behind text blocks) so type stays readable without dimming the whole scene.
- Dye dissipation tuned so ink lingers and fills space — dense, not wispy.

### The finale (logo emerge + ignite) — the payoff
- Precompute a **mask/SDF of the `dropz tattoo` wordmark** (vectorize `media/logo.jpg` → SVG →
  SDF texture; also keep a transparent PNG fallback).
- As `uProgress → 1`, bias dye splats to inject **inside the wordmark shape** so the free-flowing ink
  "settles" and reveals the logo out of the fluid. Then **ignite**: bloom intensity ramps, a 2–3 beat
  flicker envelope, chromatic edge, a purple haze bloom outward. Hold the lit wordmark for the footer.
- Reduced-motion / no-WebGL: show the finished neon logo (SVG fully drawn or PNG), skip the sim.

### Performance & mobile (must be flawless on both)
- Sim resolution decoupled from screen: **velocity/pressure sim res ~128 (mobile) / 256 (desktop)**;
  dye res one step higher. Display upscales — fluid looks full-res, sim stays cheap.
- Cap DPR ≤ 2 (≤1.5 mobile). Half-float targets; fall back to byte textures if unsupported.
- Fewer pressure iterations + skip/soften vorticity on low-end. Detect via a quick GPU tier check
  (e.g. `detect-gpu`) or a frame-time governor that drops sim res if fps < 50.
- Pause rAF when tab hidden / canvas fully occluded. Dispose FBOs on unmount.
- LCP is text/poster, not the canvas; canvas lazy-mounts after first paint.

## Scroll narrative (re-choreographed, tattoo "session")

One continuous scene; sections are moments in the ink, not boxed slides. Fix v2 timing — reveals
begin **as a section enters (start ~"top 85%")**, never after it's already centered.

1. **Void / Hero.** Near-black, a single bright ink bloom pulsing (the needle's first touch). Wordmark
   *whispered* (small, not the big draw yet). Oversized editorial line ("INK IS ENERGY" — keep, but
   integrate with the ink, e.g. ink flows through/behind the letterforms). Clear scroll cue.
2. **The Work (portfolio).** Bring it **earlier and bigger**. Full-bleed editorial photo reveals that
   the ink "wipes" in (dye-driven image masks), not a fussy 3D tunnel. Marquee of styles/names.
   Parallax depth. On desktop: broken-grid, asymmetric, 1–2 large + supporting. **Portfolio motion must
   start the instant the section enters, with a lead-in — not a late pop.**
3. **The Craft.** The 52s video full-bleed (transcoded, see [05](05-media-manifest.md)); ink washes over
   it; manifesto in oversized type. Scrub or ambient.
4. **The Paths.** Two ink panels (not cards): *Konsultacija (15 min, besplatno)* and
   *Upit (imaš ideju? pošalji je)*. Hover/press pushes ink.
5. **Ignition / Finale.** Ink converges → `dropz tattoo` resolves out of the fluid → neon ignites.
   Footer: hours, address, socials, language switch.

Motion rules: everything eases (custom cubic-beziers), nothing pops. Custom cursor (magnetic on CTAs),
scroll-pinning where it earns it, film grain, tasteful chromatic accents. Respect `prefers-reduced-motion`.

## Mobile UX (first-class, re-choreographed — not shrunk)
- Single continuous fluid scene stays; **touch drives ink** (drag = splat, scroll = injection). No
  hover-only affordances; all reveals fire on scroll.
- Portfolio: vertical full-bleed reveals / snap sections or a horizontal drag-marquee — **kill the 3D
  card tunnel on mobile**.
- Type re-scaled with its own scale (not desktop clamped); generous safe-area padding; sticky/scrim
  behind text for legibility over dense ink.
- Nav → compact; language switch reachable; tap targets ≥ 44px.
- Test on a real mid-range Android + iOS Safari (sim res + fps governor must hold 50–60fps).

## Architecture
- **Fluid engine = a standalone module** (`lib/fluid/`), raw WebGL2 (ping-pong FBOs), framework-agnostic,
  driven by an imperative API: `mount(canvas)`, `splat({x,y,dx,dy,color})`, `setProgress(p)`,
  `resize()`, `dispose()`. A thin React hook (`useFluid`) wires pointer/scroll/RAF + `prefers-reduced-motion`.
  This isolates the heavy GL from React re-renders (a v2 pain point) and keeps it portable.
  - Alternative: R3F with custom FBO passes — acceptable, but **no `@react-three/postprocessing`**
    (it crashed prod). In-shader bloom only.
- Content = React/Next DOM overlay. Scroll = Lenis + GSAP ScrollTrigger. Drive `uProgress` from a single
  scroll source; feed both the fluid module and the DOM reveals. Keep `immediateRender:false` on reveals
  (text must default to visible if a tween never runs — v2 lesson).
- Logo: vectorize `logo.jpg` → SVG + SDF texture + transparent PNG (one-time asset step).

## Perf budget / fallbacks (required)
- Lighthouse LCP < 2.5s on 4G; canvas lazy after first paint.
- No-WebGL2 / low GPU / reduced-motion → static graded hero + poster + fully-drawn SVG logo. The page
  must be beautiful with zero shaders running.
- Images: AVIF/WebP + responsive `srcset`, strip EXIF, duotone-grade toward brand (lift blacks, purple
  in shadows). Use 6–9 strongest stills, 1 hero-grade, 1 artist portrait. Don't ship raw multi-MB JPEGs.

## Keep / kill from v2
- **Keep:** Next 15 + R3F stack, Lenis, GSAP, brand tokens, transcoded video pipeline, the
  `immediateRender:false` reveal safety, the preloader-safety-timeout pattern, booking/upit/admin routes.
- **Kill/replace:** the faint fbm field + particle cloud (`InkWorld`/`InkScene`), the 3D `tunnel-card`
  gallery (esp. mobile), `mix-blend-mode:screen` on the canvas, all `@react-three/postprocessing` usage
  (already removed — keep it out), the SVG-path preloader (client wants the logo; current preloader shows
  `logo.jpg`, keep that direction).

## Build order for the new session
1. Vectorize logo → SVG + SDF + PNG. Transcode video. Grade + export responsive images.
2. Build `lib/fluid/` engine standalone; prove it full-screen, dense, cursor+scroll reactive, 60fps
   desktop / 50–60fps mobile with the fps governor. **Verify in a REAL visible browser** (the in-app
   preview pane freezes rAF — see [verify-webgl-gotcha memory]; use claude-in-chrome or a device).
3. Layer DOM content + Lenis/ScrollTrigger; wire single `uProgress`; fix reveal timing (portfolio early).
4. Finale: dye-into-wordmark reveal + ignite.
5. Mobile re-choreography pass + device testing.
6. Fallbacks (reduced-motion, no-WebGL), perf budget, Lighthouse.

## Acceptance criteria
- The fluid ink is unmistakably the hero — dense, luminous, reacting to cursor/scroll/touch — on first load.
- Scrolling top→bottom tells one ink "session" and ends by resolving + igniting the `dropz` wordmark.
- Portfolio motion begins the moment its section enters, with a lead-in (no late pop).
- Flawless 50–60fps on a real mid-range phone AND desktop; touch-driven ink on mobile.
- Zero client-side exceptions; graceful reduced-motion / no-WebGL fallback.
- Reads as awwwards SOTD, not "ordinary".
