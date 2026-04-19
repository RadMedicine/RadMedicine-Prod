import "server-only";
import { eq } from "drizzle-orm";
import { db as coreDb } from "./db/core";
import * as core from "./db/schema/core";

/**
 * Thin data helpers shared by the /clinic/dashboard editing pages.
 * Beta assumption: one primary doctor per clinic. When clinics grow
 * beyond that, these helpers add a doctor picker step.
 */

export async function getPrimaryDoctor(clinicId: string) {
  const [doctor] = await coreDb.select().from(core.doctors).where(eq(core.doctors.clinicId, clinicId)).limit(1);
  return doctor ?? null;
}

export async function getClinicBySlug(slug: string) {
  const [clinic] = await coreDb.select().from(core.clinics).where(eq(core.clinics.slug, slug)).limit(1);
  return clinic ?? null;
}

export async function getAvailabilityForDoctor(doctorId: string) {
  const rows = await coreDb
    .select()
    .from(core.availability)
    .where(eq(core.availability.doctorId, doctorId))
    .orderBy(core.availability.dayOfWeek, core.availability.startMin);
  return rows;
}

export async function getSpecialties() {
  return coreDb.select().from(core.specialties).orderBy(core.specialties.displayOrder);
}

export async function getDoctorWithSpecialty(clinicId: string) {
  const [row] = await coreDb
    .select({
      doctor: core.doctors,
      specialty: core.specialties,
    })
    .from(core.doctors)
    .leftJoin(core.specialties, eq(core.doctors.specialtyId, core.specialties.id))
    .where(eq(core.doctors.clinicId, clinicId))
    .limit(1);
  return row ?? null;
}

/** Replace the doctor's entire availability schedule atomically. */
export async function replaceAvailability(
  doctorId: string,
  rows: Array<{ dayOfWeek: number; startMin: number; endMin: number }>,
) {
  await coreDb.transaction(async (tx) => {
    await tx.delete(core.availability).where(eq(core.availability.doctorId, doctorId));
    if (rows.length > 0) {
      await tx.insert(core.availability).values(
        rows.map((r) => ({
          doctorId,
          dayOfWeek: r.dayOfWeek,
          startMin: r.startMin,
          endMin: r.endMin,
        })),
      );
    }
  });
}

export function centsFromDollarsInput(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const dollars = Number.parseFloat(cleaned);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * 100);
}

export function dollarsFromCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function minutesFromTime(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 24 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function timeFromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

