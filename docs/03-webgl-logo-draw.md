# 03 — WebGL Centerpiece: "The Machine Draws the Logo"

This is the wow moment and the reason WebGL exists on this site. Nail it.

## The idea (client's own words, refined)
A **tattoo machine (needle)** rides the scroll. As the user scrolls the whole
page, the needle **draws an ink line**. The line accumulates. At the **end of the
page**, the strokes **resolve into the `dropz tattoo` logo** — the same neon
wordmark in `media/logo.jpg` — and the neon **ignites** (flickers on, glow blooms).

Scroll position = drawing progress. Reaching the bottom = the logo is finished and lit.

## Mechanic (uProgress 0 → 1)
- Bind a single scroll-driven uniform `uProgress` (0 at top, 1 at finale) via a
  smooth-scroll lib (Lenis) + IntersectionObserver/scroll timeline.
- The logo wordmark is a **vector stroke path**. Reveal it head-first as
  `uProgress` grows (SDF stroke reveal, or dash-offset along the path).
- A **needle sprite** sits at the head of the currently-drawn point, jittering
  slightly (machine vibration), leaving a wet-ink trail that dries into neon.
- On completion: ink-line → neon transition. Bloom/glow ramps, a flicker envelope
  (2–3 fast flickers then steady), subtle chromatic edge, purple haze pushes out.

## Recommended implementation (hybrid — robust + gorgeous)
- **React Three Fiber** (`@react-three/fiber` + `@react-three/drei`) or **ogl** if
  you want it lighter. Either is fine; pick for bundle budget.
- **Path source:** vectorize `media/logo.jpg` → clean SVG of the `dropz tattoo`
  wordmark + droplet. Sample the SVG path into points (getPointAtLength) → feed as
  a line geometry / into the shader as a texture of path samples.
- **Reveal:** fragment shader compares each fragment's arc-length position to
  `uProgress`; drawn = neon, undrawn = invisible, head = bright wet highlight.
- **Glow:** post-processing bloom (UnrealBloom) OR a cheaper multi-tap gaussian in
  the fragment shader. Neon core = white-hot `#F2ECFF`, glow = `#A070F0` → `#6020E0`.
- **Ink texture:** subtle noise so the stroke reads as pigment in skin, not a
  vector. Grain + slight bleed at the head.
- **Background field:** low-cost fluid/fog shader (curl noise) in deep purple for
  the hero and finale, reacting faintly to pointer + scroll velocity.

## Simpler fallback path (if bundle/time forces it)
- Convert logo to SVG, animate `stroke-dashoffset` with GSAP/ScrollTrigger to
  "draw" it; do the neon glow with CSS (`filter: drop-shadow` stacks) + a flicker
  keyframe. Keep the WebGL only for the ambient purple fog. Still lands the payoff.

## Degradation (required)
- No WebGL / low power / `prefers-reduced-motion`: show the finished neon logo as
  a static PNG (or the SVG fully drawn), skip the fog, skip flicker loop. The page
  must be beautiful and complete without a single shader running.

## Performance budget
- WebGL canvas lazy-mounts after first paint; hero LCP element is text/poster, not the canvas.
- Cap DPR (≤2), pause rAF when canvas off-screen, dispose on unmount.
- Target 60fps desktop; on mobile prefer the lighter fog + SVG-draw combo.

## Definition of done
Scrolling top→bottom visibly *draws* the `dropz tattoo` logo with a needle and
ignites it in neon at the end, buttery smooth, with a static fallback that still
looks intentional.
