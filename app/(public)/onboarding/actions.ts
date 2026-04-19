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
import {
  sendClinicNewPatientNotify,
  sendOnboardingConfirm,
  sendWaitlistConfirm,
  sendWelcome,
} from "@/src/lib/email/transactional";

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

  await sendWaitlistConfirm(email, { zip: z });
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
  const [row] = await coreDb
    .select({
      doctorId: core.doctors.id,
      doctorName: core.doctors.displayName,
      clinicId: core.clinics.id,
      clinicName: core.clinics.name,
      city: core.clinics.city,
    })
    .from(core.doctors)
    .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
    .where(eq(core.doctors.slug, doctorSlug))
    .limit(1);
  if (!row) throw new Error(`doctor not found: ${doctorSlug}`);

  const subscriberToken = randomUUID();

  await coreDb.insert(core.subscriptions).values({
    doctorId: row.doctorId,
    subscriberToken,
    plan,
    status: "trialing",
  });

  await contactDb.insert(contact.subscribers).values({
    subscriberToken,
    email,
  });

  // Onboarding confirmation (to the patient) + welcome (also to the
  // patient) + clinic notification (to the clinic owner, if we have one
  // via core.clinic_users). Best-effort: failures are logged but don't
  // roll back the subscription.
  const ack = sendOnboardingConfirm(email, {
    doctorName: row.doctorName,
    clinicName: row.clinicName,
    city: row.city,
  });
  const welcome = sendWelcome(email, {
    doctorName: row.doctorName,
    clinicName: row.clinicName,
    city: row.city,
  });
  const notifyOwner = notifyClinicOfNewPatient({
    clinicId: row.clinicId,
    clinicName: row.clinicName,
    doctorName: row.doctorName,
    patientEmail: email,
  });
  await Promise.all([ack, welcome, notifyOwner]);

  return { ok: true, subscriberToken };
}

async function notifyClinicOfNewPatient({
  clinicId,
  clinicName,
  doctorName,
  patientEmail,
}: {
  clinicId: string;
  clinicName: string;
  doctorName: string;
  patientEmail: string;
}) {
  const owners = await coreDb
    .select({ email: core.users.email })
    .from(core.clinicUsers)
    .innerJoin(core.users, eq(core.users.id, core.clinicUsers.userId))
    .where(eq(core.clinicUsers.clinicId, clinicId));

  if (owners.length === 0) return;
  await Promise.all(
    owners.map((o) =>
      sendClinicNewPatientNotify(o.email, {
        patientEmail,
        clinicName,
        doctorName,
      }),
    ),
  );
}
