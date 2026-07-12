# 01 — Product Brief

## What this is
Booking + presence website for **dropz tattoo** studio. First launch scope is
deliberately tight: a stunning landing, two ways to book, and an admin/CRM to
run it.

## Who it's for
- **Prospects** browsing work, deciding to book.
- **Undecided clients** → book a free **15-min consultation**.
- **Decided clients** → send an **inquiry ("upit")**: describe the idea, attach
  reference image(s), size, placement, budget.
- **Studio (admin)** → manage bookings, inquiries, and clients (CRM).

## Scope (launch)
1. **Landing** — the showcase. Scroll-based, WebGL, awwwards-level. (Your focus.)
2. **Booking — Consultation** — free, fixed **15-min** slots. Pick date/time, leave contact.
3. **Inquiry — Custom project ("upit")** — form: idea description, body placement,
   approx size, budget range, **image upload** (references), contact.
4. **Admin panel + CRM** — bookings calendar, inquiry inbox, client records, statuses.

## Decisions already locked
| Topic | Decision |
|---|---|
| Client auth | **Guest by default + optional account.** Booking works with no login (name/email/phone). Optional account (email OTP / magic link) unlocks "my appointments" + history. |
| Languages | **SR + EN + DE** (i18n layer). Serbian latinica is primary. |
| Consultation payment | **Free, no payment / no deposit** for launch. No payment integration yet. |
| WebGL | **Yes — centerpiece.** Tattoo machine draws the `dropz tattoo` logo across the scroll. See doc 03. Must fall back gracefully. |
| Hosting / DB | **Vercel + Neon (Postgres).** See doc 06. |

## Out of scope (launch)
- Online payments / deposits.
- Multi-artist scheduling (single studio calendar for now; keep schema open to multi-artist).
- E-commerce, gift cards, loyalty.

## Success bar
- Landing makes people stop and scroll to the end (the logo-ignition payoff).
- Booking a consultation takes < 30s, guest, mobile-first.
- Studio can read/triage inquiries and manage the day from one admin screen.
