# 04 — Brand Tokens

Palette **sampled directly from `media/logo.jpg`** (neon purple on black, drip motif).
Use these as the seed; extend into a full ramp, but stay in this family.

## Core palette
| Token | Hex | Role |
|---|---|---|
| `--ink-void` | `#000000` | True black. Page base, the "room". |
| `--ink-900` | `#05010A` | Near-black with a purple undertone (large surfaces). |
| `--ink-800` | `#100030` | Deep purple shadow / gradient floor. |
| `--ink-700` | `#200060` | Mid purple, glow falloff. |
| `--violet-electric` | `#6020E0` | Vivid electric violet (deep neon). |
| `--violet-neon` | `#A070F0` | **Primary neon** — the logo glow. Brand hero color. |
| `--violet-bright` | `#B080F0` | Bright neon highlight / hover. |
| `--core-hot` | `#F2ECFF` | White-hot letter core (needle tip, text-on-glow). |
| `--paper` | `#EDE7F5` | Off-white for high-contrast body text on dark. |

## Usage
- Backgrounds: `--ink-void` / `--ink-900`, purple only as glow, fog, and gradient floors.
- Neon `--violet-neon` is precious — reserve for the logo, key CTAs, the drawn stroke,
  active states. Don't flood the page purple; contrast comes from black + one glow.
- Text: `--paper` body, `--core-hot` for emphasis over glow. Keep AA contrast.
- Gradients: radial glow `--violet-neon` → transparent over black; linear
  `--violet-electric` → `--ink-800` for depth floors.

## Neon glow recipe (CSS reference)
```css
.neon {
  color: var(--core-hot);
  text-shadow:
    0 0 4px  #B080F0,
    0 0 12px #A070F0,
    0 0 32px #6020E0,
    0 0 64px #6020E0;
}
```

## Typography (direction, pick real faces)
- **Display:** wide, heavy, slightly technical — echo the logo's chunky rounded-but-bold
  letterforms. Candidates: Clash Display, Monument Extended, Boogy/PP Neue Machina,
  or a custom-feel grotesk. Big, tight tracking.
- **Body:** clean neutral grotesk (e.g. General Sans, Suisse-like, or Geist). Never
  the same as display.
- Scale: exaggerated ratio (e.g. 1.333–1.5). Hero display 8–14vw. Editorial, not timid.

## Motion tokens
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo-ish) for reveals; `0.65,0,0.35,1` for moves.
- Durations: micro 150ms, UI 300–450ms, scene reveals 700–1200ms.
- Smooth scroll: Lenis, lerp ~0.1. Everything reveal-on-scroll.
- Respect `prefers-reduced-motion` → cut transforms, keep opacity.

## Texture
- Global film-grain overlay (subtle, animated), ~4–6% opacity, screen blend.
- Vignette toward edges to focus the neon.

> Deliver these as real CSS custom properties / a Tailwind theme in the build.
