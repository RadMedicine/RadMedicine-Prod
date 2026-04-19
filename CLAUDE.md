# CLAUDE.md — RadMedicine

Canonical bootstrap context for any Claude (or human) entering this repo. Update as the project evolves.

---

## What this is

RadMedicine is a two-sided marketplace connecting patients with Direct Primary Care (DPC) doctors — physicians who charge a flat monthly fee and bypass insurance for primary care.

- **Patient-facing surface:** discover and subscribe to DPC doctors
- **Clinic-facing surface:** patient acquisition for DPC clinics ("Patient Acquisition as a Service"); clinics pay a per-patient-activated fee
- **Brand:** "Healthcare, delivered directly to the people who need it." Insurance stays for emergencies; everything else, the patient gets back.

---

## Critical rules — never violate without explicit approval

1. **Do not put PII in the medical/demographic data store.** Patient name, DOB, full address, SSN do not get stored anywhere. Email and payment-method tokens live ONLY in the `contact` schema, physically separated from medical data with no shared join keys visible to app code touching the medical store. This is the most load-bearing decision in the codebase. See [`docs/adr/001-pii-compartmentalization.md`](./docs/adr/001-pii-compartmentalization.md) and [`db/schema.sql`](./db/schema.sql).
2. **Do not break the Young Serif → Source Serif 4 italic fallback.** The terracotta italic phrases in display headlines (e.g. "*delivered directly*", "*you*", "*real doctor*") depend on Young Serif having no italic, which causes `<em>` to fall back to Source Serif 4 italic, then colored via CSS. Any font-loading change must preserve this. Add a visual regression check before changing font config.
3. **Do not duplicate design tokens.** `tokens.css` from the Design handoff is the visual source of truth. Tailwind references CSS custom properties directly (e.g. `bg-[var(--primary)]`); do not copy hex values into the Tailwind theme.
4. **Do not introduce new design tokens or fonts without an approved Design handoff.** New components should use existing tokens. If a new token is genuinely needed, it gets added to `tokens.css` first via Design, then propagated.
5. **Do not skip pre-commit hooks** unless Jon explicitly asks. Investigate failures, don't bypass.
6. **Do not store patient PII in localStorage** during the onboarding flow. Step state can persist (which step they're on, what choices they've made for the medical/demographic intake), but no email/name/payment until the user is mid-payment-step and we've handed off to Stripe.

---

## Stack

- **Framework:** Next.js 14+ App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS, with theme referencing `tokens.css` CSS custom properties
- **Fonts:** `next/font/google` — Young Serif 400, DM Sans 300/400/500/600/700, Source Serif 4 italic 400, JetBrains Mono 400/500
- **Forms:** React Hook Form + Zod
- **DB:** Postgres (provider TBD — likely Neon or Supabase for Beta)
- **ORM:** Drizzle preferred (lighter than Prisma, easier multi-schema support which we need for compartmentalization)
- **Auth:** NextAuth (patient/clinic role discriminator + email-allowlist for `/admin`)
- **Payments:** Stripe — Checkout + Customer Portal (RM-billed path only at Beta launch)
- **Email:** Postmark (transactional)
- **Hosting:** Vercel
- **Testing:** Vitest for units, Playwright for E2E + visual regression on hi-fi pages

---

## Architecture: data compartmentalization

Three logical stores with **physical** separation. Implementation: separate Postgres schemas (`core`, `contact`, `med`) inside the same database, with database roles preventing cross-schema joins from app code. Optional escalation: separate databases entirely if compliance requirements tighten.

### `core` schema (no PII)
- `clinics`, `doctors`, `specialties`, `availability`, `reviews`
- `subscriptions` — billing path (`'rm_billed' | 'clinic_direct'`), status, plan, doctor_id, opaque `subscriber_token` (joins to `contact` only via the billing service)
- `activations` — for clinic-direct path; tracks per-activation fees owed to RM

### `contact` schema (PII)
- `subscribers` — email, Stripe customer ID, `subscriber_token` (back to `core.subscriptions`)
- Accessed only by the billing service and the email service. App code rendering UI for `core` data MUST NOT have a connection that can read `contact`.
- Audit log on every read/write.

### `med` schema (sensitive medical/demographic intake)
- `intake_responses` — keyed by an opaque `intake_id`, never linked back to `subscribers` in any way visible to app code
- ZIP, age range, household size, needs checklist (primary care, chronic, mental health, etc.), insurance posture
- Used for matching during onboarding step 5; the match result writes a `subscriber_token` into `core.subscriptions`. The link from `intake_id` → `subscriber_token` exists only inside the matching service for the duration of one request and is not persisted.

**Practical implication:** if you find yourself writing a query that joins across schemas, stop and check whether it should exist. The compartmentalization is the whole point; bypassing it for convenience defeats the privacy posture.

---

## Billing model

Beta launch supports **RM-billed only**:
- Patient subscribes via RadMedicine; Stripe charges patient
- RadMedicine remits to clinic (mechanism TBD — likely Stripe Connect when ready, manual for first Beta clinics)
- Stripe Checkout + Customer Portal for the entire patient-facing billing flow

**Clinic-direct** path is deferred to weeks 5–6 post-launch but the data model accommodates it from day one (`subscriptions.billing_path`). Do not architect away the second path during Beta scope cuts.

---

## Design system

The design handoff lives in the workspace folder at `../design-handoffs/2026-04-19_initial-handoff/design_handoff_radmedicine/`. Read its README before implementing any page.

