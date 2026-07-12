# 06 — Tech Stack & Frame

The design is built inside this frame so engineering can wire data with no
re-platforming. This mirrors the studio's existing sibling project (`drigic`),
which is a proven Next + Neon booking app — reuse its patterns where sensible.

## Stack
- **Next.js 15** (App Router, React 19, Turbopack), TypeScript.
- **Vercel** hosting. **Neon** (serverless Postgres) via `@neondatabase/serverless`.
- **Drizzle ORM** + `drizzle-kit` for schema/migrations.
- **Auth:** `jose` (JWT) — guest booking + optional email OTP / magic link account.
- **Storage:** `@vercel/blob` for inquiry image uploads.
- **Email:** `resend` (booking confirmations, inquiry receipts, admin notify).
- **Validation:** `zod` on every API boundary.
- **Motion/scroll:** `lenis` (smooth scroll), `gsap` + ScrollTrigger.
- **WebGL:** `@react-three/fiber` + `@react-three/drei` (or `ogl`) + bloom post.
- **i18n:** SR / EN / DE. Serbian latinica primary. (Reuse drigic's i18n approach.)
- **Admin calendar:** `@fullcalendar/*` (day/time grid) for the bookings view.
- Styling: your call — Tailwind v4 or SCSS modules. Whatever ships the design fastest
  without fighting it. Tokens from doc 04 as CSS custom properties.

## Data model (starting point — extend as needed)
Reuse/trim from drigic's schema. Minimum for launch:
- `users` (id, email, phone, role[client|admin], timestamps) + optional `profiles`.
- `consultations` / `bookings` — 15-min slots: `starts_at`, `status`
  [pending|confirmed|completed|cancelled|no_show], contact fields for guests,
  optional `user_id`.
- `inquiries` — custom project "upit": description, placement (body area), approx
  size, budget range, `image_urls` (Blob), contact, `status` [new|reviewing|quoted|closed].
- `studio_settings` — `slot_minutes` (15), working hours, booking window days.
- `blocked_slots` — admin day-offs / breaks.
- (Keep an `artists`/`employees` table even if single artist now — future multi-artist.)

## Surfaces
- **Public:** `/` (landing), `/booking` (consultation), `/upit` (inquiry),
  `/(legal)` etc. Optional `/moji-termini` behind account.
- **Admin (`/admin`):** dashboard, calendar (bookings), inquiry inbox, clients (CRM),
  settings. Auth-gated (admin role).
- **API (`/api`):** `bookings`, `inquiries`, `auth`, `me`, `admin`, `media`
  (Blob upload), `cron` (reminders).

## Environment
`DATABASE_URL` (Neon), `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `JWT_SECRET`,
`NEXT_PUBLIC_SITE_URL`.

## Engineering hand-back
Design agent owns: landing (fully built incl. WebGL), plus designed & built UI for
booking / inquiry / admin. Engineering wires the DB, auth, email, Blob, cron.
Keep components data-agnostic (props/loaders) so wiring is drop-in.
