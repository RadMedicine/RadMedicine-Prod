"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";
import { db as contactDb } from "@/src/lib/db/contact";
import * as contact from "@/src/lib/db/schema/contact";
import {
  isColoradoZip,
  submitIntakeAndMatch,
  type IntakeInput,
  type MatchResult,
} from "@/src/lib/matching/service";
import { sendEmail } from "@/src/lib/email/postmark";

/**
 * Server actions for the patient onboarding flow.
 *
 * Steps 2-4 collect intake → we persist to med and return matches.
 * Step 6 takes email + payment, writes contact.subscribers and
 * core.subscriptions. Both schemas are written from here because this
 * action is the narrow subscription-creation bridge (analogous to the
 * matching service for intake). No cross-schema joins happen in SQL;
 * the linking token is generated here in TS.
 *
 * Non-CO ZIPs never reach submitIntakeAction — the client-side gate
 * short-circuits to submitWaitlistAction at step 2.
 */

export async function submitIntakeAction(input: IntakeInput): Promise<MatchResult> {
  if (!isColoradoZip(input.zip)) {
    throw new Error("Non-Colorado ZIP — use the waitlist flow");
  }
  return submitIntakeAndMatch(input);
}

export async function submitWaitlistAction({ email, zip }: { email: string; zip: string }): Promise<{ ok: true }> {
  if (!email) throw new Error("email required");
  const z = (zip ?? "").trim();

  // Persist (email is PII → contact schema).
  await contactDb
    .insert(contact.waitlistSignups)
    .values({ email, zip: z, source: "onboarding_step2" })
    .onConflictDoNothing({ target: contact.waitlistSignups.email });

  // Stubbed confirmation email — Postmark dispatch happens when the key
  // is set. Templates.ts grows out a full set of transactional
  // templates in W3.5; for now, the waitlist copy lives inline.
  await sendEmail({
    to: email,
    subject: "You're on the RadMedicine waitlist",
    htmlBody: `<p>Thanks for joining the waitlist. RadMedicine launched in Colorado first. When we open to ${z || "your ZIP"}, you'll be one of the first to know.</p>`,
    textBody:
      `Thanks for joining the waitlist. RadMedicine launched in Colorado first. ` +
      `When we open to ${z || "your ZIP"}, you'll be one of the first to know.`,
    tag: "waitlist-confirm",
  });

  return { ok: true };
}

/**
 * Create a subscription — step 6 of onboarding. Generates a fresh
 * subscriber_token, writes it to core.subscriptions (with doctor_id
 * and plan) and to contact.subscribers (with email and token). The
 * intake_id ↔ subscriber_token link is intentionally NOT persisted
 * here; the match was returned to the client at step 5 and we only
 * need the chosen doctor_slug to create the subscription.
 *
 * Stripe dispatch is stubbed for Beta: Week 4 wires Stripe Checkout
 * + Customer Portal. For now the subscription record gets status
 * 'trialing' so admin can see it.
 */
export async function createSubscriptionAction({
  doctorSlug,
  email,
  plan = "adult",
}: {
  doctorSlug: string;
  email: string;
  plan?: string;
}): Promise<{ ok: true; subscriberToken: string }> {
  const [doctor] = await coreDb
    .select({ id: core.doctors.id, displayName: core.doctors.displayName })
    .from(core.doctors)
    .where(eq(core.doctors.slug, doctorSlug))
    .limit(1);
  if (!doctor) throw new Error(`doctor not found: ${doctorSlug}`);

  const subscriberToken = randomUUID();

  await coreDb.insert(core.subscriptions).values({
    doctorId: doctor.id,
    subscriberToken,
    plan,
    status: "trialing",
  });

  await contactDb.insert(contact.subscribers).values({
    subscriberToken,
    email,
  });

  // Welcome email stub (full templates in W3.5).
  await sendEmail({
    to: email,
    subject: `Welcome to RadMedicine — your membership with ${doctor.displayName}`,
    htmlBody: `<p>You're subscribed. ${doctor.displayName} will reach out within 24 hours to schedule your first visit.</p>`,
    textBody: `You're subscribed. ${doctor.displayName} will reach out within 24 hours to schedule your first visit.`,
    tag: "welcome",
  });

  return { ok: true, subscriberToken };
}
