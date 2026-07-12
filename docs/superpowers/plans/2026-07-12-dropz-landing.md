# Dropz Tattoo Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-ready, responsive Dropz Tattoo landing page with a persistent scroll-driven WebGL ink scene, supplied portfolio media, studio video, and clear consultation/inquiry routes.

**Architecture:** Next.js App Router renders all meaningful content as semantic HTML while a fixed React Three Fiber canvas consumes normalized document progress. Landing sections own their DOM choreography, media, and responsive behavior; the canvas remains decorative and has an SVG/CSS fallback for reduced motion or unavailable WebGL.

**Tech Stack:** Next.js, React, TypeScript, Three.js, React Three Fiber, Drei, GSAP, Lenis, CSS custom properties, Vitest, Testing Library, Playwright/browser QA.

---

## File Map

- `package.json`: scripts and runtime/test dependencies.
- `next.config.ts`, `tsconfig.json`, `next-env.d.ts`: framework and TypeScript configuration.
- `app/layout.tsx`: metadata, global document shell, and font classes.
- `app/page.tsx`: landing route composition.
- `app/booking/page.tsx`, `app/upit/page.tsx`: polished CTA destination shells.
- `app/globals.css`: tokens, layout system, responsive styling, fallback, and motion states.
- `components/landing/LandingPage.tsx`: language state, normalized progress, Lenis lifecycle, and chapter composition.
- `components/landing/Navigation.tsx`: fixed navigation, language controls, and mobile behavior.
- `components/landing/InkScene.tsx`: WebGL capability gate and fixed canvas.
- `components/landing/InkWorld.tsx`: line geometry, needle mesh, particles, lighting, and progress interpolation.
- `components/landing/InkFallback.tsx`: reduced-motion and no-WebGL SVG stroke.
- `components/landing/Hero.tsx`: first viewport and next-section preview.
- `components/landing/Work.tsx`: responsive portfolio rail.
- `components/landing/Craft.tsx`: video manifesto section.
- `components/landing/Paths.tsx`: consultation and inquiry routes.
- `components/landing/Finale.tsx`: logo ignition and footer.
- `components/landing/content.ts`: SR/EN/DE copy and media inventory.
- `components/landing/scroll.ts`: pure progress helpers.
- `components/landing/scroll.test.ts`: progress helper tests.
- `tests/landing.spec.ts`: first viewport, links, motion fallback, and responsive smoke tests.
- `public/media/*`: copied/optimized supplied media.
- `design/dropz-awwwards-concept.png`: accepted visual reference.

### Task 1: Create The Application Foundation

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Define scripts and dependencies**

Create scripts for `dev`, `build`, `start`, `test`, and `test:e2e`. Pin compatible current releases of Next/React and add `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `lenis`, `lucide-react`, `vitest`, `jsdom`, Testing Library, and Playwright.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: package installation completes and `package-lock.json` is created.

- [ ] **Step 3: Add the App Router shell**

Implement `app/layout.tsx` with Serbian-first metadata, viewport color `#000000`, and global CSS. Implement `app/page.tsx` as a thin composition that renders `<LandingPage />`.

- [ ] **Step 4: Add the initial token system**

Define exact brand properties in `app/globals.css`: `--ink-void: #000`, `--ink-900: #05010a`, `--ink-800: #100030`, `--violet-electric: #6020e0`, `--violet-neon: #a070f0`, `--violet-bright: #b080f0`, `--core-hot: #f2ecff`, and `--paper: #ede7f5`. Add reset, focus visibility, selection, and fixed-canvas layering.

- [ ] **Step 5: Verify the foundation**

Run: `npm run build`

Expected: Next.js production build succeeds with `/` statically rendered.

### Task 2: Prepare Production Media And Content

**Files:**
- Create: `public/media/*`
- Create: `design/dropz-awwwards-concept.png`
- Create: `components/landing/content.ts`

- [ ] **Step 1: Copy image assets and accepted concept**

Copy the supplied logo and tattoo photographs into `public/media` without modifying the originals. Copy the accepted concept from the Codex generated-images directory to `design/dropz-awwwards-concept.png`.

- [ ] **Step 2: Transcode the studio video**

Run H.264, WebM, and poster exports from `media/Dragan 6.mp4` at a 720px width and browser-oriented compression. Preserve the source file.

Expected outputs: `public/media/dragan-loop.mp4`, `public/media/dragan-loop.webm`, and `public/media/dragan-poster.jpg`; each video plays in a modern browser and the MP4 is substantially smaller than the 42MB source.

- [ ] **Step 3: Define copy and media inventory**

Export a typed `Locale = "sr" | "en" | "de"`, a `copy` dictionary with nav, hero, manifesto, path, and finale strings, and a `portfolio` array with source, alt text, aspect class, and position label. Serbian is the default.

- [ ] **Step 4: Validate public assets**

Run: `Get-ChildItem public/media | Select-Object Name,Length`

Expected: logo, selected portfolio images, both video formats, and poster are present with non-zero sizes.

### Task 3: Build Scroll State And WebGL Core

