# ADR 001 — PII compartmentalization

_Status: accepted · Date: 2026-04-19_

## Context

RadMedicine collects two kinds of sensitive data about patients during the
Beta onboarding flow:

1. **Contact data** — email address and Stripe customer ID. Needed to bill
   the patient and to hand off to the clinic after enrollment.
2. **Medical / demographic intake data** — ZIP, age range, household size,
   a needs checklist (primary care, chronic care, mental health, &hellip;),
   and an insurance posture question. Used once during onboarding to match
   the patient to a doctor.

RadMedicine is not a HIPAA covered entity by design (see PROJECT_PLAN), but
state-level regimes (WA My Health My Data Act, CA CMIA, CT) can still
apply. Combining the two classes of data in one store &mdash; or making a
join key between them visible to general-purpose application code &mdash;
is the easiest way to accidentally create an identified medical record.

## Decision

Three **physically separated** Postgres schemas inside the same database
cluster, each accessed by a distinct database role. App code wiring up UI
surfaces has a connection scoped to exactly one schema; cross-schema joins
are not expressible from app code.

| Schema    | Contains                                                      | Accessed by                                                                              |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `core`    | Clinics, doctors, specialties, availability, reviews, subscriptions, activations. **No PII.** | General app code on patient and clinic surfaces.                                         |
| `contact` | Email, Stripe customer ID, `subscriber_token` back-pointer.   | Billing service and email service **only**.                                              |
| `med`     | Intake responses keyed by opaque `intake_id`. No link back to `subscriber_token` that is persisted. | Matching service during onboarding. Writes the match result (`subscriber_token`) into `core.subscriptions`; the `intake_id` &harr; `subscriber_token` link lives only in the request scope and is never written down. |

Join strategy:

- `core.subscriptions` stores an opaque `subscriber_token`.
- `contact.subscribers` stores the same token alongside the email and
  Stripe customer ID. The billing service is the only thing that can
  dereference the token to a real email.
- `med.intake_responses.intake_id` is never joined to `subscriber_token`
  persistently. The matching service receives an intake, computes a match,
  and writes only the resulting `subscriber_token` into `core.subscriptions`.
  The intake itself stays in `med` with no back-reference.

## Consequences

**Good**

- A compromise of the patient-facing app (read-only access to `core`) does
  not expose email, identity, or medical intake.
- A compromise of the billing service does not expose medical intake.
- A compromise of the matching service (fewer surfaces, short-lived
  connections) exposes only the in-flight intake, not the wider contact
  list.
- Re-identification via quasi-identifiers (ZIP &times; age &times;
  condition) is bounded to whoever already has `med` access.
- If compliance requirements tighten, escalation to separate databases
  (or separate clusters with separate encryption keys) is a configuration
  change, not a rewrite.

**Bad**

- Ad-hoc analytics and support flows that legitimately need to correlate
  data across schemas require a trusted service with elevated access,
  logged. No `psql`-as-a-human-DBA ergonomic path for correlation.
- Any join expressed in app code is a smell and a review gate.

**Watch**

- ZIP &times; age range &times; rare condition can uniquely identify a
  person on small populations. Consider coarsening (3-digit ZIP, 10-year
  age bands) if matching utility holds.
- The matching service is the narrow bridge between `med` and `core`. Its
  code is the highest-scrutiny code in the repo; any caching or logging
  there must explicitly not persist the intake &harr; subscriber link.

## Alternatives considered

- **One schema, RLS per role.** Rejected: Postgres RLS is an authorization
  layer on top of physical storage. A SQL-injection bug or a misconfigured
  role policy defeats it. Physical schema separation with per-schema
  connection roles fails closed.
- **Separate databases from day one.** Over-indexed for Beta. Keeps three
  separate backup/restore/migration pipelines; buys little over
  per-schema roles while the blast radius is still small. Revisit when
  HIPAA or a regulated integration forces it.
- **Store intake responses encrypted in `contact`.** Encryption at rest
  without a separate key custodian is cosmetic; it doesn&apos;t change the
  blast radius of a database compromise. Separation does.

## Out of scope

- ORM choice. Drizzle is the working assumption per CLAUDE.md; this ADR
  is agnostic &mdash; the three-schema design works under any ORM.
- Backup &amp; restore procedures. Beta: standard Neon/Supabase point-in-
  time restore. A real ops doc follows when we move off managed Postgres.
- Audit log implementation. Noted as a requirement for `contact` reads and
  writes (PROJECT_PLAN Workstream F). Schema and retention policy to be
  decided in a later ADR.

## References

- `app/CLAUDE.md` &sect; Critical rules #1, #6
- `app/CLAUDE.md` &sect; Architecture: data compartmentalization
- `PROJECT_PLAN.md` &sect; Privacy posture (Beta), Workstream D
- `db/schema.sql` &mdash; the executable form of this decision
