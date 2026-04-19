# RadMedicine

Two-sided marketplace for Direct Primary Care. This repo is the Beta web app — a Next.js 14 App Router rebuild from the Claude Design handoff at `../design-handoffs/2026-04-19_initial-handoff/`.

## Read before touching the code

1. [`CLAUDE.md`](./CLAUDE.md) — critical rules, stack, design-system discipline, file/folder conventions.
2. [`../PROJECT_PLAN.md`](../PROJECT_PLAN.md) — scope, phasing, Beta cuts, open questions.
3. [`docs/adr/001-pii-compartmentalization.md`](./docs/adr/001-pii-compartmentalization.md) — the load-bearing privacy design.

## Run locally

```bash
cp .env.example .env.local        # then fill in DATABASE_URL, NEXTAUTH_*, ADMIN_EMAILS
npm run db:migrate                 # apply Drizzle migrations to Supabase
npm run db:seed                    # placeholder data (10 CO clinics, 4 subscriptions, waitlist rows)
npm run dev -- -p 3001
```

Port 3000 is occupied on Jon's machine — always pass an explicit port.

### Database workflow

- `db:generate` — regenerate a migration from schema changes under `src/lib/db/schema/*.ts`. Commit the new SQL in `db/migrations/`.
- `db:migrate` — apply pending migrations to `DATABASE_URL`.
- `db:seed` — insert idempotent placeholder data (safe to re-run).
- `db:studio` — drizzle-kit studio (web UI for the live DB).

Postgres runs on Supabase. Connection string goes in `DATABASE_URL` (transaction-pooler URL, port 6543). Per ADR 001 the `core` / `contact` / `med` schemas are physically separated and must be accessed through distinct Drizzle clients at `src/lib/db/{core,contact,med}.ts`.

Live routes:

- `/` — temporary type specimen (will be replaced by the Patient Landing hi-fi port)
- `/for-clinics` — Clinic Landing wireframe
- `/clinic/onboarding` — 6-step clinic onboarding (localStorage-resumable)
- `/admin` — read-only tables + action buttons (wireframe; **not yet auth-gated**, banner flags this)

## Stack

Next.js 14 (pinned 14.2.35) · TypeScript strict · Tailwind → CSS custom properties in `src/styles/tokens.css` · `next/font/google` for Young Serif, DM Sans, Source Serif 4 italic, JetBrains Mono · Postgres (provider TBD) · Drizzle (deferred) · NextAuth (deferred) · Stripe (deferred) · Postmark (deferred) · Vercel (deferred).

## Layout

```
app/(public)/     ← marketing / patient / clinic — wrapped in Topbar + Footer
app/admin/        ← /admin — own minimal chrome, sits outside (public)
src/components/   ← Logo, Topbar, Footer
src/styles/       ← tokens.css (visual source of truth)
src/lib/admin/    ← Beta seed data; shapes mirror db/schema.sql
db/schema.sql     ← three-schema Postgres sketch (not a migration yet)
docs/adr/         ← Architecture Decision Records
```

See `CLAUDE.md § File / folder conventions` for the full tree.
