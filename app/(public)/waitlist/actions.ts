"use server";

import { db as contactDb } from "@/src/lib/db/contact";
import * as contact from "@/src/lib/db/schema/contact";
import { sendWaitlistConfirm } from "@/src/lib/email/transactional";

/**
 * Waitlist server action. Called from two places:
 *   /onboarding step 2 non-CO branch     (source: "onboarding_step2")
 *   /waitlist direct-entry form           (source: "waitlist_direct")
 *
 * Writes to contact.waitlist_signups (email is PII, hence `contact`
 * schema per ADR 001) and fires the waitlist confirmation via the
 * Postmark stub.
 */

export type WaitlistSource = "onboarding_step2" | "waitlist_direct";

export async function submitWaitlistAction({
  email,
  zip,
  source = "onboarding_step2",
}: {
  email: string;
  zip: string;
  source?: WaitlistSource;
}): Promise<{ ok: true }> {
  const trimmedEmail = (email ?? "").trim();
  if (!trimmedEmail) throw new Error("email required");
  const z = (zip ?? "").trim();

  await contactDb
    .insert(contact.waitlistSignups)
    .values({ email: trimmedEmail, zip: z, source })
    .onConflictDoNothing({ target: contact.waitlistSignups.email });

  await sendWaitlistConfirm(trimmedEmail, { zip: z });
  return { ok: true };
}