### Token discipline
- All visual tokens in `tokens.css` (palette, type scale, spacing, radii, shadows)
- Tailwind theme: `colors.primary = 'var(--primary)'`, etc. — never duplicate hex
- Spacing scale: `--s-1` through `--s-10` (4px → 128px)
- Radii: `--r-1` (4px), `--r-2` (8px), `--r-3` (14px); buttons use pill `border-radius: 999px`
- Only the `default` theme ships. The `warm`/`clinical`/`bold` theme variants in the handoff are reference and should NOT be ported.

### Type rules
- Display headlines use Young Serif; their `<em>` falls through to Source Serif 4 italic, colored `var(--accent)` via global CSS:
  ```css
  .t-display em, .t-h1 em, .t-h2 em {
    font-style: italic;
    color: var(--accent);
    font-family: 'Source Serif 4', serif;
  }
  ```
- Body / UI / nav / forms: DM Sans
- Eyebrows / data / mono moments: JetBrains Mono

### Logo
Lives at [`src/components/ui/Logo.tsx`](./src/components/ui/Logo.tsx). Four variants: `mark` (default), `stacked`, `monogram`, `wordmark`. ECG mark SVG is ported faithfully from the handoff (119×85 viewBox, R-peak hub + cross-network diagonals). Rad/Medicine size hierarchy (Rad full size, Medicine at 66%, baseline-aligned) is preserved.

**Editorial liberty:** the handoff specifies **Space Grotesk** for the wordmark. We ship with **DM Sans** instead — already loaded for body/UI, so no extra font payload. Visual character is close enough and Jon approved the swap on 2026-04-19. Reversible if needed: add a fifth `next/font/google` import and change `wordmarkFont` in `Logo.tsx`.

---

## File / folder conventions

Current layout (refined Week 1; refine further as the codebase grows):

```
app/
├── (public)/                 ← everything with marketing chrome — opts IN to Topbar + Footer
│   ├── layout.tsx            ← Topbar + Footer
│   ├── page.tsx              ← temporary type specimen (replace with Patient Landing)
│   ├── for-clinics/          ← Clinic Landing (wireframe)
│   └── clinic/onboarding/    ← 6-step clinic onboarding (wireframe, localStorage resume)
├── admin/                    ← /admin — own minimal chrome; NOT wrapped by Topbar/Footer
│   ├── layout.tsx            ← admin header
│   ├── page.tsx              ← read-only tables + action buttons
│   └── actions.tsx           ← client component, inert console stubs
├── layout.tsx                ← root: <html>, <body>, fonts only
└── globals.css               ← imports tokens.css, then Tailwind layers

src/
├── components/
│   ├── ui/                   ← Logo, Topbar, Footer (shared primitives)
│   └── feature/              ← (future) page-specific composite components
├── lib/
│   ├── admin/seed.ts         ← Beta wireframe seed data; shapes mirror db/schema.sql
│   ├── db/                   ← (future) per-schema DB access — core / contact / med
│   ├── billing/              ← (future) Stripe abstraction — only thing that touches contact from billing
│   ├── email/                ← (future) Postmark abstraction — only thing that touches contact from email
│   └── matching/             ← (future) onboarding match logic; bridges med → core short-lived
└── styles/
    └── tokens.css            ← ported from design handoff; source of truth for visual tokens

db/
└── schema.sql                ← three-schema Postgres sketch (core / contact / med). Not a migration
                                yet — schema changes land here first, then get replayed into Drizzle.

docs/
└── adr/
    └── 001-pii-compartmentalization.md  ← the load-bearing privacy design
```

### Route groups

- **`(public)` wraps the marketing + patient + clinic surface in a single layout that renders `<Topbar />` + children + `<Footer />`.** Anything that should feel like "RadMedicine.com" lives here.
- **`/admin` sits outside the `(public)` group** so the marketing chrome doesn't leak into operator views. It brings its own minimal layout.
- When we add the real `(patient)` and `(clinic)` logged-in surfaces (dashboards), they'll likely sit outside `(public)` too — dashboards explicitly have no topbar/footer per the design handoff.

### Topbar mode inference

`Topbar.tsx` is a client component. It calls `usePathname()` and auto-selects the clinic-side nav set when the pathname is `/for-clinics` or starts with `/clinic/`. The `mode` prop still overrides the inference when needed.

---

## Local dev

```bash
npm run dev -- -p 3001
```

Port 3000 is occupied by another app on Jon's machine — always pass an explicit port flag.

## What to do if you're a fresh Claude entering this repo

1. Read this file end to end.
2. Read `../PROJECT_PLAN.md` (in the workspace folder) for current scope, phasing, and what's in/out for Beta.
3. Read the design handoff README at `../design-handoffs/2026-04-19_initial-handoff/design_handoff_radmedicine/README.md`.
4. Read [`docs/adr/001-pii-compartmentalization.md`](./docs/adr/001-pii-compartmentalization.md) — it's the most load-bearing decision in the codebase.
5. `git log --oneline -20` to see recent activity.
6. Then ask Jon what specifically you're working on.

---

## Where business and product context lives

This repo holds technical decisions only. Product strategy, Beta planning, business decisions, marketing/legal/email copy, and customer research live in the workspace folder one level up (`../PROJECT_PLAN.md` and Cowork's auto-memory). When a decision crosses the technical/business boundary, update both this `CLAUDE.md` and PROJECT_PLAN.md, and tell Cowork so the memory stays current.
