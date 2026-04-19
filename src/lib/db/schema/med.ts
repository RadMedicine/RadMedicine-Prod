import { pgSchema, uuid, text, smallint, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * `med` — onboarding intake responses. Keyed by opaque intake_id with no
 * persisted link to subscriber_token or any PII. The matching service
 * consumes an intake, emits a subscriber_token into core.subscriptions,
 * and drops the intake_id ↔ subscriber_token mapping on request exit.
 * See ADR 001.
 */
export const medSchema = pgSchema("med");

export const intakeResponses = medSchema.table(
  "intake_responses",
  {
    intakeId: uuid("intake_id").primaryKey().default(sql`gen_random_uuid()`),
    zip: text("zip").notNull(), // may be coarsened to 3-digit later
    ageBand: text("age_band").notNull(), // '18-29' | '30-44' | '45-59' | '60-74' | '75+'
    householdSize: smallint("household_size").notNull().default(1),
    // 'primary' | 'chronic' | 'mental' | 'pediatrics' | 'womens' | 'geriatrics' | 'sports'
    needs: text("needs").array().notNull().default(sql`'{}'::text[]`),
    // 'keep_catastrophic' | 'employer_plan' | 'no_insurance' | 'hsa_hdhp'
    insurancePosture: text("insurance_posture").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    zipIdx: index("intake_responses_zip_idx").on(t.zip),
    createdIdx: index("intake_responses_created_idx").on(t.createdAt),
  }),
);
