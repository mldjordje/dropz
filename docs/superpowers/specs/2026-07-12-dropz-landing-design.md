# Dropz Tattoo Landing Design

## Objective

Build a client-ready, scroll-directed landing page for Dropz Tattoo. The page must communicate premium tattoo craft in the first viewport, showcase real work, and convert visitors into either a free 15-minute consultation or an inquiry.

This milestone is the public landing experience only. Booking infrastructure, CRM, authentication, and admin functionality are excluded.

## Creative Direction

The page is one continuous tattoo-making ritual rather than a stack of independent sections. A fixed WebGL canvas sits behind the document. A tattoo needle draws a luminous violet ink line as the visitor scrolls; that line connects every chapter and resolves into the Dropz mark in the finale.

The visual field is predominantly true black. Violet light is used as energy and focus, not as a full-page wash. Photography remains sharp, large, and inspectable. Typography is oversized, compressed, and editorial, balanced by restrained utility labels and Serbian body copy.

## Page Structure

### 1. Void / Hero

- Minimal fixed header: Dropz mark, Rad, Proces, Termini, SR/EN/DE, and Rezervisi.
- Full-viewport `dropz tattoo` title with the needle entering from above-right.
- Short statement: `Ink is energy. Mi samo vodimo liniju.`
- A visible hint of the next section at the bottom edge.
- Scroll begins the ink stroke and moves the needle through the composition.

### 2. The Work

- Full-bleed editorial image rail using the supplied tattoo photography.
- Images vary in scale but follow a stable grid and crop system.
- The ink line passes behind and through image frames, triggering reveals.
- Minimal labels identify work rather than inventing project stories.

### 3. The Craft

- Supplied studio video occupies most of the viewport.
- Primary manifesto: `Ne pratimo trendove. Ostavljamo tragove.`
- Video is transcoded to browser-safe H.264/WebM and presented with a poster.
- Motion and typography remain legible when autoplay is unavailable.

### 4. Choose a Path

- Two large, open-layout routes rather than small cards.
- `Konsultacija` includes `15 min besplatno` and links to `/booking`.
- `Upit` includes `Posalji ideju` and links to `/upit`.
- The WebGL line visibly forks toward both choices.

### 5. Ignition / Finale

- The split lines reconnect and complete the Dropz identity.
- Violet light builds into a brief controlled ignition/flicker.
- Final CTA: `Rezervisi termin`.
- Contact and social details sit in a restrained footer band.

## Interaction And Motion

- One normalized scroll progress value drives the WebGL line, needle position, lighting, media reveals, and finale.
- Smooth scrolling may be used, but native input and browser history remain intact.
- Motion is deterministic and reversible when scrolling upward.
- Pointer movement adds subtle parallax only on capable desktop devices.
- `prefers-reduced-motion`, low-power devices, and WebGL failure use an SVG/CSS line-draw fallback with static photography.
- Navigation, language controls, links, video controls, and keyboard focus remain usable above the canvas.

## Technical Design

- Next.js App Router, React, and TypeScript.
- React Three Fiber/Three.js for the fixed WebGL scene.
- GSAP for scroll-linked DOM choreography and Lenis for optional smoothing.
- CSS custom properties implement the supplied brand tokens.
- Real media is served from `public/media`; heavyweight sources are optimized before use.
- The landing is componentized into navigation, WebGL scene, chapter sections, media rail, path chooser, and finale.

The canvas consumes scroll progress and viewport state only. Content and accessibility remain in semantic HTML, so the experience does not depend on WebGL for meaning or conversion.

## Responsive Behavior

- Desktop uses wide editorial framing and the full needle trajectory.
- Mobile preserves the same chapter order with simplified camera movement and vertical media crops.
- Hero type scales through breakpoints, not continuous viewport-width font scaling.
- Navigation collapses to essential controls without covering the title or CTA.
- All fixed elements respect safe areas and avoid overlap at 320px width.

## Acceptance Criteria

- The first viewport immediately reads as Dropz Tattoo and shows a next-section preview.
- Scrolling produces one coherent ink/needle narrative from hero to finale.
- Supplied images and video load successfully and retain strong crops.
- Consultation and inquiry CTAs are clearly distinguishable and navigable.
- Desktop and mobile have no clipped text, horizontal overflow, or incoherent overlap.
- Reduced-motion and WebGL fallback experiences retain all content and actions.
- Production build passes, and the page is visually checked in-browser at desktop and mobile sizes.

## Intentional Scope Limits

- `/booking` and `/upit` may initially be polished destination shells; persistence and notifications are not part of this milestone.
- Language switching may use landing-copy dictionaries without a CMS.
- The WebGL stroke approximates the energy and flow of the supplied raster logo; exact vector tracing can follow once a production vector mark is supplied or approved.
