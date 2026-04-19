import { pgSchema, bigserial, bigint, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * `contact` — email, Stripe customer, back-pointer to core.subscriptions.
 * Only the billing service and email service touch this schema. App code
 * rendering UI for `core` data MUST NOT have a connection that can read
 * this schema. See ADR 001.
 */
export const contactSchema = pgSchema("contact");

export const subscribers = contactSchema.table(
  "subscribers",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    subscriberToken: uuid("subscriber_token").notNull().unique(),
    email: text("email").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailCiUnique: uniqueIndex("subscribers_email_ci_uq").on(sql`lower(${t.email})`),
  }),
);

/**
 * Explicit audit log — every read and write of subscribers is recorded by
 * the billing/email services. No implicit trigger magic, so the access
 * pattern stays visible in code review.
 */
export const subscriberAccessLog = contactSchema.table(
  "subscriber_access_log",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    subscriberId: bigint("subscriber_id", { mode: "bigint" }).references(() => subscribers.id, {
      onDelete: "set null",
    }),
    actorService: text("actor_service").notNull(), // 'billing' | 'email' | 'admin'
    action: text("action").notNull(), // 'read' | 'write' | 'delete'
    reason: text("reason"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subscriberIdx: index("subscriber_access_log_subscriber_idx").on(t.subscriberId),
    createdAtIdx: index("subscriber_access_log_created_idx").on(t.createdAt),
  }),
);

/**
 * waitlist_signups — non-Colorado visitors captured at patient onboarding
 * step 2. Email lives here (contact schema) because it's PII; ZIP is the
 * only non-contact field we keep, for future "we launched in your state"
 * outreach.
 */
export const waitlistSignups = contactSchema.table(
  "waitlist_signups",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    email: text("email").notNull(),
    zip: text("zip").notNull(),
    source: text("source").notNull().default("onboarding_step2"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailCiUnique: uniqueIndex("waitlist_email_ci_uq").on(sql`lower(${t.email})`),
  }),
);
