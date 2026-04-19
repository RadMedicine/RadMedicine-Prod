-- RadMedicine Postgres schema sketch (Beta)
--
-- Week 1 deliverable per PROJECT_PLAN Workstream D. This is the executable
-- form of ADR 001 (docs/adr/001-pii-compartmentalization.md) — three
-- physically separated schemas with per-schema connection roles so
-- application code cannot cross the PII boundary.
--
-- Not yet a migration. Week 2 pulls this into Drizzle migrations against
-- a real provider (Neon or Supabase TBD). Until then this file is the
-- canonical shape review gate: schema changes go here first, then get
-- replayed as Drizzle migrations when we provision.
--
-- Conventions:
--   * snake_case table and column names
--   * timestamptz for all time columns, default now()
--   * UUIDs for public identifiers; bigserial for internal surrogate keys
--     only inside a single schema
--   * no foreign keys ACROSS schemas — crossing the compartment boundary
--     is a code smell and a review gate (see ADR 001)
--   * "subscriber_token" and "intake_id" are the only cross-compartment
--     identifiers, and they are always opaque UUIDs

-- =====================================================================
-- SCHEMAS
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS contact;
CREATE SCHEMA IF NOT EXISTS med;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- =====================================================================
-- core — public catalog, subscriptions, activations. No PII.
-- =====================================================================

CREATE TABLE core.specialties (
    id            bigserial PRIMARY KEY,
    slug          text NOT NULL UNIQUE,
    name          text NOT NULL,
    display_order int  NOT NULL DEFAULT 100
);

