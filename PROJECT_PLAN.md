# RadMedicine — Build Plan

_Last updated: 2026-04-19 (Weeks 1 + 2 + 3 delivered same day; marketing strategy layer delivered; Supabase live; GitHub remote live; Fly.io chosen as host; Stripe deferred)_

**Note on phasing:** the original "4-week Beta" labels are retained below for traceability but are no longer a schedule. The Code workstream has collapsed ~3 weeks of planned work plus Supabase + GitHub + analytics + SEO + waitlist + non-Stripe admin into 1 day across three sessions. Remaining Code work is sized in days, not weeks. **The new critical path for launch runs through Dan's legal items, Beta clinic agreement signing + real data intake, and real clinic photography — not through Code capacity.**

**Next Code session scope:** first Fly.io deploy (provision app, set secrets, smoke against real Supabase). Middleware and `/opengraph-image` stay on edge runtime — see Week 3+ note below on the runtime flip that was planned but proven unnecessary. **Stripe still deferred** until Jon provisions an account. All Stripe-dependent items (`/admin` refund + cancel buttons, `/onboarding` step 6 writing a real subscription, `paymentReceipt` live dispatch) remain stubbed.

This is the big-picture plan. It lives in the workspace folder (not in the code repo) because it mixes product, business, and technical context. Technical-only decisions that the code needs to know about are mirrored in `app/CLAUDE.md` in the repo.

---

## Workspace structure

```
C:\Users\jon\OneDrive\Desktop\RadMedicine\
├── ORIENTATION.md                     ← thin pointer doc for any Claude entering this folder
├── HANDOFF_PROTOCOL.md                ← cross-surface prompts + shared-file editing discipline
├── .auto-memory/                      ← Cowork's persistent memory (decisions, glossary, etc.)
├── _snapshots/                        ← historical PROJECT_PLAN.md snapshots (pre-git-tracking; archival only)
├── marketing/                         ← positioning-brief + landing-pages briefs
├── design-handoffs/                   ← archive of every Design output, dated
│   └── 2026-04-19_initial-handoff/
│       ├── RadMedicine.zip
│       └── design_handoff_radmedicine/
├── RadMed_OLD/                        ← archived; ignored
└── app/                               ← Next.js repo (git-tracked; pushed to GitHub)
    ├── PROJECT_PLAN.md                ← THIS doc: big-picture plan + business context (moved into repo 2026-04-19 for git recovery)
    ├── CLAUDE.md                      ← canonical technical context for Code
    ├── README.md                      ← dev instructions
    ├── DEPLOY_FLY.md                  ← Tuesday deploy runbook
    ├── src/                           ← routes + components + lib
    ├── db/                            ← migrations + seed + schema
    └── docs/adr/                      ← ADR 001: PII compartmentalization
```

## Surface protocol (Cowork / Code / Design)

**Full cross-surface handoff prompts live in `HANDOFF_PROTOCOL.md`.** Every session in every surface starts with a paste-in read prompt and ends with a paste-out handoff summary. Protocol file is the single source of truth for those templates.


- **Design** — idea → hi-fi visual spec → handoff package (zip with README + runnable prototype + tokens.css). Every Design session is seeded with the current tokens.css and existing component inventory. Output goes into `design-handoffs/YYYY-MM-DD_name/`.
- **Code** — handoff package → production app. Reads `app/CLAUDE.md` for conventions and load-bearing decisions. All implementation (scaffolding, pages, schema, auth, Stripe, tests) happens here.
- **Cowork** — business ops, research, memory, planning, cross-surface coordination. Marketing, Postmark copy, customer research, SEO, executive-level comms. Holds long-term memory of "what did we decide and why."
- **Legal (Workstream G)** — owned by **Dan Wobbekind**, lead counsel. Not a Cowork workstream. Cowork surfaces regulatory issues for Dan's awareness; Cowork does not draft legal docs unilaterally.

**Cross-surface discipline:**
- `tokens.css` (from Design) is the visual source of truth. Tailwind references CSS custom properties directly.
- When a cross-cutting decision gets made in any surface, update `app/CLAUDE.md` AND `PROJECT_PLAN.md` AND tell Cowork so memory stays current.
- Design handoffs are archived by date; never overwrite, always add.
- Code and Cowork have separate auto-memory systems. Neither syncs to the other automatically. Decisions that matter to both get written down in a shared doc (this file or `app/CLAUDE.md`).

---

## Decisions locked in

