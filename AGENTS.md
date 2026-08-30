# AGENTS.md — ExpoBridge

Read this before writing any code. Full product spec: `ExpoBridge-PRD.md`. Current build scope and order: `BUILD-PLAN.md`. Don't start work outside the current milestone in `BUILD-PLAN.md` without asking first.

## Stack (MVP — do not change without asking)
- Next.js (App Router) + TypeScript + Tailwind CSS — one repo, no separate backend service for the MVP
- Supabase for Postgres, Auth (email/phone OTP + Google/LinkedIn OAuth), and file storage
- Stripe for payments
- Deploy target: Vercel

This is a deliberately smaller stack than the "target state" architecture in `ExpoBridge-PRD.md` §11 (which describes a multi-service setup for later scale). For the MVP, favor the managed services above over custom backend code — less code to write means fewer places for bugs to hide.

## Commands
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Tests: `npm test`

Run lint + typecheck + tests before saying any task is done. Fix failures yourself — don't hand back a failing check.

## Code style
- TypeScript strict mode. No `any` without a comment explaining why.
- Functions do one thing. Pushing past ~40 lines is a signal to split.
- No dead code, no commented-out code, no unused imports or variables — delete, don't comment out.
- Don't add abstraction (interfaces, factories, generic helpers) for a single use case. Write the direct version first; generalize only on the second real use.
- Search the codebase for an existing component or utility before writing a new one.
- Prefer editing an existing file over creating a new one with overlapping responsibility.

## Workflow
- Anything touching more than one file: plan first, show the plan, then implement.
- Work through `BUILD-PLAN.md` one milestone at a time. Don't start the next milestone until the current one's "definition of done" passes.
- One logical change per commit, with a real commit message — no "misc fixes."
- If a requirement is unclear or conflicts with something already built, stop and ask. Don't guess silently.

## Explicitly out of scope for MVP
Do not build these unless specifically asked: native mobile apps, AI matchmaking, virtual/hybrid booths, livestreaming, gamification, additional languages beyond English. They're Phase 2/3 in `ExpoBridge-PRD.md` §15.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