**Files:**
- Create: `components/landing/scroll.ts`
- Create: `components/landing/scroll.test.ts`
- Create: `components/landing/InkScene.tsx`
- Create: `components/landing/InkWorld.tsx`
- Create: `components/landing/InkFallback.tsx`

- [ ] **Step 1: Write progress tests**

Test `normalizeScroll(scrollY, scrollHeight, viewportHeight)` for start `0`, midpoint `0.5`, end `1`, clamping outside bounds, and zero-length documents.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- components/landing/scroll.test.ts`

Expected: FAIL because `normalizeScroll` is not implemented.

- [ ] **Step 3: Implement normalized progress**

Implement the helper with a guarded denominator and `Math.min(1, Math.max(0, value))`. Export chapter range helpers so each section maps global progress into local `0..1` motion.

- [ ] **Step 4: Run the focused test and verify success**

Run: `npm test -- components/landing/scroll.test.ts`

Expected: all progress tests pass.

- [ ] **Step 5: Implement capability and motion gates**

`InkScene` checks `prefers-reduced-motion` and WebGL context availability after mount. Render `InkFallback` until capability is known and whenever WebGL should not run.

- [ ] **Step 6: Implement the WebGL world**

Create a fixed transparent canvas with a Catmull-Rom ink trajectory, violet core and halo lines, a restrained needle mesh at the active point, sparse particles, and lighting whose intensity rises near finale progress. Update geometry and needle position from the `progress` prop; keep `frameloop="always"` only while motion is enabled.

- [ ] **Step 7: Verify canvas behavior**

Run: `npm run build`

Expected: production build succeeds without server-side WebGL access or hydration errors.

### Task 4: Build The Five Landing Chapters

**Files:**
- Create: `components/landing/LandingPage.tsx`
- Create: `components/landing/Navigation.tsx`
- Create: `components/landing/Hero.tsx`
- Create: `components/landing/Work.tsx`
- Create: `components/landing/Craft.tsx`
- Create: `components/landing/Paths.tsx`
- Create: `components/landing/Finale.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Compose scroll and language state**

Initialize Lenis only when reduced motion is off. Compute normalized progress on animation frames and pass it to `InkScene`. Keep the current locale in local state and update visible copy without navigation.

- [ ] **Step 2: Build navigation and hero**

Add the compact brand/navigation row, language controls, and `Rezervisi` action. Build a true-black first viewport with oversized `dropz tattoo`, the approved statement, needle composition, and visible Work-section preview.

- [ ] **Step 3: Build the Work rail**

Render supplied photographs through `next/image` in an editorial grid with stable aspect ratios. Add scroll-linked CSS transforms and clip reveals without hiding image meaning when motion is reduced.

- [ ] **Step 4: Build the Craft manifesto**

Render poster-backed autoplay-muted-loop video with MP4 and WebM sources. Overlay only the approved manifesto and restrained playback control; preserve a readable static poster when playback fails.

- [ ] **Step 5: Build the conversion paths**

Create two full-width open panels for `Konsultacija / 15 min besplatno` and `Upit / Posalji ideju`, with arrow icons, hover/focus movement, and links to `/booking` and `/upit`.

- [ ] **Step 6: Build finale and footer**

Reveal the supplied logo with a controlled violet ignition tied to final progress. Add the final `Rezervisi termin` action and restrained contact/social footer.

- [ ] **Step 7: Complete responsive styling**

Add desktop, tablet, and 320px-safe mobile breakpoints. Ensure fixed canvas, title, navigation, image crops, path labels, and footer never overlap incoherently. Add reduced-motion rules that remove transforms and animated flicker.

- [ ] **Step 8: Verify production compilation**

Run: `npm run build`

Expected: all routes compile and the production build exits successfully.

### Task 5: Add CTA Destinations And Browser Verification

**Files:**
- Create: `app/booking/page.tsx`
- Create: `app/upit/page.tsx`
- Create: `tests/landing.spec.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Add destination shells**

Create visually consistent `/booking` and `/upit` pages with a back link, clear heading, expected next-step message, and contact fallback. These routes must not claim persistence or completed booking functionality.

- [ ] **Step 2: Write browser smoke tests**

Test that the hero title is visible, the next section is reachable by scrolling, both CTA links have correct destinations, the video element has poster and sources, and no horizontal overflow exists at 1440x900 and 390x844.

- [ ] **Step 3: Run automated checks**

Run: `npm test`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: unit tests, production build, and browser tests all pass.

- [ ] **Step 4: Run the local preview**

Start the dev server on an available localhost port and open it in the in-app browser. Verify loading, scrolling, language switching, video playback, CTA navigation, browser back behavior, keyboard focus, reduced motion, and WebGL fallback.

- [ ] **Step 5: Perform visual fidelity QA**

Capture desktop and mobile screenshots. Use `view_image` on the accepted concept and latest desktop render, compare hero balance, title personality, black/violet palette, media framing, section rhythm, CTA hierarchy, and finale treatment, then repair all fixable mismatches.

- [ ] **Step 6: Record the final state**

Report the running URL, checks completed, exact screenshot method, comparison result, and intentional deviations. Git commits are omitted because this workspace is not a Git repository.