CREATE TABLE core.clinics (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          text        NOT NULL UNIQUE,
    name          text        NOT NULL,
    city          text        NOT NULL,
    region        text        NOT NULL,          -- state / province code
    website       text        NULL,
    year_opened   smallint    NULL,
    status        text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','paused','retired')),
    visible       boolean     NOT NULL DEFAULT false,
    tagline       text        NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE core.doctors (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id     uuid        NOT NULL REFERENCES core.clinics(id) ON DELETE CASCADE,
    slug          text        NOT NULL UNIQUE,
    display_name  text        NOT NULL,             -- "Dr. Amaya Okafor"
    credentials   text        NULL,                 -- "MD MPH"
    specialty_id  bigint      NOT NULL REFERENCES core.specialties(id),
    bio           text        NULL,
    philosophy    text        NULL,
    languages     text[]      NOT NULL DEFAULT '{}',
    panel_current int         NOT NULL DEFAULT 0,
    panel_cap     int         NULL,
    accepting     boolean     NOT NULL DEFAULT true,
    price_adult_cents   int   NULL,
    price_couple_cents  int   NULL,
    price_child_cents   int   NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON core.doctors (clinic_id);
CREATE INDEX ON core.doctors (specialty_id);

CREATE TABLE core.availability (
    id          bigserial   PRIMARY KEY,
    doctor_id   uuid        NOT NULL REFERENCES core.doctors(id) ON DELETE CASCADE,
    day_of_week smallint    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_min   smallint    NOT NULL CHECK (start_min BETWEEN 0 AND 1440),
    end_min     smallint    NOT NULL CHECK (end_min   BETWEEN 0 AND 1440),
    CHECK (end_min > start_min)
);

CREATE INDEX ON core.availability (doctor_id, day_of_week);

CREATE TABLE core.reviews (
    id          bigserial   PRIMARY KEY,
    doctor_id   uuid        NOT NULL REFERENCES core.doctors(id) ON DELETE CASCADE,
    rating      smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body        text        NULL,
    -- NOTE: no reviewer identity in core. If we ever show "by X", that
    -- display string is stored inline here (e.g., "Verified patient" or
    -- an opaque handle) — never a join back to a PII store.
    display_attribution text NOT NULL DEFAULT 'Verified patient',
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON core.reviews (doctor_id);

CREATE TABLE core.subscriptions (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id           uuid        NOT NULL REFERENCES core.doctors(id),
    -- subscriber_token is the ONLY handle app code in core has on "which
    -- real person". Dereferencing happens only inside the billing or
    -- email services, against contact.subscribers. Do not expose in UI.
    subscriber_token    uuid        NOT NULL UNIQUE,
    billing_path        text        NOT NULL DEFAULT 'rm_billed'
                                    CHECK (billing_path IN ('rm_billed','clinic_direct')),
    plan                text        NOT NULL DEFAULT 'adult',
    status              text        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('trialing','active','past_due','canceled','refunded')),
    started_at          timestamptz NOT NULL DEFAULT now(),
    canceled_at         timestamptz NULL
);

CREATE INDEX ON core.subscriptions (doctor_id);

-- Per-activation fee ledger for the clinic-direct billing path. Empty at
-- Beta launch (rm_billed only); the table ships now so the data model
-- accommodates the path from day one per PROJECT_PLAN.
CREATE TABLE core.activations (
    id              bigserial   PRIMARY KEY,
    subscription_id uuid        NOT NULL REFERENCES core.subscriptions(id) ON DELETE RESTRICT,
    fee_cents       int         NOT NULL,
    settled_at      timestamptz NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON core.activations (subscription_id);

-- =====================================================================
-- contact — email, Stripe customer, back-pointer to core.subscriptions.
-- Only the billing service and email service touch this schema.
-- =====================================================================

CREATE TABLE contact.subscribers (
    id                  bigserial   PRIMARY KEY,
    subscriber_token    uuid        NOT NULL UNIQUE,
    email               text        NOT NULL,
    stripe_customer_id  text        NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscribers_email_ci_idx
    ON contact.subscribers (lower(email));

-- Audit log — every read and write of contact.subscribers. Populated by
-- the billing / email services explicitly; no implicit trigger magic so
-- the access pattern stays visible in code review.
CREATE TABLE contact.subscriber_access_log (
    id              bigserial   PRIMARY KEY,
    subscriber_id   bigint      NULL REFERENCES contact.subscribers(id) ON DELETE SET NULL,
    actor_service   text        NOT NULL,   -- 'billing' | 'email' | 'admin'
    action          text        NOT NULL,   -- 'read' | 'write' | 'delete'
    reason          text        NULL,       -- short free-text, e.g., 'checkout.session.completed'
    request_id      text        NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON contact.subscriber_access_log (subscriber_id);
CREATE INDEX ON contact.subscriber_access_log (created_at DESC);

-- =====================================================================
-- med — onboarding intake responses. Opaque intake_id; no persisted
-- link to subscriber_token or any PII.
-- =====================================================================

CREATE TABLE med.intake_responses (
    intake_id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    zip                 text        NOT NULL,        -- may be coarsened to 3-digit later
    age_band            text        NOT NULL,        -- '18-29' | '30-44' | '45-59' | '60-74' | '75+'
    household_size      smallint    NOT NULL DEFAULT 1,
    needs               text[]      NOT NULL DEFAULT '{}',
                        -- 'primary' | 'chronic' | 'mental' | 'pediatrics'
                        -- 'womens'  | 'geriatrics' | 'sports'
    insurance_posture   text        NOT NULL,
                        -- 'keep_catastrophic' | 'employer_plan'
                        -- 'no_insurance'      | 'hsa_hdhp'
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON med.intake_responses (zip);
CREATE INDEX ON med.intake_responses (created_at DESC);

-- =====================================================================
-- ROLES (sketch — provisioned for real in Week 2)
-- =====================================================================
--
-- One service role per schema. App code running a given surface connects
-- as exactly one role; the role cannot reach the other schemas.
--
--   CREATE ROLE radmed_core LOGIN PASSWORD '...';
--   GRANT  USAGE                          ON SCHEMA core TO radmed_core;
--   GRANT  SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core
--          TO radmed_core;
--   GRANT  USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA core
--          TO radmed_core;
--   ALTER  DEFAULT PRIVILEGES IN SCHEMA core
--          GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO radmed_core;
--
-- Analogous roles: radmed_contact, radmed_med.
--
-- Bridging services run under their own roles with the minimum rights
-- they need:
--
--   radmed_billing   — SELECT, INSERT, UPDATE on contact.*;
--                      SELECT, UPDATE on core.subscriptions;
--                      SELECT on core.doctors, core.clinics.
--   radmed_email     — SELECT on contact.subscribers;
--                      INSERT on contact.subscriber_access_log.
--   radmed_matching  — SELECT on med.intake_responses;
--                      INSERT on core.subscriptions (subscriber_token only).
--                      No access to contact. Short-lived connections.
--
-- radmed_admin — allowlist-gated /admin route. Read-only across all three
-- schemas; every contact read is logged to contact.subscriber_access_log.
