import "server-only";
import { eq } from "drizzle-orm";
import { db as coreDb } from "./db/core";
import * as core from "./db/schema/core";
import { auth } from "./auth";

/**
 * Resolve the list of clinics the currently-signed-in user can edit.
 * Returns [] if not signed in or not linked via core.clinic_users.
 * Callers redirect to /sign-in or show "no access" as appropriate —
 * middleware.ts already ensures there's at least a session.
 */
export async function getEditableClinicsForCurrentUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { session, clinics: [] as ClinicSummary[] };

  const rows = await coreDb
    .select({
      clinicId: core.clinics.id,
      slug: core.clinics.slug,
      name: core.clinics.name,
      city: core.clinics.city,
      region: core.clinics.region,
      status: core.clinics.status,
      visible: core.clinics.visible,
      role: core.clinicUsers.role,
    })
    .from(core.clinicUsers)
    .innerJoin(core.users, eq(core.users.id, core.clinicUsers.userId))
    .innerJoin(core.clinics, eq(core.clinics.id, core.clinicUsers.clinicId))
    .where(eq(core.users.email, email));

  return { session, clinics: rows as ClinicSummary[] };
}

/**
 * Verify the signed-in user owns/edits the clinic with this slug.
 * Throws if not. Used at the top of /clinic/dashboard/[slug] routes.
 */
export async function requireClinicAccess(slug: string) {
  const { session, clinics } = await getEditableClinicsForCurrentUser();
  const match = clinics.find((c) => c.slug === slug);
  if (!match) {
    // Surface a plain 404-ish error. Middleware already enforced auth,
    // so reaching here means signed-in-but-not-authorized for this slug.
    throw new Error(`Not authorized to edit clinic "${slug}"`);
  }
  return { session, clinic: match };
}

export type ClinicSummary = {
  clinicId: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  status: "pending" | "approved" | "paused" | "retired";
  visible: boolean;
  role: "owner" | "editor";
};
