# Cinematic Inkline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the logo-drawing and continuous neon line with a cinematic needle strike, restrained red thread, chapter marks, and an amber machine gauge.

**Architecture:** `InkLineV3` becomes an SVG overlay with a hero-only needle composition and discrete section marks measured from live DOM anchors. CSS owns the visual hierarchy while GSAP controls short, scroll-linked reveals.

**Tech Stack:** React, TypeScript, GSAP ScrollTrigger, existing global CSS.

---

## File Map

- `components/landing/v3/InkLineV3.tsx`: hero strike, section anchors, reveal lifecycle.
- `components/landing/v3/VoltmeterV3.tsx`: machine wording remains unchanged.
- `app/globals.css`: ink, needle, marker, and gauge styling plus mobile/reduced-motion rules.
- `docs/superpowers/specs/2026-07-14-cinematic-inkline-design.md`: approved direction.

### Task 1: Replace The Continuous Drawing

**Files:**
- Modify: `components/landing/v3/InkLineV3.tsx`

- [ ] **Step 1: Remove the hero logo path and page-long Catmull-Rom path**

Delete `LOGO_PATH`, spline generation, and dash offset progress that traces the whole document.

- [ ] **Step 2: Render a hero needle and a short red thread**

Use a single SVG overlay with a metallic needle silhouette, a contact flare, and a short path from hero to the Work entry.

- [ ] **Step 3: Render chapter marks from real section anchors**

Measure `.v3-work`, `.v3-craft`, `.v3-process`, `.v3-paths`, and `.v3-booking`; position small SVG sigils using their section top and alternate screen rails.

- [ ] **Step 4: Verify motion gates**

Use `prefers-reduced-motion` to skip draw tweens and keep all markers visible.

### Task 2: Establish The Visual Hierarchy

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace violet line styles with black, white, red, and amber tokens**

Set the thread to `#b21e27`, reserve white for the contact point, and set meter details to amber.

- [ ] **Step 2: Make the needle read as a physical object**

Use thin metal gradients, controlled blur, a localized contact flash, and stable desktop/mobile placement without overlapping hero copy.

- [ ] **Step 3: Add responsive and reduced-motion constraints**

Hide nonessential chapter marks on narrow screens and remove the contact flash when reduced motion is requested.

### Task 3: Validate And Release

**Files:**
- Test: browser desktop and mobile routes

- [ ] **Step 1: Run `npm run build`**

Expected: Next.js production build succeeds.

- [ ] **Step 2: Inspect desktop and mobile in the in-app browser**

Confirm the title is no longer drawn by a line, the hero needle does not cover CTAs, chapter marks stay subordinate to content, and the page has no horizontal overflow.

- [ ] **Step 3: Deploy the existing production target**

Run `npx vercel --prod` from the repository and confirm the returned production URL.
