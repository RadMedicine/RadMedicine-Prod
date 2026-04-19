"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";
import { auth, isAdminEmail } from "@/src/lib/auth";

/**
 * Admin server actions — currently wired:
 *   approveClinic               status -> 'approved' + visible = true
 *   toggleClinicVisibility      visible flip
 *
 * Still stubbed (no Stripe yet, per session scope):
 *   resendWelcomeEmail  — needs reliable subscriber email + email client
 *   issueRefund         — needs Stripe
 *   cancelSubscription  — needs Stripe (and then fires
 *                         subscriptionCancelled email)
 *
 * Middleware.ts has already gated /admin by the allowlist, but every
 * mutating action here re-checks the session server-side so a stray
 * fetch can't punch through.
 */

async function assertAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) {
    throw new Error("Not authorized");
  }
  return email as string;
}

export async function approveClinicAction({ clinicId }: { clinicId: string }): Promise<{ ok: true }> {
  await assertAdmin();
  await coreDb
    .update(core.clinics)
    .set({ status: "approved", visible: true, updatedAt: new Date() })
    .where(eq(core.clinics.id, clinicId));
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/search");
  return { ok: true };
}

export async function toggleClinicVisibilityAction({
  clinicId,
  nextVisible,
}: {
  clinicId: string;
  nextVisible: boolean;
}): Promise<{ ok: true }> {
  await assertAdmin();
  await coreDb
    .update(core.clinics)
    .set({ visible: nextVisible, updatedAt: new Date() })
    .where(eq(core.clinics.id, clinicId));
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/search");
  return { ok: true };
}
