# Phase 1 (MVP) Build Plan — ExpoBridge

Build in this order. Finish and verify one milestone — including its "definition of done" — before starting the next. Reference `ExpoBridge-PRD.md` for full detail on each feature; this file is the build-ready summary to hand the coding agent.

## Milestone 0 — Project scaffold
Next.js + TypeScript + Tailwind project, connected to Supabase (Postgres + Auth), deployed to Vercel from a blank homepage.
**Definition of done:** `npm run build` passes; a deployed URL loads a blank homepage.

## Milestone 1 — Fast registration & accounts (PRD §8.1)
Sign up / log in via Supabase Auth: phone OTP, email magic link, Google + LinkedIn OAuth. Role selection (Buyer / Exhibitor / Visitor / Partner) at signup, stored on the user profile. Role-based dashboard shell (empty state is fine for now).
**Definition of done:** a new user goes from landing page to a logged-in dashboard in under a minute with no required fields beyond contact method + role + country. Time it manually.

## Milestone 2 — Exhibition listings (PRD §8.2)
Public exhibition list + detail page, seeded with 2–3 sample exhibitions. Filter by industry / city / date.
**Definition of done:** works for a logged-out visitor — no auth required to browse.

## Milestone 3 — Exhibitor portal: booth booking (PRD §8.3)
Floor plan view with bookable booths (a simple grid is fine for v1). Stripe checkout for a booth booking; booking status stored in the database. Auto-generated exhibitor microsite profile page.
**Definition of done:** a test booking completes end-to-end in Stripe test mode and appears correctly in the exhibitor's dashboard.

## Milestone 4 — Buyer portal & RFQ marketplace (PRD §8.4, §8.6)
Exhibitor directory search/filter for buyers. Buyers post an RFQ; exhibitors view open RFQs in their category and submit quotes.
**Definition of done:** a buyer can post an RFQ and see a submitted quote appear against it.

## Milestone 5 — Hotel booking (PRD §8.8)
Simple hotel list tied to an exhibition, bookable in-platform (a booking-request form is fine to start — doesn't need live inventory yet).
**Definition of done:** a buyer submits a hotel request from an exhibition page and it's visible in admin.

## Milestone 6 — Admin back office (PRD §8.12)
Minimal internal CMS: create/edit exhibitions, view bookings and RFQs, approve exhibitor listings.
**Definition of done:** gated by an admin role; a logged-in non-admin cannot reach it.

## Milestone 7 — Partner referral tracking (PRD §8.10, lightweight v1)
Unique referral link per partner; signups through it are tagged automatically; simple partner dashboard listing referred users.
**Definition of done:** a test signup through a referral link shows up correctly on that partner's dashboard.

## Milestone 8 — Polish pass
Run a fresh-eyes review (`/code-review` or a clean session) against the full diff for bugs and scope creep. Re-confirm every milestone's "definition of done" still passes together, not just in isolation. Check mobile responsiveness on the core flows: registration, browsing, RFQ.

## After Milestone 8
Move to Phase 2 (`ExpoBridge-PRD.md` §15): AI matchmaking, meeting scheduler, real-time chat, digital badge check-in, full partner automation, the magazine. Don't start these until Phase 1 is live with real exhibitors and buyers at an actual event — validate the basics before automating further.
