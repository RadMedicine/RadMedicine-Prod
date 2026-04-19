# RadMedicine

Two-sided marketplace for Direct Primary Care. Next.js 14 App Router, rebuilt from the Claude Design handoff at `../design-handoffs/2026-04-19_initial-handoff/`.

## Read before touching the code

1. [`CLAUDE.md`](./CLAUDE.md) — critical rules, stack, design-system discipline, file/folder conventions.
2. [`../PROJECT_PLAN.md`](../PROJECT_PLAN.md) — scope, phasing, Beta cuts, open questions, Dan's legal queue.
3. [`docs/adr/001-pii-compartmentalization.md`](./docs/adr/001-pii-compartmentalization.md) — the load-bearing privacy design.

## Run locally

```bash
cp .env.example .env.local   # fill DATABASE_URL, NEXTAUTH_*, ADMIN_EMAILS
npm run db:migrate            # apply Drizzle migrations to Supabase
npm run db:seed               # idempotent placeholder data
npm run dev:3001              # dev server on port 3001
```

`npm run dev` defaults to Next's port 3000. Jon's machine has 3000 occupied; `npm run dev:3001` is the path-of-least-resistance on that host.

### Database workflow

- `db:generate` — regenerate a migration from schema changes under `src/lib/db/schema/*.ts`. Commit the new SQL in `db/migrations/`.
- `db:migrate` — apply pending migrations to `DATABASE_URL`.
- `db:seed` — insert idempotent placeholder data (safe to re-run).
- `db:studio` — drizzle-kit studio (web UI for the live DB).

Postgres runs on Supabase. Connection string goes in `DATABASE_URL` (transaction-pooler URL, port 6543). Per ADR 001 the `core` / `contact` / `med` schemas are physically separated and must be accessed through distinct Drizzle clients at `src/lib/db/{core,contact,med}.ts`.

### Visual regression

- `npm run test:visual` — run against committed baselines.
- `npm run test:visual:update` — regenerate baselines after an intentional visual change.

## Live routes

- `/` — Patient Landing (hi-fi, data-driven)
- `/for-clinics` — Clinic Landing (wireframe)
- `/clinic/onboarding` — 6-step clinic onboarding (localStorage-resumable)
- `/search` — clinic list with specialty + ZIP filter
- `/doctors/[slug]` — doctor profile
- `/onboarding` — 7-step patient flow with CO geofence at step 2
- `/waitlist` — direct waitlist entry (non-CO)
- `/sign-in` — magic-link
- `/admin` — read-only tables + action buttons (gated: email in `ADMIN_EMAILS`)
- `/clinic/dashboard/[slug]/{profile,pricing,availability}` — clinic self-serve editing (gated)

## Stack

Next.js 14.2.35 · TypeScript strict · Tailwind → CSS custom properties in `src/styles/tokens.css` · `next/font/google` (Young Serif, DM Sans, Source Serif 4 italic, JetBrains Mono) · Postgres on Supabase via Drizzle · NextAuth v5 (magic-link) · Postmark (transactional) · Fly.io (hosting) · Stripe (deferred).

See [`CLAUDE.md`](./CLAUDE.md) § File / folder conventions for the full tree.
