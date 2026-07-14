# Cinematic Ink Direction

## Decision

Replace the drawn `DROPZ` hero wordmark and page-spanning violet neon path with a sparse tattoo-making narrative. The hero is a controlled needle strike: a precision metal silhouette aims at a single red contact point while the existing title stays readable as typography, not line art.

## Visual System

- Background remains near-black and photographic in character.
- Accent color changes from violet glow to restrained deep red (`#b21e27`), with white only at the needle contact point.
- A thin red thread is a directional cue, not a continuous drawing. It has no loops around content.
- Three to four geometric chapter marks appear at section landmarks. They are static until their section enters, then resolve in a short draw-on motion.
- The voltmeter remains, recolored to warm amber so it reads as a machine instrument rather than generic UI.

## Interaction

- After the loader, the needle moves a short distance into its final hero position and the contact point flashes once.
- The hero thread advances only to the first section, then ends cleanly.
- ScrollTrigger reveals chapter marks when Work, Craft, Process, Paths, and Booking enter. The marks never compete with photography or calls to action.
- `prefers-reduced-motion` shows all marks and the resting needle without autoplay.

## Implementation Boundaries

- Modify `components/landing/v3/InkLineV3.tsx` and the related global CSS only; leave content, links, and the WebGL fluid engine intact.
- Retain DOM-measured positioning only for chapter anchors, not a page-length spline.
- Verify desktop and mobile in-browser, then build and deploy the existing production target.