- **Beta target:** < 4 weeks (mid-May 2026). Week 1 delivered ahead of schedule.
- **Beta geography: Colorado only.** Geofence at onboarding step 2 (ZIP check); non-CO → waitlist signup. Removes WA MHMD, CA CMIA, CT PDPA, and other state health-data laws from Beta critical path. Colorado Privacy Act threshold (100k+ residents) is well above Beta scale; no private right of action regardless. Dan confirming.
- **Stack:** Next.js 14.2.35 App Router, TypeScript strict, Tailwind referencing `tokens.css` via CSS custom properties, `next/font/google`, React Hook Form + Zod (lands with patient onboarding), Postgres (Supabase), Drizzle, NextAuth, Stripe (deferred), Postmark, Fly.io.
- **Dev server:** port 3001 (Jon's port 3000 is occupied locally).
- **Hosting:** Fly.io. Matches Jon's other active projects (Eidrion, jon-tallman-site). Postgres stays on Supabase externally. Runtime note: middleware + `/opengraph-image` **stay on edge runtime** — `next start` runs edge routes in an embedded V8 sandbox on the Node server, same as Vercel. An earlier plan to flip both to `nodejs` for Fly was wrong: `/opengraph-image` under `nodejs` trips a `@vercel/og` prerender error (`fileURLToPath(Invalid URL)`), and middleware can't flip to `nodejs` at all on Next.js 14.2.x (Node middleware runtime is experimental in 15.2+). **Email:** Postmark (transactional).
- **Legal counsel:** Dan Wobbekind (lead counsel, all matters in hand).
- **Beta clinics:** 6–15 expected, Colorado-based. Search = sorted list + minimal filter (specialty + ZIP).
- **Billing (Beta launch):** RM-billed only via Stripe Checkout + Customer Portal. Clinic-direct path deferred to weeks 5–6.
- **Admin (Beta):** stripped-down `/admin`, email-allowlist-gated (auth lands Week 2), read-only tables + action buttons. No rich editing in admin.
- **Privacy posture (Beta):** No HIPAA program. Collect medical info + general demographics (ZIP, age range) but no directly-identifying PII. Email + payment stored in a *separate* schema (`contact`) from medical data (`med`). Handoff to clinic is email-only.
- **Design system:** Ship `default` theme only. `warm`/`clinical`/`bold` theme variants and `bold`/`quiet` hero-copy variants are NOT ported.
- **Logo wordmark uses DM Sans** (not Space Grotesk per handoff) — keeps font payload at 4 faces. Reversible on visual review.
- **Imagery:** Real clinic photography on the way; gradients are loading/fallback states only.
- **RadMed_OLD:** ignored. Fully greenfield from the design handoff.

## Deferred / do not forget

- **Font fallback quirk:** Young Serif → Source Serif 4 italic fallback powers the terracotta italics. Now explicitly pinned in code via `var(--display-italic)` on `.t-display em` — not cascade-dependent. Still: visual regression check before any font-config change lands.
- **Health-data regulations beyond HIPAA** (only relevant when Beta expands beyond CO): WA My Health My Data Act, CA CMIA, CT PDPA, etc. Do not open new states without a compliance pass routed through Dan.
- **Re-identification risk:** ZIP + age range + specific conditions can uniquely identify on small populations. Coarsen (3-digit ZIP, 10-year age bands) if utility allows.
- **Activation attribution for clinic-direct path:** when added in weeks 5–6, need both contract language AND a technical signal (referral token, patient-side confirm, reconciliation). Pure clinic self-report = revenue-leak risk.

---

## Week 1 delivered (2026-04-19)

Ahead of schedule, 9 commits on local git `main`. No GitHub remote yet.

| Item | Status |
|---|---|
| Next.js 14.2.35 App Router scaffold | ✓ at `app/` |
| Tailwind wired to `tokens.css` CSS custom properties (no hex duplication) | ✓ |
| `next/font/google` — Young Serif, DM Sans, Source Serif 4 italic, JetBrains Mono | ✓ |
| Em-italic fallback explicitly pinned via `var(--display-italic)` | ✓ |
| Shared components: Logo (4 variants), Topbar, Footer, button/card/form primitives, Eyebrow | ✓ |
| Clinic Landing (`/for-clinics`) | ✓ wireframe |
| Clinic Onboarding (`/clinic/onboarding`) — 6-step, localStorage-resumable | ✓ (manual `useReducer`; RHF+Zod deferred to patient onboarding) |
| `/admin` route — read-only tables + action buttons, banner-flagged as not-yet-auth-gated | ✓ |
| Postgres schema sketch at `app/db/schema.sql` — three compartmentalized schemas | ✓ (not a migration yet; replays into Drizzle in Week 2) |
| ADR 001: PII compartmentalization at `app/docs/adr/001-pii-compartmentalization.md` | ✓ |
| Temporary `/` type specimen (replace with Patient Landing hi-fi later) | ✓ |

### Editorial decisions made during Week 1

1. **Logo wordmark in DM Sans, not Space Grotesk.** Keeps font payload at 4 faces. Approved 2026-04-19, reversible on visual review.
2. **Topbar auto-infers mode from pathname** — `/for-clinics` and `/clinic/*` switch to clinic-side nav without per-route-group layouts.
3. **Route groups:** `(public)` wraps marketing + patient + clinic in shared Topbar/Footer; `/admin` sits outside with minimal chrome. Dashboards (when built) sit outside `(public)` too.
4. **Clinic onboarding uses manual `useReducer`**, not React Hook Form + Zod. RHF + Zod arrives with patient onboarding hi-fi (Week 3).
5. **`/admin` has no auth gate yet** — banner-flagged. NextAuth + email-allowlist gate lands Week 2. Do not link `/admin` from anywhere public until then.

---

## Workstreams

### A. Frontend scaffold + design system port
**Week 1: DELIVERED.** Carry-overs: visual regression baseline (Playwright) on hero before font changes ever ship.

### B. Hi-fi pages (pixel-perfect)
- **Patient Landing** (`/`) — hero + search, specialty grid, featured doctors, 3-step model, testimonial, CTA band. (Week 2.)
- **Patient Onboarding** (`/onboarding`) — 7-step flow, progress bar, privacy callout, match cards, payment. (Week 3.)
  - Persist step state to localStorage (no PII — enforce)
  - Fade-slide transitions
  - Beta launch uses RM-billed path only at step 6
  - **Step 2 includes Colorado geofence** — non-CO ZIPs → waitlist branch

### C. Wireframe pages (tokenized styling, Beta dependency order)
1. Clinic Landing (`/for-clinics`) — **delivered Week 1**
2. Clinic Onboarding (`/clinic/onboarding`) — **delivered Week 1**
3. Search Results (`/search`) — Week 3
4. Doctor Profile (`/doctors/[id]`) — Week 3
5. _[Deferred for Beta]_ Patient Dashboard, Clinic Dashboard, Booking, Pricing, About

### D. Data model + backend
- **Three compartmentalized schemas with physical separation:**
  - `core`: clinics, doctors, specialties, reviews, availability, subscription records (no PII)
  - `contact`: patient email, Stripe customer ID, subscription↔contact link. Accessed only by billing and email services. Per-schema connection roles; `contact.subscriber_access_log` audits every read.
  - `med`: medical intake (needs checklist, insurance posture, ZIP, age range) keyed by opaque `intake_id`. Matching service is narrow `med → core` bridge.
- Search/filter queries (specialty + ZIP for Beta)
- Seed data for Beta clinics
- Data-access layer with clear boundary per schema
- **Week 2:** replay `app/db/schema.sql` into real Drizzle migrations against Postgres

### E. Integrations
- **Stripe** — RM-billed at Beta launch: Checkout + Customer Portal + Billing. Clinic-direct path added weeks 5–6 behind same abstraction.
- **Postmark** — transactional: onboarding confirm (patient), clinic notification of new patient, payment receipt, welcome email, subscription cancelled, waitlist confirmation (added for CO-only launch).
- **Auth** — NextAuth; patient vs. clinic role discriminator; email-allowlist for `/admin`. Week 2.

### F. Admin (stripped-down for Beta)
- `/admin` route — **delivered Week 1**, banner-flagged pending auth
- Week 2: NextAuth + email-allowlist gate
- Week 2+: action-button wiring as Stripe and email come online
- Audit log on every `contact` touch

### G. Content + legal + SEO — *owned by Dan Wobbekind, not Cowork*
Covered by external counsel. If Dan needs RadMedicine-specific context to draft, route through Jon. Cowork does NOT draft TOS, Privacy, or Beta clinic agreement.

### H. Marketing + launch content — *Cowork*

**Strategy layer — DELIVERED 2026-04-19:**
- `marketing/positioning-brief.md` — master positioning + messaging pillars + voice rules + claim guardrails + reusable copy modules + audience map. All downstream marketing inherits from this.
- `marketing/landing-pages/01-value.md` — copy + design brief for `/for-you/value` (priced-out-for-everyday-care audience)
- `marketing/landing-pages/02-professionals.md` — copy + design brief for `/for-you/professionals` (time-poor audience)
- `marketing/landing-pages/03-access.md` — copy + design brief for `/for-you/access` (wealthy/retiree audience; **flagged strategic priority** — existing CO DPC clinics already cater to this group on pricing)

**Marketing copy still to write (Cowork):**
- Homepage copy (neutral marketplace framing — not audience-specific)
- Beta clinic outreach emails (cold + warm + follow-ups)
- Postmark transactional template copy (~6 templates — 5 planned + waitlist confirmation)
- Launch announcement (blog/website + social — Colorado-specific framing)
- Waitlist drip for non-CO patients
- Clinic onboarding email sequence (setup guidance, next steps, support)
- SEO/metadata pass across all marketing pages

**Marketing positioning — key rules (summary; full version in positioning-brief.md):**
- Insurance is a **foil, not an adversary**. Never anti-insurance copy. Brokers coming to the site post-Beta to help members right-size coverage.
- Homepage stays neutral; each audience landing page owns its reframing independently.
- No dollar-savings claims on page 1. Frame around value/experience, not price.
- No "concierge" language on page 3. No Medicare-specific claims until Dan reviews.
- Italic accent on the *verb that proves the promise* in every hero headline.
- The "How this works with insurance" module is identical and mandatory on every landing page.

---

## Scope cuts for 4-week Beta

Non-negotiable unless explicitly reopened.

- **Colorado-only launch.** Non-CO → waitlist.
- **No Patient Dashboard, no Clinic Dashboard.**
- **No Booking, Pricing, About pages.**
- **Search = sorted list + specialty/ZIP filter only.**
- **Patient Onboarding ships "high-fidelity-ish,"** not pixel-perfect.
- **Clinic-direct billing path deferred** to weeks 5–6.
- **Stripe = Checkout + Customer Portal only.**

---

## 4-week phasing

### Week 1 — Scaffold + clinic side (wireframe) — DELIVERED
See "Week 1 delivered" above.

### Week 2 — Schema + auth + clinic editing + Patient Landing — DELIVERED 2026-04-19
- Drizzle ORM ported (three per-schema clients: core/contact/med); Supabase-compatible connection
- NextAuth v5 with magic-link + `/admin` email-allowlist gate via middleware (edge-safe auth.config split)
- Clinic self-serve editing at `/clinic/dashboard/[slug]/{profile,pricing,availability}` with ownership check
- Patient Landing hi-fi at `/` (data-driven from `core`), approved hero `*A real doctor, delivered directly.*`
- Seed script with 10 placeholder CO clinics + Jon's admin user across all 10
- db/schema.sql replaced by real Drizzle migrations under `db/migrations/`
- **Decision logged:** module-layer PII compartmentalization for Beta (one connection; services import `src/lib/db/core|contact|med` boundary-enforced). Per-role connection swap deferred post-Beta, no call-site changes expected.
- **Decision logged:** JWT session strategy; `core.sessions` table exists unused for future DB-session flip if admin revocation is needed pre-launch.

### Week 3 — Search + patient onboarding + email — DELIVERED 2026-04-19
- `/search` (specialty + ZIP filter, sorted list) with real data
- `/doctors/[slug]` profile with reviews, availability, subscribe CTA
- `/onboarding` 7-step with Colorado geofence at step 2 + non-CO waitlist branch (ZIP range 80000–81699)
- 6 Postmark transactional templates + magic-link; live dispatch when `POSTMARK_API_KEY` is set, stubs when not
- Playwright visual regression baseline on hero (maxDiffPixelRatio 0.02)
- **Decision logged:** graceful DB fallback on `/` (`safe(fn, fallback)` wrapper on every homepage read) so hero renders even if Supabase is down and visual regression can run without live DB

### Pre-launch checklist (supersedes Week 4 phasing)

**Code (days, not weeks):**

_Delivered 2026-04-19 (evening session):_
- ✓ Supabase hookup — live migration + seed against real Postgres (DATABASE_URL pooler :6543 +pgbouncer=true for runtime, DIRECT_URL :5432 for migrations)
- ✓ GitHub private remote — `github.com/RadMedicine/RadMedicine-Prod`, SSH alias `github-radmedicine`, `main` pushed
- ✓ `dev:3001` script in `package.json`
- ✓ Standalone `/waitlist` page (direct entry + onboarding step 2 branch + homepage non-CO fallback — three consistent entry points)
- ✓ Non-Stripe `/admin` action wiring — approve/reject clinic, visibility toggle
- ✓ Analytics — Plausible wired (cookie-free, activates when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set)
- ✓ SEO basics — `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, per-page metadata
- ✓ Playwright visual regression extended to Topbar + Footer (maxDiffPixelRatio 0.02)
- ✓ Clinic new-patient notification Postmark template — **contains load-bearing privacy sentence that needs Dan's review** (see Dan's list #15)

_Next Code session (Fly deploy):_
- Provision `radmedicine` app on Fly.io
- (Superseded) Flipping middleware + `/opengraph-image` to `runtime = "nodejs"` is NOT needed and actively breaks the build — both stay on edge. See Stack section runtime note.
- Set Fly secrets — DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_PLAUSIBLE_DOMAIN, POSTMARK_API_KEY (when ready)
- First deploy + smoke against real Supabase
- Decide custom domain cutover timing (Fly default subdomain → `radmedicine.io`)

_Deferred to later sessions:_
- **Stripe Checkout + Customer Portal** (billing-only for Beta; `/onboarding` step 6 writes real subscription; `paymentReceipt` dispatches live) — gated on Jon provisioning a Stripe account
- **Stripe-dependent `/admin` actions** — refund, cancel subscription + `subscriptionCancelled` email
- **Audience landing pages** (`/for-you/value`, `/for-you/professionals`, `/for-you/access`) — gated on Design handoff; copy already in `marketing/landing-pages/`
- **Photography swap** — gated on real clinic photos arriving
- **Visual regression extension to audience landing pages** — gated on Design + Code landing pages
- **DB session strategy flip** — only if admin session revocation is wanted pre-launch
- **Branch protection on GitHub** — reasonable to skip for solo-dev Beta; revisit if collaborators join

**Operations (real-world dependencies):**
- Beta clinic agreement finalized by Dan; signed by all 6–15 Beta clinics
- Real clinic data intake (profile, pricing, availability) replacing seeded placeholders
- Real clinic-operator emails swapped into `core.clinic_users` (placeholder is Jon's email for all 10 seeded clinics — must be swapped before production launch or new-patient notifications go to the wrong inbox)
- Real clinic photography sourced and delivered (at least `/for-you/access` page if budget constrained)
- ✓ **Supabase**: live as of 2026-04-19 evening. Project provisioned, DATABASE_URL/DIRECT_URL configured, migrations + seed run successfully.
- ✓ **GitHub**: private remote live at `github.com/RadMedicine/RadMedicine-Prod` as of 2026-04-19 evening.
- **Postmark**: API key + verified sender domain — *parked pending Jon's decision on sender domain*. Code stays in stub mode until resolved. **Soft expiration on this parking lot**: can't validate end-to-end magic-link against real Supabase without live email. Will become a blocker before first real clinic user signs in.
- **Plausible**: account + DNS — pending. Hosted plausible.io (~$9/mo) recommended for solo-founder posture over self-hosted. No blocker; analytics activates silently when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.
- **Fly.io**: `radmedicine` app name to be provisioned. Custom domain (`radmedicine.io`) cutover timing TBD — can live on Fly default subdomain for Beta or flip before first clinic outreach.
- **Domain**: `radmedicine.io` registered on GoDaddy. Credentials currently held by Dan; Jon picks them up Tuesday 2026-04-21 during Dan walk-through. DNS records (Plausible, Postmark sender verification, Fly custom domain) wait on that handoff.
- **Dan walk-through**: Tuesday 2026-04-21. Jon walking Dan through the site and handing off the full 15-item legal action list.
- **Stripe**: **DEFERRED to a later session.** Jon not ready to provision a Stripe account yet. Billing-only posture confirmed for when it lands (no Connect for Beta). Other payment models added post-Beta.

**Cowork (days, not weeks):**
- Homepage copy — largely done (subhead and approved hero live); audit remaining hero supports (ticker strip, section eyebrows, CTAs) before launch
- Voice review pass on 6 Postmark transactional templates
- Beta clinic outreach emails (cold + warm + follow-ups)
- Launch announcement (blog/site + social — CO-specific framing)
- Waitlist drip for non-CO visitors (2–3 email sequence)
- Clinic onboarding email sequence
- SEO metadata pass across all marketing pages

**Dan-owned gate items (Workstream G):**

_Ordered roughly by priority / launch-blocking nature. Jon is packaging this list to share with Dan._

1. **HIPAA posture copy** — the `"RadMedicine isn't a HIPAA covered entity by design"` privacy callout on `/onboarding` step 1 is legally meaningful and currently live in the codebase. Highest-priority review item.
2. **Beta clinic agreement** — gates every Beta clinic signing. Critical path for launch.
3. **TOS + Privacy Policy** — required pre-launch; drives footer links, consent checkbox copy, and data-retention positioning.
4. **Patient cancellation + refund policy** — pending. Drives TOS language, the `subscriptionCancelled` email template, UI copy in the Customer Portal, and admin action semantics. We don't have a policy yet and the `/admin` refund + cancel buttons are being wired this week.
5. **Clinic dashboard terms of use** — gap currently. Clinic users sign in via magic link and edit pricing/availability without accepting any terms. Before real clinics join, they need to accept a dashboard ToS that covers data accuracy, content ownership, indemnification, and termination.
6. **Waitlist out-of-state consent language** — copy + retention policy. How long do we hold non-CO emails? Right-to-delete posture?
7. **"Direct text or call access" marketing claims** — the proof lines on our landing pages promise direct text/call access between patient and doctor. When a doctor messages a patient about medical issues, those messages can be PHI under HIPAA (for the clinic, not us). Our copy should be accurate to what clinics actually offer; some may use platforms with BAAs, some may not. Worth Dan's eye before the audience landing pages go live.
8. **Medicare FAQ answer** on `/for-you/access` before publish (current FAQ carries a placeholder).
9. **HSA FAQ language** across all landing pages before publish.
10. **Specific-dollar pricing claims** on pages once pulled from real clinic data (currently `$60–$150` and `$60–$200` placeholders in drafts).
11. **Panel-size claim (600–800 vs. 2,000+)** and **concierge price-comparison ($2K–$10K/year)** on `/for-you/access` — defensible directionally but sensitive.
12. **CAN-SPAM + CO CPA** posture for marketing email and waitlist drip.
13. **Patient testimonial consent template** — for when founding clinics share existing testimonials or we collect new ones. CO has rules about health-related testimonials.
14. **Beta-period privacy notice** — should our privacy notice explicitly acknowledge that data handling will evolve post-Beta? Or is a standard notice sufficient?
15. **Clinic new-patient notification email — privacy claim** — the notification template that goes to clinics when a patient is matched contains a load-bearing privacy sentence: *"this is all the information we hold on this patient — their ZIP, age range, and care needs never leave our platform."* This is a substantive claim about ADR 001 compartmentalization. Needs Dan's eye to confirm it's defensible against what we actually do (especially given that the per-role connection swap is deferred post-Beta and we currently rely on module-layer enforcement). Also needs Cowork voice review against the positioning brief.

### Post-Beta (weeks 5+)
- Clinic-direct billing path + activation attribution
- Patient + Clinic dashboards
- Remaining wireframe pages (Booking, Pricing, About)
- Multi-state expansion (WA MHMD / CA CMIA / CT PDPA compliance gating required before opening any new state)
- SEO + marketing polish beyond launch basics
- Broker partnership flow (the post-Beta piece of the insurance positioning — lets patients right-size coverage)

---

## Still open

_Partially reconstructed 2026-04-19 after a tail-truncation incident (see "File hygiene" below). Jon: please sanity-check — if you remember additional open items that used to live here, add them back._

- **Additional landing pages** — specialty/city/condition landers, partnerships, SEO content. Doesn't block Beta but shapes future content work.
- **Doctor photography** — when does real imagery start arriving? Gradient placeholders are fine for scaffold + Patient Landing; before launch the hero + featured-doctor slots want real photography (at minimum for `/for-you/access` if budget is constrained).

---

## File hygiene

Shared-file editing discipline (prefer Edit over full-file Write, archive-don't-delete) lives in `HANDOFF_PROTOCOL.md` §Shared-file editing discipline — canonical there so every surface reads it before touching any shared file. Rules were added after a cross-surface editing race truncated this file on 2026-04-19.

As of 2026-04-19 this file lives inside the `app/` git-tracked repo. The snapshot and `<!-- END OF FILE -->` canary rules retired with the move — `git log --follow app/PROJECT_PLAN.md` and `git show <SHA>:app/PROJECT_PLAN.md` are the recovery path now. The `_snapshots/` folder at workspace root retains the 2026-04-19 incident evidence for forensics.
