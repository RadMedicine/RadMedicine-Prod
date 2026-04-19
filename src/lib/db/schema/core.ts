import { pgSchema, bigserial, bigint, uuid, text, smallint, integer, boolean, timestamp, primaryKey, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * `core` — public catalog, subscriptions, activations, operator auth.
 * No PATIENT PII. Operator email (for clinic-dashboard / admin login) lives
 * here by design: it is operational data, never joined to med intake.
 * Patient PII lives in the `contact` schema per ADR 001.
 */
export const coreSchema = pgSchema("core");

export const specialties = coreSchema.table("specialties", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(100),
});

export const clinics = coreSchema.table(
  "clinics",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    region: text("region").notNull(), // state/province code
    website: text("website"),
    yearOpened: smallint("year_opened"),
    status: text("status").notNull().default("pending"),
    visible: boolean("visible").notNull().default(false),
    tagline: text("tagline"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusCheck: check("clinics_status_chk", sql`${t.status} IN ('pending','approved','paused','retired')`),
  }),
);

export const doctors = coreSchema.table(
  "doctors",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    credentials: text("credentials"),
    specialtyId: bigint("specialty_id", { mode: "bigint" })
      .notNull()
      .references(() => specialties.id),
    bio: text("bio"),
    philosophy: text("philosophy"),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    panelCurrent: integer("panel_current").notNull().default(0),
    panelCap: integer("panel_cap"),
    accepting: boolean("accepting").notNull().default(true),
    priceAdultCents: integer("price_adult_cents"),
    priceCoupleCents: integer("price_couple_cents"),
    priceChildCents: integer("price_child_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clinicIdx: index("doctors_clinic_idx").on(t.clinicId),
    specialtyIdx: index("doctors_specialty_idx").on(t.specialtyId),
  }),
);

export const availability = coreSchema.table(
  "availability",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(),
    startMin: smallint("start_min").notNull(),
    endMin: smallint("end_min").notNull(),
  },
  (t) => ({
    doctorDayIdx: index("availability_doctor_day_idx").on(t.doctorId, t.dayOfWeek),
    dayRangeCheck: check("availability_dow_chk", sql`${t.dayOfWeek} BETWEEN 0 AND 6`),
    minRangeCheck: check("availability_minutes_chk", sql`${t.startMin} BETWEEN 0 AND 1440 AND ${t.endMin} BETWEEN 0 AND 1440 AND ${t.endMin} > ${t.startMin}`),
  }),
);

export const reviews = coreSchema.table(
  "reviews",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    body: text("body"),
    // No reviewer identity in core. Display attribution is stored inline
    // (e.g., "Verified patient") — never joined to a PII store.
    displayAttribution: text("display_attribution").notNull().default("Verified patient"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    doctorIdx: index("reviews_doctor_idx").on(t.doctorId),
    ratingCheck: check("reviews_rating_chk", sql`${t.rating} BETWEEN 1 AND 5`),
  }),
);

export const subscriptions = coreSchema.table(
  "subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id),
    // Opaque handle — app code in core never dereferences this to an email.
    // Only the billing service (via contact.subscribers) can.
    subscriberToken: uuid("subscriber_token").notNull().unique(),
    billingPath: text("billing_path").notNull().default("rm_billed"),
    plan: text("plan").notNull().default("adult"),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (t) => ({
    doctorIdx: index("subscriptions_doctor_idx").on(t.doctorId),
    billingPathCheck: check("subscriptions_billing_path_chk", sql`${t.billingPath} IN ('rm_billed','clinic_direct')`),
    statusCheck: check("subscriptions_status_chk", sql`${t.status} IN ('trialing','active','past_due','canceled','refunded')`),
  }),
);

// Per-activation ledger for the clinic-direct path. Empty at Beta launch.
export const activations = coreSchema.table(
  "activations",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "restrict" }),
    feeCents: integer("fee_cents").notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subscriptionIdx: index("activations_subscription_idx").on(t.subscriptionId),
  }),
);

/**
 * NextAuth tables (Drizzle adapter shape — @auth/drizzle-adapter).
 * These tables store operator/admin identity (email, session tokens) — they
 * are operational, not patient PII, so they live in `core`.
 */
export const users = coreSchema.table("user", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
});

export const accounts = coreSchema.table(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = coreSchema.table("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = coreSchema.table(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

/**
 * clinic_users — operator email → clinic_id mapping. A signed-in operator
 * can edit the clinic(s) listed here. Seeded for Beta; self-service
 * onboarding wires this in a later pass.
 */
export const clinicUsers = coreSchema.table(
  "clinic_users",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userClinicUnique: uniqueIndex("clinic_users_user_clinic_uq").on(t.userId, t.clinicId),
    roleCheck: check("clinic_users_role_chk", sql`${t.role} IN ('owner','editor')`),
  }),
);
