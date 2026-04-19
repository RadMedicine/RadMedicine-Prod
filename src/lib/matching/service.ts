import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db as coreDb } from "../db/core";
import * as core from "../db/schema/core";
import { db as medDb } from "../db/med";
import * as med from "../db/schema/med";

/**
 * Matching service — the NARROW bridge between med and core per ADR 001.
 *
 * Patient intake writes land in `med.intake_responses` (opaque intake_id
 * PK). The matching logic reads intake_responses, computes candidate
 * doctors from `core`, and returns the match result to the caller. The
 * `intake_id` ↔ `subscriber_token` link is NEVER persisted — it exists
 * only within the request that calls `submitIntakeAndMatch`.
 *
 * This file is the ONLY module in the app code that imports from both
 * `./db/med` and `./db/core`. If another module starts doing this, stop
 * and check whether it should.
 */

export type IntakeInput = {
  zip: string;
  ageBand: "18-29" | "30-44" | "45-59" | "60-74" | "75+";
  householdSize: number;
  needs: NeedKey[];
  insurancePosture: "keep_catastrophic" | "employer_plan" | "no_insurance" | "hsa_hdhp";
};

export type NeedKey = "primary" | "chronic" | "mental" | "pediatrics" | "womens" | "geriatrics" | "sports";

export type MatchResult = {
  intakeId: string;
  matches: MatchedDoctor[];
};

export type MatchedDoctor = {
  doctorSlug: string;
  displayName: string;
  credentials: string | null;
  specialtyName: string | null;
  clinicName: string;
  city: string;
  region: string;
  priceAdultCents: number | null;
  philosophy: string | null;
  matchScore: number; // 0-100, purely heuristic for Beta
  matchReason: string;
};

/**
 * Write intake to med; compute matches from core based on specialty
 * needs. Returns the intake_id so the UI can display it (non-sensitive)
 * and the top 3 candidate doctors.
 */
export async function submitIntakeAndMatch(intake: IntakeInput): Promise<MatchResult> {
  const [row] = await medDb
    .insert(med.intakeResponses)
    .values({
      zip: intake.zip,
      ageBand: intake.ageBand,
      householdSize: intake.householdSize,
      needs: intake.needs,
      insurancePosture: intake.insurancePosture,
    })
    .returning({ intakeId: med.intakeResponses.intakeId });

  if (!row) throw new Error("matching: failed to persist intake");

  // Needs → specialty slug mapping. For Beta: simple direct map; future
  // passes can score needs against specialties, clinic philosophies, etc.
  const needsToSpecialtySlugs: Record<NeedKey, string[]> = {
    primary: ["family-medicine", "internal-medicine"],
    chronic: ["internal-medicine", "family-medicine"],
    mental: ["family-medicine"], // placeholder — no mental-health specialty seeded
    pediatrics: ["pediatrics"],
    womens: ["womens-health"],
    geriatrics: ["geriatrics"],
    sports: ["sports-medicine"],
  };
  const targetSlugSet = new Set<string>();
  for (const n of intake.needs) {
    for (const s of needsToSpecialtySlugs[n] ?? []) targetSlugSet.add(s);
  }
  const targetSlugs = Array.from(targetSlugSet);

  const baseConditions = [eq(core.doctors.accepting, true), eq(core.clinics.visible, true), eq(core.clinics.status, "approved")];

  const specialtyMatches =
    targetSlugs.length > 0
      ? await coreDb
          .select({
            doctorSlug: core.doctors.slug,
            displayName: core.doctors.displayName,
            credentials: core.doctors.credentials,
            philosophy: core.doctors.philosophy,
            priceAdultCents: core.doctors.priceAdultCents,
            specialtyName: core.specialties.name,
            specialtySlug: core.specialties.slug,
            clinicName: core.clinics.name,
            city: core.clinics.city,
            region: core.clinics.region,
          })
          .from(core.doctors)
          .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
          .innerJoin(core.specialties, eq(core.specialties.id, core.doctors.specialtyId))
          .where(and(...baseConditions, inArray(core.specialties.slug, targetSlugs)))
          .limit(5)
      : [];

  // If specialty-matched too few, fall back to accepting doctors in CO.
  const fallbackIfNeeded = specialtyMatches.length >= 3
    ? []
    : await coreDb
        .select({
          doctorSlug: core.doctors.slug,
          displayName: core.doctors.displayName,
          credentials: core.doctors.credentials,
          philosophy: core.doctors.philosophy,
          priceAdultCents: core.doctors.priceAdultCents,
          specialtyName: core.specialties.name,
          specialtySlug: core.specialties.slug,
          clinicName: core.clinics.name,
          city: core.clinics.city,
          region: core.clinics.region,
        })
        .from(core.doctors)
        .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
        .leftJoin(core.specialties, eq(core.specialties.id, core.doctors.specialtyId))
        .where(and(...baseConditions))
        .limit(6);

  const merged = [...specialtyMatches, ...fallbackIfNeeded];
  const seen = new Set<string>();
  const top: MatchedDoctor[] = [];
  for (const c of merged) {
    if (seen.has(c.doctorSlug)) continue;
    seen.add(c.doctorSlug);

    const specialtyMatched = c.specialtySlug ? targetSlugSet.has(c.specialtySlug) : false;
    const matchScore = specialtyMatched ? 92 - top.length * 4 : 74 - top.length * 5;
    const matchReason = specialtyMatched
      ? `Matches your primary need (${c.specialtyName})`
      : `Colorado DPC clinic accepting patients`;

    top.push({
      doctorSlug: c.doctorSlug,
      displayName: c.displayName,
      credentials: c.credentials,
      specialtyName: c.specialtyName,
      clinicName: c.clinicName,
      city: c.city,
      region: c.region,
      priceAdultCents: c.priceAdultCents,
      philosophy: c.philosophy,
      matchScore,
      matchReason,
    });
    if (top.length >= 3) break;
  }

  return { intakeId: row.intakeId, matches: top };
}

/**
 * Colorado ZIP geofence. Beta is CO-only; non-CO ZIPs branch to the
 * waitlist at onboarding step 2.
 *
 * CO ZIPs: 80000-81699. Source: USPS. A couple of gaps inside that
 * range are held by other states' sliver postal routes; for Beta we
 * accept the tiny false-positive rate and gate on the numeric bounds.
 */
export function isColoradoZip(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!/^\d{5}$/.test(trimmed)) return false;
  const n = Number.parseInt(trimmed, 10);
  return n >= 80000 && n <= 81699;
}
